import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import ComparePage from '../src/features/compare/ComparePage.tsx'
import { buildComparisonReviewRows } from '../src/features/compare/utils.ts'
import { prototypeReviews } from '../src/features/reviews/index.ts'
import { gameCatalog, getGamesByIds } from '../src/data/games.ts'

const STARDEW = 413150
const FROSTPUNK = 323190
const HADES = 1145360

test('comparison review rows use authored reviews and admit missing data', () => {
    const games = getGamesByIds([STARDEW, FROSTPUNK], gameCatalog)
    const rows = buildComparisonReviewRows(games, prototypeReviews)

    assert.deepEqual(rows.map((row) => row.id), [
        'communityReviewCount',
        'communityReviewOverall',
        'friendReviewCount',
    ])
    assert.deepEqual(rows[0].values, ['2 reviews', '1 review'])
    assert.deepEqual(rows[1].values, ['8.5/10 · 2 reviews', '8.0/10 · 1 review'])
    assert.deepEqual(rows[2].values, ['2 friend reviews', '1 friend review'])
    assert.match(rows[1].description, /never computed from category ratings/)
    assert.ok(rows.every((row) => row.status === 'different'))

    const partial = buildComparisonReviewRows(
        games,
        prototypeReviews.filter((review) => review.gameId === STARDEW),
    )
    assert.deepEqual(partial[0].values, ['2 reviews', 'Not listed'])
    assert.deepEqual(partial[1].values, ['8.5/10 · 2 reviews', 'Not listed'])
    assert.deepEqual(partial[2].values, ['2 friend reviews', 'Not listed'])
    assert.ok(partial.every((row) => row.status === 'unavailable'))
})

test('comparison adds no review rows when no selected game has reviews', () => {
    const games = getGamesByIds([HADES, FROSTPUNK], gameCatalog)
    assert.deepEqual(buildComparisonReviewRows(games, []), [])
})

test('comparison page exposes review context without assigning a verdict', () => {
    const html = renderToStaticMarkup(
        React.createElement(ComparePage, {
            games: gameCatalog,
            selectedGameIds: [STARDEW, FROSTPUNK],
            saved: [],
            onAdd() {},
            onRemove() {},
            onClear() {},
            onToggleSaved() {},
            onOpenGame() {},
            onBrowse() {},
            reviews: prototypeReviews.filter((review) => review.gameId === STARDEW),
        }),
    )

    assert.match(html, /rvw-compare-note/)
    assert.match(html, /Review facts are context, not a ranking verdict/)
    assert.match(html, /assigns no overall score/)
    assert.match(html, /Read direct\s+friend reviews in game details/)
    assert.match(html, /Community reviews/)
    assert.match(html, /Reviewer-supplied overall/)
    assert.match(html, /Friends&#x27; reviews|Friends’ reviews/)
    assert.match(html, /8\.5\/10 · 2 reviews/)
    assert.match(html, /Not listed/)
})
