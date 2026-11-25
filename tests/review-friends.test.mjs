import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import FriendReviews from '../src/features/reviews/FriendReviews.tsx'
import GameDetails from '../src/features/game-details/index.tsx'
import {
    createReviewRecord,
    getFriendGameReviews,
    prototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog } from '../src/data/games.ts'

const SPIRITFARER = 972660
const NO_FRIEND_REVIEW_GAME = 504230

const renderFriendReviews = (gameId, reviews = prototypeReviews) =>
    renderToStaticMarkup(React.createElement(FriendReviews, { gameId, reviews }))

test('direct-friend reviews are shown with their relationship and authored scores', () => {
    const html = renderFriendReviews(SPIRITFARER)

    assert.match(html, /rvw-friends/)
    assert.match(html, /Friends/)
    assert.match(html, /Morgan Reed/)
    assert.match(html, /Jamie Lee/)
    assert.match(html, /Owns this game/)
    assert.match(html, /Wishlisted this game/)
    assert.match(html, /9\/10/)
    assert.match(html, /8\/10/)
    assert.match(html, /Story/)
    assert.match(html, /Explicit prototype review/)
})

test('reviews from people outside the friend list never appear in the friend-first section', () => {
    const ownReview = createReviewRecord('local-you-game', {
        gameId: NO_FRIEND_REVIEW_GAME,
        personId: 'you',
        overall: 8,
        categories: { Gameplay: 9 },
        text: 'A review from someone outside the canonical friend list.',
    }, { savedIds: [NO_FRIEND_REVIEW_GAME] })
    assert.equal(ownReview.ok, true)

    const html = renderFriendReviews(NO_FRIEND_REVIEW_GAME, [ownReview.review])
    assert.match(html, /No direct friend has reviewed this game yet/)
    assert.doesNotMatch(html, /Sarah Chen/)
    assert.equal(getFriendGameReviews([ownReview.review], NO_FRIEND_REVIEW_GAME).length, 0)
})

test('empty friend state does not reuse community averages', () => {
    const html = renderFriendReviews(NO_FRIEND_REVIEW_GAME, [])
    assert.match(html, /Their ownership or wishlist alone is not treated as a review/)
    assert.doesNotMatch(html, /Community review/)
    assert.doesNotMatch(html, /rvw-overall/)
})

test('game details put friends before the community breakdown', () => {
    const html = renderToStaticMarkup(
        React.createElement(GameDetails, {
            games: gameCatalog,
            saved: [SPIRITFARER],
            toggle() {},
            openGame() {},
            go() {},
            setDialog() {},
            activity: [],
            compareIds: [],
            toggleCompare() {},
            detail: SPIRITFARER,
            setDetail() {},
            reviews: prototypeReviews,
            onSubmitReview() {
                return { ok: false, errors: [] }
            },
        }),
    )

    const friendIndex = html.indexOf('rvw-friends')
    const communityIndex = html.indexOf('rvw-community')
    const formIndex = html.indexOf('rvw-panel')
    assert.ok(friendIndex >= 0)
    assert.ok(communityIndex > friendIndex)
    assert.ok(formIndex >= 0)
    assert.match(html, /Through your friends/)
})
