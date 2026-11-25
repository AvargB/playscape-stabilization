import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import ReviewBreakdown from '../src/features/reviews/ReviewBreakdown.tsx'
import GameDetails from '../src/features/game-details/index.tsx'
import {
    REVIEW_CATEGORIES,
    buildReviewBreakdown,
    prototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog } from '../src/data/games.ts'

const STARDEW = 413150

test('community breakdown shows reviewer-supplied overall and all six category averages', () => {
    const breakdown = buildReviewBreakdown(prototypeReviews, STARDEW)
    const html = renderToStaticMarkup(React.createElement(ReviewBreakdown, { breakdown }))

    assert.match(html, /Community review/)
    assert.match(html, /8\.5/)
    assert.match(html, /2 reviews/)
    assert.match(html, /The overall score is what reviewers gave the game/)
    assert.match(html, /Category averages are shown separately and never replace it\./)

    for (const category of REVIEW_CATEGORIES) {
        assert.match(html, new RegExp(`>${category}</span>`))
    }
    assert.match(html, /Replayability: 9\.0 out of 10 from 2 ratings/)
    assert.match(html, /Visuals: 8\.5 out of 10 from 2 ratings/)
})

test('sparse category ratings are shown as unavailable instead of inferred', () => {
    const breakdown = buildReviewBreakdown([
        { ...prototypeReviews[0], categories: { Story: 10 } },
    ])
    const html = renderToStaticMarkup(React.createElement(ReviewBreakdown, { breakdown }))

    assert.match(html, /9\.0/)
    assert.match(html, /Story: 10\.0 out of 10 from 1 rating/)
    assert.match(html, /Gameplay: not enough ratings/)
    assert.match(html, /no ratings/)
})

test('empty community state does not invent a score', () => {
    const html = renderToStaticMarkup(
        React.createElement(ReviewBreakdown, { breakdown: buildReviewBreakdown([]) }),
    )
    assert.match(html, /No reviews yet\./)
    assert.match(html, /ownership alone never becomes a rating/)
    assert.doesNotMatch(html, /rvw-overall/)
})

test('game details render the community review alongside the submission form', () => {
    const html = renderToStaticMarkup(
        React.createElement(GameDetails, {
            games: gameCatalog,
            saved: [STARDEW],
            toggle() {},
            openGame() {},
            go() {},
            setDialog() {},
            activity: [],
            compareIds: [],
            toggleCompare() {},
            detail: STARDEW,
            setDetail() {},
            reviews: prototypeReviews,
            onSubmitReview() {
                return { ok: false, errors: [] }
            },
        }),
    )
    assert.match(html, /rvw-community/)
    assert.match(html, /8\.5/)
    assert.match(html, /Write a review|Revise your review/)
    assert.match(html, /Through your friends/)
})
