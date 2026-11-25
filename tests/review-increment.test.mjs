import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import ComparePage from '../src/features/compare/ComparePage.tsx'
import { buildComparisonReviewRows } from '../src/features/compare/utils.ts'
import Discover from '../src/features/discover/index.tsx'
import GameDetails from '../src/features/game-details/index.tsx'
import Profiles from '../src/features/profiles/index.tsx'
import ReviewBreakdown from '../src/features/reviews/ReviewBreakdown.tsx'
import ReviewForm from '../src/features/reviews/ReviewForm.tsx'
import {
    MAX_REVIEW_TEXT_LENGTH,
    REVIEW_CATEGORIES,
    REVIEW_KEYS,
    REVIEW_SCALE,
    buildReviewBreakdown,
    buildReviewInsights,
    createReviewRecord,
    filterGamesByReviews,
    findReviewForPersonGame,
    getDirectFriendIds,
    getFriendGameReviews,
    getGameReviews,
    getReviewRelationship,
    isEligibleReviewAuthor,
    normalizePersistedReviews,
    normalizeReviewDraft,
    partitionReviews,
    prototypeReviews,
    resolveReviews,
    validatePrototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog, getGameById, getGamesByIds } from '../src/data/games.ts'
import {
    initialActivity,
    initialCircles,
    socialPeople,
} from '../src/socialData.ts'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))
const STARDEW = 413150
const SHORT_HIKE = 1055540
const SPIRITFARER = 972660
const FIREWATCH = 383870
const FROSTPUNK = 323190
const NOITA = 504230

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

function renderGameDetails(reviews = prototypeReviews) {
    return renderToStaticMarkup(
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
            reviews,
            onSubmitReview: () => ({ ok: false, errors: [] }),
        }),
    )
}

function renderDiscover() {
    return renderToStaticMarkup(
        React.createElement(Discover, {
            games: gameCatalog,
            saved: [],
            toggle() {},
            openGame() {},
            changeView() {},
            mood: 'Spring',
            setMood() {},
            prefs: {},
            setPrefs() {},
            active: false,
            setActive() {},
            query: '',
            setQuery() {},
            socialDiscovery: false,
            setSocialDiscovery() {},
            panel: '',
            setPanel() {},
            find() {},
            title: 'What are you in the mood for?',
            seasons: [],
            resultRef: React.createRef(),
            reviews: prototypeReviews,
        }),
    )
}

function renderCompare() {
    return renderToStaticMarkup(
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
            reviews: prototypeReviews,
        }),
    )
}

function renderProfile(id = 'morgan', activity = []) {
    return renderToStaticMarkup(
        React.createElement(Profiles, {
            id,
            initialTab: 'Reviews',
            initialAudience: 'Myself',
            reviews: prototypeReviews,
            onOpenGame() {},
            social: {
                activity,
                state: {
                    circles: initialCircles,
                    reactions: [],
                    comments: {},
                    savedRecs: [],
                    privacy: { profile: 'Public', wishlist: 'Public', activity: 'Friends only' },
                    sent: [],
                    shares: [],
                    activity: initialActivity,
                    discussions: {},
                    invites: [],
                    circleVotes: [],
                    circlePlans: [],
                    circleGroupRecommendations: [],
                    circleGoals: [],
                },
                saved: [],
                go() {},
                setDialog() {},
            },
            renderAvatar: () => null,
            renderSmallGame: () => null,
            renderActivityCard: () => null,
        }),
    )
}

test('01 overall rating stays reviewer supplied and is never a category mean', () => {
    const review = prototypeReviews[0]
    const categoryMean =
        Object.values(review.categories).reduce((sum, score) => sum + (score ?? 0), 0) /
        REVIEW_CATEGORIES.length
    assert.equal(review.overall, 9)
    assert.notEqual(review.overall, Number(categoryMean.toFixed(1)))
    assert.equal(buildReviewBreakdown([review]).overallAverage, 9)
})

