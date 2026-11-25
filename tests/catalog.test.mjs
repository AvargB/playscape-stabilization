import test from 'node:test'
import assert from 'node:assert/strict'
import { buildComparisonSummary, buildFriendGameSignals, buildWishlistRecommendations, buildWishlistSummary, filterGames, gameCatalog, getGameById, getGameBySlug, getGamesByIds, resolveGameRecord, searchGames, sortGames, validateGameCatalog } from '../src/data/games.ts'
import { applyInviteDecision, buildInviteSuggestions, getPendingInviteSummary } from '../src/socialState.ts'
import { buildSocialGraph, initialCircles, socialPeople } from '../src/socialData.ts'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { COMMUNITY_NAVIGATION, MainNavigation, MOBILE_NAVIGATION, PRIMARY_NAVIGATION, STORE_NAVIGATION } from '../src/components/navigation/MainNavigation.tsx'

test('shared navigation uses umbrella destinations to keep the top bar small', () => {
  assert.deepEqual(PRIMARY_NAVIGATION, ['Discover', 'Browse', 'Wishlist', 'Community'])
  assert.deepEqual(MOBILE_NAVIGATION, ['Discover', 'Browse', 'Wishlist', 'Community'])
  assert.deepEqual(COMMUNITY_NAVIGATION, ['Community', 'The Web', 'Gaming Circles'])
  assert.deepEqual(STORE_NAVIGATION, ['Browse', 'Compare'])
})

test('Community and Store expose their child pages beneath the umbrella links', () => {
  const props = {
    atmosphere: 'Autumn',
    wishlistCount: 0,
    menuOpen: false,
    query: '',
    onNavigate() {},
    onToggleMenu() {},
    onQueryChange() {},
    onSearchSubmit() {},
  }
  const communityHtml = renderToStaticMarkup(
    React.createElement(MainNavigation, { ...props, currentView: 'The Web' }),
  )
  assert.match(communityHtml, /aria-label="Community pages"/)
  assert.match(communityHtml, /aria-current="page">The Web/)
  assert.match(communityHtml, />Gaming Circles</)

  const storeHtml = renderToStaticMarkup(
    React.createElement(MainNavigation, { ...props, currentView: 'Compare' }),
  )
  assert.match(storeHtml, /aria-label="Store pages"/)
  assert.match(storeHtml, /aria-current="page">Compare/)
  assert.match(storeHtml, />Store</)
})

test('current player profile uses the Sarah Chen identity while preserving the canonical ID', () => {
  const profile = socialPeople.find((person) => person.id === 'you')

  assert.ok(profile)
  assert.equal(profile.name, 'Sarah Chen')
  assert.equal(profile.handle, '@sarahchen')
  assert.equal(profile.initials, 'SC')
})

test('seed catalog has unique, valid records and preserves the prototype IDs while growing the catalog', () => {
  assert.deepEqual(validateGameCatalog(), [])
  assert.ok(gameCatalog.length >= 24)
  assert.deepEqual(gameCatalog.slice(0, 8).map((game) => game.id), [413150, 1055540, 972660, 383870, 1145360, 323190, 1172620, 1030300])
  assert.ok(gameCatalog.some((game) => game.metadataStatus === 'prototype'))
  assert.ok(gameCatalog.some((game) => game.metadataStatus === 'verified'))
})

test('search matches title, description, genre, and mood metadata', () => {
  assert.equal(searchGames('stardew').length, 1)
  assert.equal(searchGames('wilderness')[0].title, 'Firewatch')
  assert.equal(searchGames('metroidvania')[0].title, 'Hollow Knight: Silksong')
  assert.ok(searchGames('relaxing').length >= 4)
  assert.equal(searchGames('   ').length, gameCatalog.length)
})

test('filters combine mood, budget, platform, and difficulty', () => {
  const results = filterGames({ moods: ['Relaxing'], maxPrice: 25, platforms: ['Nintendo Switch'], difficulty: ['Casual'] })
  assert.ok(results.some((game) => game.title === 'A Short Hike'))
  assert.ok(results.some((game) => game.title === 'Firewatch'))
  assert.ok(results.some((game) => game.title === 'Stardew Valley'))
  assert.ok(results.length >= 3)
})

test('playtime ranges and player modes are supported', () => {
  const shortSessionGames = filterGames({ maxSessionMinutes: 60 }).map((game) => game.title).sort()
  assert.ok(shortSessionGames.includes('A Short Hike'))
  assert.ok(shortSessionGames.includes('Firewatch'))
  assert.ok(shortSessionGames.includes('Frostpunk'))
  assert.ok(shortSessionGames.includes('Hades'))
  assert.ok(shortSessionGames.includes('Hollow Knight: Silksong'))
  assert.ok(shortSessionGames.includes('Spiritfarer'))
  assert.ok(shortSessionGames.includes('Stardew Valley'))
  assert.deepEqual(filterGames({ minSessionMinutes: 61, maxSessionMinutes: 120 }).map((game) => game.title).includes('Sea of Thieves'), true)
  assert.ok(filterGames({ minSessionMinutes: 121 }).length >= 4)
  assert.ok(filterGames({ minSessionMinutes: 121 }).some((game) => game.title === 'Red Dead Redemption 2'))
  assert.deepEqual(filterGames({ playerModes: ['Cooperative'] }).map((game) => game.title).includes('Sea of Thieves'), true)
  assert.ok(filterGames({ playerModes: ['Online multiplayer'] }).some((game) => game.title === 'Sea of Thieves'))
  assert.ok(filterGames({ playerModes: ['Online multiplayer'] }).length >= 1)
})

