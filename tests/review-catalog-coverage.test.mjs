import test from 'node:test'
import assert from 'node:assert/strict'

import { gameCatalog } from '../src/data/games.ts'
import { initialCircles, socialPeople } from '../src/socialData.ts'
import {
    REVIEW_CATEGORIES,
    buildReviewInsights,
    getDirectFriendIds,
    getFriendGameReviews,
    getGameReviews,
    isDirectFriend,
    isEligibleReviewAuthor,
    prototypeReviews,
    validatePrototypeReviews,
} from '../src/features/reviews/index.ts'

const expectedFriendGames = {
    jamie: [383870, 413150, 864050, 972660, 1055540, 1092790],
    alex: [39210, 105600, 322330, 413150, 1172620, 1605220],
    morgan: [1200, 219760, 383870, 488790, 650700, 972660, 1055540, 1057090, 1086940, 1091500, 1092790],
    casey: [219760, 261550, 323190, 646570, 1086940],
    riley: [200710, 275850, 381210, 504230, 1030300, 1057090, 1129580, 1145360],
    sam: [105600, 257510, 600480, 747200, 864050, 1605220],
    devon: [1200, 39210, 1091500, 1172620],
}

const reviewIntroducedFriendGames = [
    1145360, 1030300, 504230, 747200, 600480, 275850, 257510, 200710, 1129580, 381210,
]

const sorted = (ids) => [...ids].sort((a, b) => a - b)

test('every catalog game still has an explicit community review from an eligible author', () => {
    assert.deepEqual(validatePrototypeReviews(), [])

    for (const game of gameCatalog) {
        const reviews = getGameReviews(prototypeReviews, game.id)
        assert.ok(reviews.length >= 1, `${game.title} should have a community review`)
        assert.equal(
            reviews.every((review) => review.source === 'prototype'),
            true,
            `${game.title} reviews should be explicit prototype records`,
        )
        assert.equal(
            reviews.every((review) => isEligibleReviewAuthor(review.personId, review.gameId, socialPeople, [])),
            true,
            `${game.title} reviewers should own or wishlist the game`,
        )
        assert.equal(
            new Set(reviews.map((review) => review.personId)).size,
            reviews.length,
            `${game.title} should have one review per author`,
        )
    }
})

test('every review author is a canonical friend with interest-matched games', () => {
    assert.deepEqual([...getDirectFriendIds()].sort(), [
        'alex', 'casey', 'devon', 'jamie', 'morgan', 'riley', 'sam',
    ])

    for (const [personId, expected] of Object.entries(expectedFriendGames)) {
        assert.equal(isDirectFriend(personId), true)
        const actual = prototypeReviews
            .filter((review) => review.personId === personId)
            .map((review) => review.gameId)
        assert.deepEqual(sorted(actual), sorted(expected))
    }

    for (const gameId of reviewIntroducedFriendGames) {
        assert.ok(getGameReviews(prototypeReviews, gameId).length >= 1)
        assert.ok(getFriendGameReviews(prototypeReviews, gameId).length >= 1)
    }

    assert.equal(
        prototypeReviews.every((review) => isDirectFriend(review.personId)),
        true,
        'review authors must also be real friends everywhere',
    )
})

test('different friend genres are represented by different joined circles', () => {
    const joinedWithYou = initialCircles.filter(
        (circle) => circle.joined && circle.members.includes('you'),
    )
    assert.deepEqual(joinedWithYou.map((circle) => circle.id), ['afterhours', 'tactics'])

    const afterhours = joinedWithYou.find((circle) => circle.id === 'afterhours')
    const tactics = joinedWithYou.find((circle) => circle.id === 'tactics')
    assert.ok(afterhours?.members.includes('jamie'))
    assert.match(afterhours?.topic ?? '', /Co-op/)
    assert.deepEqual(tactics?.members, ['you', 'casey'])
    assert.match(tactics?.topic ?? '', /Strategy/)
    assert.equal(socialPeople.some((person) => person.id === 'casey'), true)
})

test('ratings still show varied patterns across all six categories', () => {
    const strongest = new Set()
    const weakest = new Set()
    const spreads = new Set()
    const patterns = new Set()

    for (const game of gameCatalog) {
        const insights = buildReviewInsights(prototypeReviews, game.id)
        assert.ok(insights.reviewCount >= 1, `${game.title} needs stored ratings`)
        assert.ok(insights.strongest.length > 0, `${game.title} needs a strongest category`)
        assert.ok(insights.weakest.length > 0, `${game.title} needs a weakest category`)

        for (const stat of insights.strongest) strongest.add(stat.category)
        for (const stat of insights.weakest) weakest.add(stat.category)
        spreads.add(insights.overallSpread)
        patterns.add(insights.strongest.map((stat) => stat.category).sort().join('+'))
    }

    assert.deepEqual([...strongest].sort(), [...REVIEW_CATEGORIES].sort())
    assert.deepEqual([...weakest].sort(), [...REVIEW_CATEGORIES].sort())
    assert.equal(spreads.has(0), true)
    assert.equal(spreads.has(1), true)
    assert.equal(spreads.has(2), true)
    assert.equal(patterns.size >= 6, true, `expected at least six patterns, got ${patterns.size}`)
})
