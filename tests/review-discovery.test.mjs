import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import Discover from '../src/features/discover/index.tsx'
import {
    filterGamesByReviews,
    prototypeReviews,
} from '../src/features/reviews/index.ts'
import { gameCatalog } from '../src/data/games.ts'

const STARDEW = 413150
const FROSTPUNK = 323190

const idsFor = (filter) =>
    filterGamesByReviews(gameCatalog, prototypeReviews, filter).map((game) => game.id).sort()

test('review-aware discovery filters only games with authored reviews', () => {
    assert.equal(idsFor('all').length, gameCatalog.length)

    const friendReviewed = idsFor('friend-reviewed')
    assert.ok(friendReviewed.includes(STARDEW))
    assert.ok(friendReviewed.includes(FROSTPUNK))
    assert.equal(friendReviewed.includes(1145360), true)
    assert.equal(friendReviewed.includes(381210), true)

    assert.deepEqual(
        idsFor('community-reviewed'),
        gameCatalog.map((game) => game.id).sort(),
    )
    assert.deepEqual(
        filterGamesByReviews(gameCatalog, [], 'friend-reviewed').map((game) => game.id),
        [],
    )
})

test('high-rated filter uses reviewer-supplied overall averages, not ownership', () => {
    const highRated = idsFor('high-rated')
    assert.deepEqual(highRated, [
        1030300, 1055540, 105600, 1057090, 1086940, 1092790, 1145360, 1200, 219760,
        322330, 323190, 381210, 383870, 39210, 413150, 504230, 600480, 646570,
        864050, 972660,
    ].sort())
    assert.equal(highRated.includes(275850), false)

    const strict = filterGamesByReviews(
        gameCatalog,
        prototypeReviews,
        'high-rated',
        9,
    ).map((game) => game.id).sort()
    assert.deepEqual(strict, [1086940, 504230, 646570])
})

test('discovery exposes review filters and card-level review context', () => {
    const html = renderToStaticMarkup(
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

    assert.match(html, /aria-label="Review filter"/)
    assert.match(html, /All games/)
    assert.match(html, /Friend reviewed/)
    assert.match(html, /Community reviewed/)
    assert.match(html, /Overall 8\+/)
    assert.match(html, /card-review-context/)
    assert.match(html, /2 friend reviews/)
    assert.match(html, /8\.5\/10 community/)
    assert.match(html, /aria-pressed="true"/)
})
