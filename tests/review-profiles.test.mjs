import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import Profiles from '../src/features/profiles/index.tsx'
import { prototypeReviews } from '../src/features/reviews/index.ts'
import {
    directFriendIds,
    initialCircles,
    initialActivity,
    socialPeople,
} from '../src/socialData.ts'

const baseState = {
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
}

function renderProfile(options = {}) {
    const {
        id = 'morgan',
        reviews = prototypeReviews,
        activity = [],
        audience = 'Myself',
        tab = 'Reviews',
    } = options
    return renderToStaticMarkup(
        React.createElement(Profiles, {
            id,
            initialTab: tab,
            initialAudience: audience,
            reviews,
            onOpenGame() {},
            social: {
                activity,
                state: baseState,
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

test('profile Reviews tab shows authored reviews instead of activity quotes', () => {
    const html = renderProfile({
        activity: [
            {
                id: 'a-review-quote',
                person: 'morgan',
                category: 'Reviews',
                quote: 'OLD ACTIVITY QUOTE',
            },
        ],
    })

    assert.match(html, /profile-reviews/)
    assert.match(html, /Spiritfarer/)
    assert.match(html, /Firewatch/)
    assert.match(html, /Baldur/)
    assert.doesNotMatch(html, /Stardew Valley/)
    assert.match(html, /Overall 9\/10/)
    assert.match(html, /Explicit prototype review/)
    assert.doesNotMatch(html, /OLD ACTIVITY QUOTE/)
})

test('profile Reviews tab is honest when the person has no reviews', () => {
    const html = renderProfile({ id: 'you' })
    assert.match(html, /No published reviews yet/)
    assert.match(html, /owner or\s+wishlister writes one/)
    assert.doesNotMatch(html, /<article class="profile-review"/)
})

test('own profile Friends list includes friends introduced for reviews', () => {
    const html = renderProfile({ id: 'you', reviews: [] })
    assert.match(html, /Friends \(7\)/)
    for (const id of directFriendIds) {
        const person = socialPeople.find((entry) => entry.id === id)
        assert.match(html, new RegExp(`data-friend-id="${id}"[^>]*>[\\s\\S]*?${person.name}`))
    }
})

test('profile Friends tab is a dedicated area with the canonical roster', () => {
    const html = renderProfile({ id: 'you', reviews: [], tab: 'Friends' })
    assert.match(html, /class="profile-friend-grid"/)
    assert.match(html, /Your friends \(7\)/)
    assert.match(html, /Everyone here is part of the same network/)
    for (const id of directFriendIds) {
        const person = socialPeople.find((entry) => entry.id === id)
        assert.match(html, new RegExp(`data-profile-friend-id="${id}"[^>]*>[\\s\\S]*?${person.name}`))
    }
    assert.match(html, /Shared:/)

    const mutual = renderProfile({ id: 'riley', reviews: [], tab: 'Friends' })
    assert.match(mutual, /Mutual friends \(1\)/)
    assert.match(mutual, /data-profile-friend-id="morgan"/)
    assert.match(mutual, /People you both know/)
})

test('own reviews follow the activity privacy preview', () => {
    const ownReview = {
        ...prototypeReviews[0],
        id: 'local-you-stardew',
        personId: 'you',
        source: 'local',
    }
    const visible = renderProfile({ id: 'you', reviews: [ownReview], audience: 'Myself' })
    assert.match(visible, /Stardew Valley/)
    assert.match(visible, /Locally authored review/)

    const hidden = renderProfile({
        id: 'you',
        reviews: [ownReview],
        audience: 'Public visitor',
    })
    assert.match(hidden, /Reviews are hidden by this profile’s/)
    assert.doesNotMatch(hidden, /Stardew Valley/)
})
