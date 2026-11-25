import test from 'node:test'
import assert from 'node:assert/strict'

import {
    REVIEW_CATEGORIES,
    REVIEW_SCALE,
    buildReviewBreakdown,
    createReviewRecord,
    getDirectFriendIds,
    getGameReviews,
    getPersonReviews,
    getReviewRelationship,
    isDirectFriend,
    isEligibleReviewAuthor,
    normalizeReviewDraft,
    partitionReviews,
    prototypeReviews,
    findReviewForPersonGame,
    validatePrototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog, getGameById } from '../src/data/games.ts'
import { initialFriendships, socialPeople } from '../src/socialData.ts'

const STARDEW = 413150
const SHORT_HIKE = 1055540
const NOITA = 504230
const MISSING_GAME = 999999
const ALEX = 'alex'

test('reviews use exactly six canonical 1–10 category ratings', () => {
    assert.deepEqual([...REVIEW_CATEGORIES], [
        'Story',
        'Gameplay',
        'Visuals',
        'Audio',
        'Replayability',
        'Performance',
    ])
    assert.deepEqual(REVIEW_SCALE, { min: 1, max: 10 })
})

test('category ratings are optional and invalid values are rejected', () => {
    const valid = normalizeReviewDraft({
        gameId: STARDEW,
        personId: ALEX,
        overall: 9,
        categories: { Story: 9, Replayability: 8 },
        text: 'A thoughtful farm loop.',
    })
    assert.equal(valid.ok, true)
    assert.deepEqual(valid.draft.categories, { Story: 9, Replayability: 8 })

    const invalid = normalizeReviewDraft({
        gameId: STARDEW,
        personId: ALEX,
        overall: 9,
        categories: { Story: 9, Audio: 0, Unknown: 7 },
        text: 'A thoughtful farm loop.',
    })
    assert.equal(invalid.ok, false)
    assert.ok(invalid.errors.some((error) => /Audio rating/.test(error)))
    assert.ok(invalid.errors.some((error) => /Unknown review category/.test(error)))
})

test('overall rating stays reviewer-supplied and is never replaced by a category mean', () => {
    const created = createReviewRecord('local-alex-stardew', {
        gameId: STARDEW,
        personId: ALEX,
        overall: 9,
        categories: {
            Story: 8,
            Gameplay: 9,
            Visuals: 8,
            Audio: 8,
            Replayability: 10,
            Performance: 9,
        },
        text: 'A thoughtful farm loop.',
    }, { now: '2026-11-24T10:00:00.000Z' })

    assert.equal(created.ok, true)
    const review = created.review
    assert.equal(review.overall, 9)
    assert.notEqual(review.overall, 8.7)
    assert.equal(review.categories.Story, 8)
    assert.equal(review.source, 'local')
})

test('prototype reviews come from eligible canonical friends', () => {
    assert.deepEqual(validatePrototypeReviews(), [])
    assert.equal(prototypeReviews.length >= 2, true)

    const friends = new Set(getDirectFriendIds(initialFriendships))
    assert.deepEqual([...friends].sort(), [
        'alex', 'casey', 'devon', 'jamie', 'morgan', 'riley', 'sam',
    ])
    assert.equal(isDirectFriend('casey'), true)
    assert.equal(isDirectFriend('riley'), true)
    assert.equal(isDirectFriend('sam'), true)
    assert.equal(isDirectFriend('devon'), true)

    let foundWishlistAuthor = false
    for (const review of prototypeReviews) {
        assert.ok(getGameById(review.gameId), `game ${review.gameId} resolves`)
        const person = socialPeople.find((entry) => entry.id === review.personId)
        assert.ok(person, `person ${review.personId} resolves`)
        assert.equal(isEligibleReviewAuthor(review.personId, review.gameId), true)
        assert.equal(isDirectFriend(review.personId, initialFriendships), true)
        const relationship = getReviewRelationship(person, review.gameId)
        assert.notEqual(relationship, 'none')
        if (relationship === 'wishlisted') foundWishlistAuthor = true
    }
    assert.equal(foundWishlistAuthor, true)
})

test('community breakdown averages actual reviews without inventing sparse categories', () => {
    const stardewReviews = getGameReviews(prototypeReviews, STARDEW)
    assert.equal(stardewReviews.length, 2)

    const breakdown = buildReviewBreakdown(prototypeReviews, STARDEW)
    assert.equal(breakdown.gameId, STARDEW)
    assert.equal(breakdown.reviewCount, 2)
    assert.equal(breakdown.overallAverage, 8.5)
    assert.equal(breakdown.categories.length, 6)

    for (const stat of breakdown.categories) {
        assert.equal(stat.count, 2)
        assert.ok(stat.average !== null)
    }

    const sparse = buildReviewBreakdown(
        [{ ...prototypeReviews[0], categories: { Story: 8 } }],
        SHORT_HIKE,
    )
    const performance = sparse.categories.find((stat) => stat.category === 'Performance')
    assert.equal(performance.count, 0)
    assert.equal(performance.average, null)
})

test('friend reviews are a separate view of one canonical review list', () => {
    const { friendReviews, communityReviews } = partitionReviews(prototypeReviews, initialFriendships)
    assert.ok(friendReviews.length > 0)
    assert.equal(friendReviews.length, prototypeReviews.length)
    assert.equal(communityReviews.length, prototypeReviews.length)
    assert.notEqual(friendReviews, communityReviews)
    assert.equal(friendReviews.every((review) => isDirectFriend(review.personId)), true)
    assert.equal(communityReviews.every((review) => prototypeReviews.includes(review)), true)
    assert.equal(getPersonReviews(prototypeReviews, 'morgan').length >= 2, true)
})

test('a revision records the original review while keeping one review per person and game', () => {
    const existing = findReviewForPersonGame(prototypeReviews, STARDEW, ALEX)
    assert.ok(existing)

    const created = createReviewRecord('local-alex-stardew', {
        gameId: STARDEW,
        personId: ALEX,
        overall: 10,
        categories: { Story: 9 },
        text: 'Revised after another season.',
    }, {
        now: '2026-11-24T11:00:00.000Z',
        revisionOf: existing.id,
    })

    assert.equal(created.ok, true)
    assert.equal(created.review.revisionOf, existing.id)
    assert.equal(created.review.updatedAt, '2026-11-24T11:00:00.000Z')
})

test('missing games, unknown people, and ineligible authors are rejected honestly', () => {
    const missingGame = normalizeReviewDraft({
        gameId: MISSING_GAME,
        personId: ALEX,
        overall: 9,
        text: 'A review.',
    })
    assert.equal(missingGame.ok, false)
    assert.ok(missingGame.errors.some((error) => /catalog/.test(error)))
    assert.equal(gameCatalog.some((game) => game.id === MISSING_GAME), false)

    const unknownPerson = normalizeReviewDraft({
        gameId: STARDEW,
        personId: 'missing-person',
        overall: 9,
        text: 'A review.',
    })
    assert.equal(unknownPerson.ok, false)
    assert.ok(unknownPerson.errors.some((error) => /known player/.test(error)))

    const ineligible = normalizeReviewDraft({
        gameId: NOITA,
        personId: 'casey',
        overall: 9,
        text: 'A review.',
    })
    assert.equal(ineligible.ok, false)
    assert.ok(ineligible.errors.some((error) => /owns or wishlists/.test(error)))

    assert.equal(isEligibleReviewAuthor('casey', NOITA), false)
    assert.equal(isEligibleReviewAuthor('missing-person', STARDEW), false)
})