test('02 six optional category ratings use the same 1–10 scale', () => {
    assert.deepEqual(REVIEW_CATEGORIES, [
        'Story',
        'Gameplay',
        'Visuals',
        'Audio',
        'Replayability',
        'Performance',
    ])
    assert.deepEqual(REVIEW_SCALE, { min: 1, max: 10 })

    const optional = normalizeReviewDraft(
        { gameId: STARDEW, personId: 'you', overall: 7, text: 'Short note' },
        gameCatalog,
        [STARDEW],
    )
    assert.equal(optional.ok, true)
    if (optional.ok) assert.deepEqual(optional.draft.categories, {})

    const invalid = normalizeReviewDraft(
        {
            gameId: STARDEW,
            personId: 'you',
            overall: 7,
            categories: { Story: 0 },
            text: 'Short note',
        },
        gameCatalog,
        [STARDEW],
    )
    assert.equal(invalid.ok, false)
})

test('03 only owners and wishlisters can author a review', () => {
    assert.equal(isEligibleReviewAuthor('you', STARDEW, socialPeople, []), true)
    assert.equal(isEligibleReviewAuthor('you', NOITA, socialPeople, []), false)
    const rejected = normalizeReviewDraft(
        { gameId: NOITA, personId: 'you', overall: 8, text: 'No relationship here.' },
        gameCatalog,
        [],
    )
    assert.equal(rejected.ok, false)
    if (!rejected.ok) {
        assert.ok(rejected.errors.some((error) => /owns or wishlists/.test(error)))
    }
})

test('04 no opinion is inferred from ownership, wishlists, recommendations, or activity', () => {
    const you = socialPeople.find((person) => person.id === 'you')
    assert.equal(getReviewRelationship(you, STARDEW), 'wishlisted')
    const empty = buildReviewBreakdown([])
    assert.equal(empty.reviewCount, 0)
    assert.equal(empty.overallAverage, null)
    assert.equal(getGameReviews([], FIREWATCH).length, 0)

    const model = readFileSync(path.join(srcRoot, 'features/reviews/model.ts'), 'utf8')
    assert.doesNotMatch(model, /Math\.random/)
    assert.doesNotMatch(model, /recommends[^\n]*overall/)
    assert.doesNotMatch(model, /activity[^\n]*overall/)
})

test('05 prototype reviews are explicit and grounded in real relationships', () => {
    assert.deepEqual(validatePrototypeReviews(), [])
    assert.ok(prototypeReviews.every((review) => review.source === 'prototype'))
    assert.ok(prototypeReviews.every((review) => Boolean(getGameById(review.gameId))))
    const friends = getDirectFriendIds()
    assert.ok(prototypeReviews.every((review) => friends.includes(review.personId)))
    assert.ok(prototypeReviews.some((review) => review.personId === 'casey'))
    assert.ok(prototypeReviews.some((review) => review.personId === 'riley'))
    assert.ok(prototypeReviews.some((review) => review.personId === 'sam'))
    assert.ok(prototypeReviews.some((review) => review.personId === 'devon'))
})

test('06 one active review exists per person and game; resubmission is a revision', () => {
    const original = createReviewRecord(
        'local-you-stardew',
        { gameId: STARDEW, personId: 'you', overall: 7, text: 'First notes.' },
        { savedIds: [STARDEW], now: '2026-11-20T12:00:00.000Z' },
    )
    const revision = createReviewRecord(
        'local-you-stardew-v2',
        { gameId: STARDEW, personId: 'you', overall: 8, text: 'Revised notes.' },
        {
            savedIds: [STARDEW],
            revisionOf: original.ok ? original.review.id : undefined,
            now: '2026-11-22T12:00:00.000Z',
        },
    )
    assert.equal(original.ok, true)
    assert.equal(revision.ok, true)
    if (original.ok && revision.ok) {
        assert.equal(revision.review.revisionOf, original.review.id)
        const all = resolveReviews([prototypeReviews[0], original.review, revision.review])
        const active = new Map()
        for (const review of all) {
            active.set(`${review.gameId}:${review.personId}`, review)
        }
        assert.equal(active.get(`${STARDEW}:you`).id, revision.review.id)
        assert.equal([...active.values()].filter((review) => review.personId === 'you').length, 1)
    }
})

test('07 missing games and unknown people are rejected honestly', () => {
    const missingGame = normalizeReviewDraft(
        { gameId: 999999, personId: 'you', overall: 8, text: 'Missing game.' },
        gameCatalog,
        [],
    )
    const missingPerson = normalizeReviewDraft(
        { gameId: STARDEW, personId: 'nobody', overall: 8, text: 'Missing person.' },
        gameCatalog,
        [STARDEW],
    )
    assert.equal(missingGame.ok, false)
    assert.equal(missingPerson.ok, false)
    assert.deepEqual(
        resolveReviews([{ ...prototypeReviews[0], gameId: 999999 }], gameCatalog),
        [],
    )
})

