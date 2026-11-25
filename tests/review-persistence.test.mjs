import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
    REVIEW_STORAGE_KEY,
    REVIEW_STORAGE_VERSION,
    loadReviewState,
    normalizePersistedReviews,
    prototypeReviews,
    saveReviewState,
    useReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog } from '../src/data/games.ts'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))
const STARDEW = 413150
const FIREWATCH = 383870

const localReview = (overrides = {}) => ({
    id: 'local-you-stardew',
    gameId: STARDEW,
    personId: 'you',
    overall: 8,
    categories: { Gameplay: 8 },
    text: 'A quiet evening on the farm.',
    createdAt: '2026-11-20T12:00:00.000Z',
    source: 'local',
    ...overrides,
})

function installWindow(items = {}) {
    const previous = globalThis.window
    const store = new Map(Object.entries(items))
    globalThis.window = {
        localStorage: {
            getItem(key) {
                return store.has(key) ? store.get(key) : null
            },
            setItem(key, value) {
                store.set(key, String(value))
            },
            removeItem(key) {
                store.delete(key)
            },
            clear() {
                store.clear()
            },
        },
    }
    return {
        store,
        restore() {
            if (previous === undefined) delete globalThis.window
            else globalThis.window = previous
        },
    }
}

test('persisted reviews ignore malformed, invalid, prototype, and duplicate records', () => {
    const older = localReview()
    const newer = localReview({
        overall: 9,
        text: 'The revised notes from this farm.',
        updatedAt: '2026-11-22T12:00:00.000Z',
    })
    const invalid = localReview({ id: 'invalid-score', overall: 11 })
    const malformed = localReview({ id: 'malformed-score', overall: '8' })
    const unknownGame = localReview({ id: 'unknown-game', gameId: 999999 })
    const invalidText = localReview({ id: 'empty-text', text: '   ' })

    const result = normalizePersistedReviews(
        { reviews: [older, invalid, malformed, unknownGame, invalidText, prototypeReviews[0], newer] },
        { games: gameCatalog, savedIds: [STARDEW] },
    )

    assert.equal(result.reviews.length, 1)
    assert.equal(result.reviews[0].id, newer.id)
    assert.equal(result.reviews[0].overall, 9)
    assert.equal(result.reviews[0].text, newer.text)
    assert.equal(result.ignored.length, 6)
})

test('duplicate review IDs cannot create two active records', () => {
    const first = localReview({ gameId: STARDEW })
    const sameId = localReview({
        gameId: FIREWATCH,
        text: 'A different game with the same ID.',
        updatedAt: '2026-11-23T12:00:00.000Z',
    })

    const result = normalizePersistedReviews([first, sameId], {
        games: gameCatalog,
        savedIds: [STARDEW],
    })

    assert.deepEqual(result.reviews.map((review) => review.id), [first.id])
    assert.equal(result.reviews[0].gameId, FIREWATCH)
    assert.deepEqual(result.ignored, [first])
})

test('review persistence writes only the dedicated versioned key', () => {
    const harness = installWindow({
        'playscape-social-v1': 'SOCIAL-UNTOUCHED',
        'playscape-compare-v1': 'COMPARE-UNTOUCHED',
    })
    try {
        const valid = localReview()
        const saved = saveReviewState([valid, prototypeReviews[0]], {
            games: gameCatalog,
            savedIds: [STARDEW],
        })

        assert.equal(saved, true)
        const record = JSON.parse(harness.store.get(REVIEW_STORAGE_KEY))
        assert.equal(record.version, REVIEW_STORAGE_VERSION)
        assert.deepEqual(record.state.reviews, [valid])
        assert.equal(harness.store.get('playscape-social-v1'), 'SOCIAL-UNTOUCHED')
        assert.equal(harness.store.get('playscape-compare-v1'), 'COMPARE-UNTOUCHED')

        const loaded = loadReviewState({ games: gameCatalog, savedIds: [STARDEW] })
        assert.deepEqual(loaded.reviews, [valid])
        assert.equal(loaded.canPersist, true)
        assert.equal(loaded.valid, true)
        assert.equal(loaded.exists, true)
    } finally {
        harness.restore()
    }
})

test('future review versions are ignored and never overwritten', () => {
    const valid = localReview()
    const future = JSON.stringify({ version: REVIEW_STORAGE_VERSION + 1, state: { reviews: [valid] } })
    const harness = installWindow({ [REVIEW_STORAGE_KEY]: future })
    try {
        const loaded = loadReviewState({ games: gameCatalog, savedIds: [STARDEW] })
        assert.deepEqual(loaded.reviews, [])
        assert.deepEqual(loaded.ignored, [valid])
        assert.equal(loaded.canPersist, false)
        assert.equal(loaded.valid, false)
        assert.equal(loaded.version, REVIEW_STORAGE_VERSION + 1)
        assert.equal(saveReviewState([valid], { games: gameCatalog, savedIds: [STARDEW] }), false)
        assert.equal(harness.store.get(REVIEW_STORAGE_KEY), future)
    } finally {
        harness.restore()
    }
})

test('useReviews hydrates only locally authored reviews from its own key', () => {
    const valid = localReview()
    const harness = installWindow({
        [REVIEW_STORAGE_KEY]: JSON.stringify({
            version: REVIEW_STORAGE_VERSION,
            state: { reviews: [valid, prototypeReviews[0]] },
        }),
    })
    try {
        function Probe() {
            const state = useReviews({ games: gameCatalog, savedIds: [STARDEW] })
            return React.createElement(
                'div',
                null,
                state.localReviews.map((review) =>
                    React.createElement('span', { key: review.id }, review.id),
                ),
            )
        }

        const html = renderToStaticMarkup(React.createElement(Probe))
        assert.match(html, /local-you-stardew/)
        assert.doesNotMatch(html, /sample-alex-stardew/)
    } finally {
        harness.restore()
    }
})

test('review feature modules use the shared storage owner', () => {
    const source = readFileSync(path.join(srcRoot, 'features/reviews/storage.ts'), 'utf8')
    assert.match(source, /readVersionedRecord/)
    assert.match(source, /writeVersionedRecord/)
    assert.doesNotMatch(source, /localStorage\.(setItem|getItem|removeItem)/)
    assert.doesNotMatch(source, /playscape-(social|compare|community)/)
})
