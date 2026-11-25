import test from 'node:test'
import assert from 'node:assert/strict'
import {
    buildComparisonSummary,
    buildFriendGameSignals,
    buildWishlistRecommendations,
    buildWishlistSummary,
    filterGames,
    gameCatalog,
    getGameById,
    getGamesByIds,
    resolveGameRecord,
    searchGames,
    sortGames,
    steam,
    validateGameCatalog,
} from '../src/data/games.ts'
import { socialPeople } from '../src/socialData.ts'
import { initialCircles } from '../src/socialData.ts'

test('steam helper builds canonical artwork URLs for every catalog game', () => {
    for (const game of gameCatalog) {
        const url = steam(game.id)
        assert.equal(url, `https://cdn.akamai.steamstatic.com/steam/apps/${game.id}/header.jpg`)
    }
})

test('every game ID referenced by social people resolves in the catalog', () => {
    const catalogIds = new Set(gameCatalog.map((g) => g.id))

    for (const person of socialPeople) {
        const allRefs = [
            ...person.wishlist,
            ...person.owned,
            ...person.playing,
            ...person.recent,
            ...person.favorites,
            ...person.recommends,
        ]
        for (const ref of allRefs) {
            assert.ok(catalogIds.has(ref), `Person ${person.name} references unknown game ID ${ref}`)
        }
    }
})

test('every circle wishlist game ID resolves in the catalog', () => {
    const catalogIds = new Set(gameCatalog.map((g) => g.id))

    for (const circle of initialCircles) {
        for (const gid of circle.wishlist) {
            assert.ok(catalogIds.has(gid), `Circle ${circle.name} wishlists unknown game ID ${gid}`)
        }
    }
})

test('game IDs remain stable across the catalog', () => {
    const ids = gameCatalog.map((g) => g.id)
    assert.deepEqual(ids, [...new Set(ids)], 'catalog contains duplicate game IDs')
    assert.ok(ids.includes(413150), 'Stardew Valley ID preserved')
    assert.ok(ids.includes(1055540), 'A Short Hike ID preserved')
    assert.ok(ids.includes(972660), 'Spiritfarer ID preserved')
    assert.ok(ids.includes(383870), 'Firewatch ID preserved')
    assert.ok(ids.includes(1145360), 'Hades ID preserved')
    assert.ok(ids.includes(1172620), 'Sea of Thieves ID preserved')
})

test('every catalog record resolves through getGameById and resolveGameRecord', () => {
    for (const game of gameCatalog) {
        assert.equal(getGameById(game.id)?.id, game.id)
        assert.equal(resolveGameRecord(game.id)?.id, game.id)
        assert.equal(resolveGameRecord(game, gameCatalog)?.id, game.id)
    }
})

test('missing game records are handled gracefully', () => {
    assert.equal(getGameById(999999), undefined)
    assert.equal(resolveGameRecord(999999), undefined)
    assert.deepEqual(getGamesByIds([999999, 888888], gameCatalog), [])
    assert.deepEqual(getGamesByIds([], gameCatalog), [])
})

test('getGamesByIds dedupes and filters invalid IDs', () => {
    const result = getGamesByIds([413150, 413150, 999999, 1055540, null, undefined], gameCatalog)
    assert.deepEqual(result.map((g) => g.id), [413150, 1055540])
    assert.equal(result.length, 2)
})

test('wishlist entries use canonical catalog IDs', () => {
    const summary = buildWishlistSummary([413150, 999999], socialPeople)
    const savedIds = summary.savedGames.map((g) => g.id)
    assert.ok(savedIds.every((id) => getGameById(id) !== undefined), 'all saved games resolve in catalog')
    assert.equal(savedIds.includes(999999), false, 'invalid ID excluded from wishlist summary')
})

test('comparison entries use canonical catalog IDs', () => {
    const selected = getGamesByIds([413150, 1172620, 999999], gameCatalog)
    const summary = buildComparisonSummary(selected, gameCatalog)
    assert.equal(summary.gameCount, 2)
    assert.ok(summary.platforms.length > 0)
    assert.ok(summary.tagSummary.length > 0)
})

test('no duplicate metadata definitions in feature components', () => {
    assert.deepEqual(validateGameCatalog(), [], 'catalog validation passes with no issues')

    for (const game of gameCatalog) {
        const byId = getGameById(game.id)
        assert.ok(byId, `game ${game.id} is not findable by ID`)
        assert.equal(byId.title, game.title)
        assert.equal(byId.price, game.price)
        assert.equal(byId.platform, game.platform)
        assert.equal(byId.desc, game.desc)
    }
})

test('search results only contain catalog games', () => {
    const results = searchGames('farm')
    for (const game of results) {
        assert.ok(getGameById(game.id) !== undefined, `search result ${game.id} not in catalog`)
    }
})

test('filter results only contain catalog games', () => {
    const results = filterGames({ moods: ['Relaxing'] })
    for (const game of results) {
        assert.ok(getGameById(game.id) !== undefined, `filter result ${game.id} not in catalog`)
    }
})

test('sort results preserve catalog identity', () => {
    const sorted = sortGames(gameCatalog, 'title')
    const originalIds = gameCatalog.map((g) => g.id)
    const sortedIds = sorted.map((g) => g.id)
    assert.deepEqual(sortedIds.sort(), originalIds.sort(), 'sort preserves all catalog IDs without duplication')
})

test('friend game signals use canonical IDs', () => {
    const signals = buildFriendGameSignals(413150, socialPeople, [413150])
    assert.equal(signals.gameId, 413150)
    assert.ok(getGameById(signals.gameId) !== undefined, 'signal game ID resolves in catalog')
    for (const friend of signals.friends) {
        assert.ok(socialPeople.some((p) => p.id === friend.id), `friend ${friend.id} exists in social data`)
    }
})

test('wishlist recommendations only suggest catalog games', () => {
    const recommendations = buildWishlistRecommendations([413150], socialPeople)
    for (const entry of recommendations) {
        assert.ok(getGameById(entry.game.id) !== undefined, `recommended game ${entry.game.id} not in catalog`)
        assert.notEqual(entry.game.id, 413150, 'already-saved game not re-recommended')
    }
})