test('08 friend reviews are a separate view of the same canonical review records', () => {
    const partitions = partitionReviews(prototypeReviews)
    assert.ok(partitions.friendReviews.length > 0)
    assert.equal(partitions.friendReviews.length, prototypeReviews.length)
    assert.equal(partitions.communityReviews.length, prototypeReviews.length)
    assert.notEqual(partitions.friendReviews, partitions.communityReviews)
    assert.ok(partitions.friendReviews.every((review) => getDirectFriendIds().includes(review.personId)))
    assert.ok(partitions.communityReviews.every((review) => prototypeReviews.includes(review)))
})

test('09 friends are shown first with individual scores and profile access', () => {
    const html = renderGameDetails()
    const friendIndex = html.indexOf('id="friend-reviews-413150"')
    const communityIndex = html.indexOf('id="rvw-community-heading-413150"')
    const formIndex = html.indexOf('id="rvw-heading-413150"')
    assert.ok(friendIndex >= 0 && friendIndex < communityIndex)
    assert.ok(communityIndex < formIndex)
    assert.match(html, /Alex Kim/)
    assert.match(html, /Overall 9 out of 10 from Alex Kim/)
    assert.match(html, /<button type="button" class="person-link"/)
})

test('10 community breakdown averages reviewer-supplied overall scores separately', () => {
    const breakdown = buildReviewBreakdown(getGameReviews(prototypeReviews, STARDEW), STARDEW)
    assert.equal(breakdown.reviewCount, 2)
    assert.equal(breakdown.overallAverage, 8.5)
    const story = breakdown.categories.find((stat) => stat.category === 'Story')
    const replayability = breakdown.categories.find((stat) => stat.category === 'Replayability')
    assert.equal(story?.average, 8)
    assert.equal(replayability?.average, 9)
})

test('11 sparse categories and empty community states stay unavailable, not invented', () => {
    const sparse = buildReviewBreakdown([{ ...prototypeReviews[0], categories: { Story: 8 } }])
    const visuals = sparse.categories.find((stat) => stat.category === 'Visuals')
    assert.equal(visuals?.count, 0)
    assert.equal(visuals?.average, null)

    const empty = buildReviewBreakdown([])
    assert.equal(empty.reviewCount, 0)
    assert.equal(empty.overallAverage, null)
    const html = renderToStaticMarkup(React.createElement(ReviewBreakdown, { breakdown: empty }))
    assert.match(html, /No reviews yet/)
    assert.match(html, /ownership alone never becomes a rating/)
})

test('12 insights come from stored ratings, report ties, and label sources', () => {
    const insights = buildReviewInsights(
        prototypeReviews.filter((review) => review.gameId === STARDEW),
        STARDEW,
    )
    assert.deepEqual(insights.strongest.map((stat) => stat.category), ['Replayability', 'Performance'])
    assert.deepEqual(insights.weakest.map((stat) => stat.category), ['Story', 'Gameplay', 'Audio'])
    assert.equal(insights.overallSpread, 1)
    assert.equal(insights.prototypeCount, 2)
    assert.equal(insights.localCount, 0)
})

test('13 discovery filters use authored reviews rather than social signals', () => {
    const friendReviewed = filterGamesByReviews(gameCatalog, prototypeReviews, 'friend-reviewed')
        .map((game) => game.id)
        .sort()
    assert.ok(friendReviewed.includes(STARDEW))
    assert.ok(friendReviewed.includes(FROSTPUNK))
    assert.equal(friendReviewed.includes(1145360), true)
    assert.deepEqual(
        filterGamesByReviews(gameCatalog, [], 'friend-reviewed').map((game) => game.id),
        [],
    )
    assert.equal(
        filterGamesByReviews(gameCatalog, prototypeReviews, 'high-rated', 10).length,
        0,
    )
})

test('14 discovery cards show review context without treating ownership as a score', () => {
    const html = renderDiscover()
    assert.match(html, /aria-label="Review filter"/)
    assert.match(html, /card-review-context/)
    assert.match(html, /2 friend reviews/)
    assert.match(html, /8\.5\/10 community · 2 reviews/)
})

