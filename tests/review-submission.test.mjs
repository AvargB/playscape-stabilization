import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import GameDetails from '../src/features/game-details/index.tsx'
import {
    REVIEW_CATEGORIES,
    createReviewRecord,
    prototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog } from '../src/data/games.ts'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))
const STARDEW = 413150
const NOITA = 504230

function renderDetails({ detail = STARDEW, saved = [], reviews = prototypeReviews } = {}) {
    return renderToStaticMarkup(
        React.createElement(GameDetails, {
            games: gameCatalog,
            saved,
            toggle() {},
            openGame() {},
            go() {},
            setDialog() {},
            activity: [],
            compareIds: [],
            toggleCompare() {},
            detail,
            setDetail() {},
            reviews,
            onSubmitReview() {
                return { ok: false, errors: [] }
            },
        }),
    )
}

test('game details expose an eligible review form with all six category inputs', () => {
    const html = renderDetails({ saved: [STARDEW], reviews: [] })
    assert.match(html, /rvw-panel/)
    assert.match(html, /Write a review/)
    assert.match(html, /aria-label="Overall rating"/)
    assert.match(html, /aria-label="Your review text"/)
    assert.match(html, /Publish review/)
    assert.match(html, /Only someone who owns or wishlists/)

    for (const category of REVIEW_CATEGORIES) {
        assert.match(html, new RegExp(`aria-label="${category} rating"`))
    }
})

test('ineligible games show an honest review availability message', () => {
    const html = renderDetails({ detail: NOITA, saved: [], reviews: [] })
    assert.match(html, /Save this game to your wishlist before reviewing it\./)
    assert.doesNotMatch(html, /Publish review/)
    assert.doesNotMatch(html, /aria-label="Overall rating"/)
})

test('an existing review from you opens the revision form with its values', () => {
    const created = createReviewRecord('local-you-stardew', {
        gameId: STARDEW,
        personId: 'you',
        overall: 7,
        categories: { Story: 8 },
        text: 'My own notes from this farm.',
    }, { now: '2026-11-24T12:00:00.000Z' })
    assert.equal(created.ok, true)

    const html = renderDetails({ saved: [STARDEW], reviews: [created.review] })
    assert.match(html, /Revise your review/)
    assert.match(html, /Save revision/)
    assert.match(html, /Your overall: 7\/10/)
    assert.match(html, /value="7"/)
    assert.match(html, /My own notes from this farm\./)
})

test('review submission keeps browser storage out of feature modules', () => {
    const files = [
        'features/reviews/model.ts',
        'features/reviews/useReviews.ts',
        'features/reviews/ReviewForm.tsx',
        'features/game-details/index.tsx',
    ]
    for (const file of files) {
        const source = readFileSync(path.join(srcRoot, file), 'utf8')
        assert.doesNotMatch(source, /localStorage|saveSocialState|playscape-social-v1/)
    }

    const main = readFileSync(path.join(srcRoot, 'main.tsx'), 'utf8')
    assert.match(main, /features\/reviews\/reviews\.css/)
})