test('search and filters can operate on a supplied subset', () => {
  const subset = gameCatalog.filter((game) => game.id === 413150 || game.id === 1145360)
  assert.deepEqual(searchGames('farm', subset).map((game) => game.id), [413150])
  assert.deepEqual(filterGames({ moods: ['Exciting'] }, subset).map((game) => game.id), [1145360])
})


test('genre/platform filters, lookup helpers, and sorting work on supplied catalog data', () => {
  const genreMatches = filterGames({ genres: ['Exploration'] })
  assert.ok(genreMatches.some((game) => game.title === 'A Short Hike'))
  assert.ok(genreMatches.some((game) => game.title === 'Firewatch'))
  assert.ok(filterGames({ platforms: ['Nintendo Switch'] }).length >= 6)
  const subset = gameCatalog.filter((game) => game.id === 413150 || game.id === 1145360)
  assert.equal(getGameById(413150, subset)?.title, 'Stardew Valley')
  assert.equal(getGameBySlug('hades', subset)?.id, 1145360)
  assert.deepEqual(sortGames(subset, 'title').map((game) => game.title), ['Hades', 'Stardew Valley'])
  assert.deepEqual(sortGames(subset, 'price-low').map((game) => game.id), [413150, 1145360])
  assert.deepEqual(sortGames(subset, 'price-high').map((game) => game.id), [1145360, 413150])
  assert.deepEqual(sortGames(subset, 'featured').map((game) => game.id), subset.map((game) => game.id))
})

test('catalog helpers resolve IDs, ignore missing records, and dedupe comparison selections', () => {
  const subset = gameCatalog.filter((game) => game.id === 413150 || game.id === 1055540 || game.id === 972660)
  assert.equal(resolveGameRecord(413150, subset)?.title, 'Stardew Valley')
  assert.equal(resolveGameRecord({ id: 413150, title: 'Stale title' }, subset)?.title, 'Stardew Valley')
  assert.equal(resolveGameRecord(999999, subset), undefined)
  assert.deepEqual(getGamesByIds([413150, 999999, 413150, 1055540, null], subset).map((game) => game.id), [413150, 1055540])
})

test('wishlist summaries include saved games and overlap with friends', () => {
  const summary = buildWishlistSummary([413150, 1172620, 999999], [
    { id: 'you', name: 'Sarah Chen', wishlist: [413150, 1172620] },
    { id: 'jamie', name: 'Jamie', wishlist: [1172620, 972660] },
    { id: 'alex', name: 'Alex', wishlist: [413150, 1055540] },
  ])

  assert.deepEqual(summary.savedGames.map((game) => game.id), [413150, 1172620])
  assert.deepEqual(summary.overlaps.map((person) => person.name), ['Jamie', 'Alex'])
  assert.equal(summary.overlaps[0].sharedCount, 1)
  assert.equal(summary.overlaps[1].sharedCount, 1)
})

test('comparison summaries use canonical catalog values and help interpret the selected games', () => {
  const selected = [getGameById(413150), getGameById(1172620), getGameById(1145360)]
  const summary = buildComparisonSummary(selected)

  assert.equal(summary.gameCount, 3)
  assert.equal(summary.lowestPrice, 14.99)
  assert.equal(summary.highestPrice, 39.99)
  assert.ok(summary.platforms.includes('PC'))
  assert.ok(summary.bestValue.title === 'Stardew Valley' || summary.bestValue.title === 'Hades')
  assert.ok(summary.tagSummary.includes('Relaxing') || summary.tagSummary.includes('Social'))
})

test('wishlist recommendations rank the best next saves from friends without duplicating what is already saved', () => {
  const recommendations = buildWishlistRecommendations([413150], [
    { id: 'you', name: 'Sarah Chen', wishlist: [413150, 1172620] },
    { id: 'jamie', name: 'Jamie', wishlist: [1172620, 972660] },
    { id: 'alex', name: 'Alex', wishlist: [413150, 1055540] },
    { id: 'morgan', name: 'Morgan', wishlist: [1172620, 383870] },
  ])

  assert.ok(recommendations.some((entry) => entry.game.id === 1172620))
  assert.ok(recommendations.some((entry) => entry.game.id === 972660))
  assert.equal(recommendations[0].game.id, 1172620)
  assert.ok(recommendations.every((entry) => entry.game.id !== 413150))
})

