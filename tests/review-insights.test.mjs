import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import ReviewInsights from '../src/features/reviews/ReviewInsights.tsx'
import GameDetails from '../src/features/game-details/index.tsx'
import {
    buildReviewInsights,
    prototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog } from '../src/data/games.ts'

const STARDEW = 413150
const SHORT_HIKE = 1055540
const FROSTPUNK = 323190

const renderInsights = (gameId, reviews) =>
    renderToStaticMarkup(
        React.createElement(ReviewInsights, {
            gameId,
            insights: buildReviewInsights(reviews, gameId),
        }),
    )

test('insights report tied strongest and weakest categories from actual ratings', () => {
    const insights = buildReviewInsights(prototypeReviews, STARDEW)
    assert.equal(insights.reviewCount, 2)
    assert.equal(insights.prototypeCount, 2)
    assert.equal(insights.localCount, 0)
    assert.deepEqual(
        insights.strongest.map((stat) => stat.category).sort(),
        ['Performance', 'Replayability'],
    )
    assert.deepEqual(
        insights.weakest.map((stat) => stat.category).sort(),
        ['Audio', 'Gameplay', 'Story'],
    )
    assert.equal(insights.overallSpread, 1)
    assert.match(insights.agreement, /broadly agree/)

    const html = renderInsights(STARDEW, prototypeReviews)
    assert.match(html, /Review insights/)
    assert.match(html, /2 explicit prototype reviews/)
    assert.match(html, /Performance 9\.0 \(2 ratings\)/)
    assert.match(html, /Replayability 9\.0 \(2 ratings\)/)
    assert.match(html, /Story 8\.0 \(2 ratings\)/)
    assert.match(html, /Spread: 1 point/)
    assert.match(html, /do not\s+turn an overall score into a category average/)
})

test('one review does not fabricate agreement insights', () => {
    const singleReview = prototypeReviews.filter(
        (review) => review.gameId === SHORT_HIKE && review.personId === 'jamie',
    )
    assert.equal(singleReview.length, 1)

    const insights = buildReviewInsights(singleReview, SHORT_HIKE)
    assert.equal(insights.reviewCount, 1)
    assert.equal(insights.overallSpread, 0)
    assert.match(insights.agreement, /Only one review/)

    const html = renderInsights(SHORT_HIKE, singleReview)
    assert.match(html, /Only one review, so there is no agreement to compare/)
})

test('empty insight state stays honest and source-labelled', () => {
    const html = renderInsights(FROSTPUNK, [])
    assert.match(html, /No insights yet/)
    assert.match(html, /owners or\s+wishlisters author reviews/)
    assert.doesNotMatch(html, /Strongest category/)
})

test('game details include insights after the community breakdown', () => {
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

    assert.ok(html.indexOf('rvw-insights') > html.indexOf('rvw-community'))
    assert.match(html, /Patterns in the ratings/)
})