test('15 comparison adds optional review facts and admits missing data', () => {
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

    const partial = buildComparisonReviewRows(
        games,
        prototypeReviews.filter((review) => review.gameId === STARDEW),
    )
    assert.deepEqual(partial[0].values, ['2 reviews', 'Not listed'])
    assert.deepEqual(partial[1].values, ['8.5/10 · 2 reviews', 'Not listed'])
})

test('16 comparison keeps friend reviews accessible without assigning a verdict', () => {
    const html = renderCompare()
    assert.match(html, /Review facts are context, not a ranking verdict/)
    assert.match(html, /assigns no overall score/)
    assert.match(html, /Read direct\s+friend reviews in game details/)
    assert.match(html, /Community reviews/)
    assert.match(html, /Reviewer-supplied overall/)
})

test('17 profiles show actual reviews with honest empty and privacy states', () => {
    const html = renderProfile('morgan', [
        {
            id: 'old-review-quote',
            person: 'morgan',
            category: 'Reviews',
            quote: 'OLD ACTIVITY QUOTE',
        },
    ])
    assert.match(html, /Spiritfarer/)
    assert.match(html, /Firewatch/)
    assert.match(html, /Baldur/)
    assert.doesNotMatch(html, /Stardew Valley/)
    assert.doesNotMatch(html, /OLD ACTIVITY QUOTE/)

    const empty = renderProfile('you')
    assert.match(empty, /No published reviews yet/)
    assert.doesNotMatch(empty, /<article class="profile-review"/)
})

test('18 review persistence uses one dedicated versioned key with strict integrity', () => {
    assert.equal(REVIEW_KEYS.storage, 'playscape-reviews-v1')
    assert.equal(REVIEW_KEYS.version, 1)
    const normalized = normalizePersistedReviews(
        [localReview(), localReview({ id: 'invalid-score', overall: 11 }), prototypeReviews[0]],
        { games: gameCatalog, savedIds: [STARDEW] },
    )
    assert.deepEqual(normalized.reviews, [localReview()])
    assert.equal(normalized.ignored.length, 2)
})

test('19 architecture keeps one review model and leaves social storage untouched', () => {
    assert.equal(existsSync(path.join(srcRoot, 'reviewData.ts')), false)
    const model = readFileSync(path.join(srcRoot, 'features/reviews/model.ts'), 'utf8')
    const types = readFileSync(path.join(srcRoot, 'features/reviews/types.ts'), 'utf8')
    const storage = readFileSync(path.join(srcRoot, 'features/reviews/storage.ts'), 'utf8')
    const app = readFileSync(path.join(srcRoot, 'PLAYSCAPE-cleaner.tsx'), 'utf8')

    assert.match(types, /export type ReviewRecord/)
    assert.match(model, /type ReviewRecord/)
    assert.doesNotMatch(model, /localStorage|playscape-social-v1|saveSocialState/)
    assert.match(storage, /readVersionedRecord/)
    assert.match(storage, /writeVersionedRecord/)
    assert.match(app, /useReviews\(\{ games: data, savedIds: saved \}\)/)
    assert.match(app, /reviews=\{reviewState\.reviews\}/)
})

test('20 review UI is keyboard accessible, labelled, and responsive', () => {
    const css = readFileSync(path.join(srcRoot, 'features/reviews/reviews.css'), 'utf8')
    const formHtml = renderToStaticMarkup(
        React.createElement(ReviewForm, {
            gameId: STARDEW,
            canReview: true,
            saved: true,
            onSubmit: () => ({ ok: false, errors: [] }),
        }),
    )

    assert.match(formHtml, /<form class="rvw-panel"/)
    assert.match(formHtml, /<fieldset class="rvw-categories">/)
    assert.match(formHtml, /type="submit"/)
    for (const category of REVIEW_CATEGORIES) {
        assert.match(formHtml, new RegExp(`aria-label="${category} rating"`))
    }
    assert.match(formHtml, new RegExp(`maxLength="${MAX_REVIEW_TEXT_LENGTH}"`))
    assert.match(css, /button:focus-visible/)
    assert.match(css, /@media \(max-width: 700px\)/)
    assert.match(css, /@media \(max-width: 480px\)/)
})