test('friend overlap signals summarize who wants a game before you save it', () => {
  const signals = buildFriendGameSignals(1172620, [
    { id: 'you', name: 'Sarah Chen', wishlist: [413150, 1172620] },
    { id: 'jamie', name: 'Jamie', wishlist: [1172620, 972660] },
    { id: 'alex', name: 'Alex', wishlist: [413150, 1055540] },
    { id: 'morgan', name: 'Morgan', wishlist: [1172620, 383870] },
  ], [413150])

  assert.equal(signals.score, 4)
  assert.deepEqual(signals.friends.map((friend) => friend.name).sort(), ['Jamie', 'Morgan'])
  assert.match(signals.reason, /Jamie|Morgan/)
  assert.equal(signals.isSaved, false)
})

test('pending invites can be accepted or declined while updating circle membership state', () => {
  const circles = [
    { id: 'afterhours', name: 'The After Hours Club', members: ['you', 'alex'] },
    { id: 'scenic', name: 'The Scenic Route', members: ['jamie'] },
  ]
  const invites = [
    { id: 'invite-1', circle: 'afterhours', person: 'jamie', status: 'pending' },
    { id: 'invite-2', circle: 'scenic', person: 'alex', status: 'declined' },
  ]

  const accepted = applyInviteDecision(invites, circles, 'invite-1', 'accepted')
  assert.equal(accepted.invites.find((invite) => invite.id === 'invite-1').status, 'accepted')
  assert.ok(accepted.circles.find((circle) => circle.id === 'afterhours').members.includes('jamie'))

  const repeatedAccept = applyInviteDecision(accepted.invites, accepted.circles, 'invite-1', 'accepted')
  assert.equal(repeatedAccept.circles.find((circle) => circle.id === 'afterhours').members.filter((member) => member === 'jamie').length, 1)

  const declined = applyInviteDecision(invites, circles, 'invite-1', 'declined')
  assert.equal(declined.invites.find((invite) => invite.id === 'invite-1').status, 'declined')
  assert.ok(!declined.circles.find((circle) => circle.id === 'afterhours').members.includes('jamie'))

  const summary = getPendingInviteSummary(invites, circles)
  assert.equal(summary.total, 1)
  assert.equal(summary.pending, 1)
  assert.equal(summary.accepted, 0)
  assert.equal(summary.declined, 1)
  assert.deepEqual(summary.byCircle.map((entry) => entry.circleId), ['afterhours'])
})

test('shared social graph data is centralized and includes circle, friend, and recommendation relationships', () => {
  assert.ok(socialPeople.some((person) => person.id === 'you'))
  assert.ok(initialCircles.some((circle) => circle.id === 'afterhours'))

  const graph = buildSocialGraph()
  assert.ok(graph.nodes.some((node) => node.id === 'you'))
  assert.ok(graph.nodes.some((node) => node.id === 'afterhours'))
  assert.ok(graph.relationships.some((edge) => edge[0] === 'you' && edge[1] === 'jamie'))
  assert.ok(graph.relationships.some((edge) => edge[0] === 'afterhours' && edge[2] === 'Shared wishlist'))
  assert.ok(graph.relationships.some((edge) => edge[1] === 'cozy-worlds' || edge[1] === 'exploration'))
})

test('invite suggestions surface the best fits for a circle based on shared interests and wishlist overlap', () => {
  const suggestions = buildInviteSuggestions(initialCircles, socialPeople, 'story')
  assert.ok(suggestions.length >= 1)
  assert.ok(suggestions.some((entry) => entry.personId === 'jamie'))
  assert.ok(suggestions.some((entry) => entry.reason.includes('wishlist') || entry.reason.includes('interest')))
  assert.equal(suggestions[0].personId, 'jamie')
})

test('invite suggestions exclude people with a pending invitation and surface the top recommendation by default', () => {
  const circles = [{ id: 'night-shift', name: 'Night Shift', members: ['you', 'alex'], wishlist: [413150, 1172620], joined: true }]
  const people = [
    { id: 'you', name: 'Sarah Chen', interests: ['Cozy worlds', 'Exploration'], wishlist: [413150], owned: [383870] },
    { id: 'alex', name: 'Alex', interests: ['Cozy worlds', 'Great stories'], wishlist: [1172620], owned: [413150] },
    { id: 'jamie', name: 'Jamie', interests: ['Cozy worlds', 'Exploration'], wishlist: [413150, 1172620], owned: [1055540] },
    { id: 'morgan', name: 'Morgan', interests: ['Cozy worlds', 'Great stories'], wishlist: [1172620, 1055540], owned: [972660] },
  ]
  const pendingInvites = [{ id: 'invite-1', circle: 'night-shift', person: 'jamie', status: 'pending' }]
  const suggestions = buildInviteSuggestions(circles, people, 'night-shift', pendingInvites)

  assert.ok(!suggestions.some((entry) => entry.personId === 'jamie'))
  assert.ok(suggestions.length >= 1)
  assert.equal(suggestions[0].personId, 'morgan')
})
