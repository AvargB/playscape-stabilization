import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { gameCatalog } from '../src/data/games.ts'
import {
    APP_STORAGE_KEY,
    LEGACY_SOCIAL_STORAGE_KEY,
    SOCIAL_STORAGE_KEY,
    SOCIAL_STORAGE_VERSION,
    loadAppState,
    loadSocialState,
    migrateSocialState,
    normalizeSocialState,
    resolveActivity,
    saveAppState,
    saveSocialState,
} from '../src/social.ts'
import {
    buildSocialGraph,
    createEmptySocialState,
    directFriendIds,
    initialActivity,
    initialCircles,
    socialPeople,
} from '../src/socialData.ts'
import {
    applyInviteDecision,
    createCircleInvite,
} from '../src/socialState.ts'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))

function installStorage(initial = {}) {
    const previousWindow = globalThis.window
    const store = new Map(Object.entries(initial))
    globalThis.window = {
        localStorage: {
            getItem: (key) => (store.has(key) ? store.get(key) : null),
            setItem: (key, value) => store.set(key, String(value)),
            removeItem: (key) => store.delete(key),
        },
    }
    return {
        store,
        snapshot: () => Object.fromEntries(store),
        restore: () => {
            if (previousWindow === undefined) delete globalThis.window
            else globalThis.window = previousWindow
        },
    }
}

function withStorage(initial, run) {
    const storage = installStorage(initial)
    try {
        return run(storage)
    } finally {
        storage.restore()
    }
}

test('social state is centralized in social.ts and legacy keys stay untouched', () => {
    const legacy = {
        circles: initialCircles.map((circle) => ({ ...circle, members: [...circle.members] })),
        invites: [{ id: 'legacy-invite', circle: 'scenic', person: 'alex', status: 'pending' }],
        privacy: { profile: 'Public', wishlist: 'Friends only', activity: 'Friends only' },
    }

    withStorage({ [LEGACY_SOCIAL_STORAGE_KEY]: JSON.stringify(legacy) }, (storage) => {
        const first = loadSocialState()
        assert.equal(first.source, 'legacy')
        assert.equal(first.shouldPersist, true)
        assert.equal(first.state.privacy.profile, 'Public')
        assert.equal(first.state.invites.length, 1)
        assert.ok(saveSocialState(first.state))

        const stored = JSON.parse(storage.store.get(SOCIAL_STORAGE_KEY))
        assert.equal(stored.version, SOCIAL_STORAGE_VERSION)
        assert.equal(stored.state.invites[0].id, 'legacy-invite')
        assert.equal(
            storage.store.get(LEGACY_SOCIAL_STORAGE_KEY),
            JSON.stringify(legacy),
            'migration must not delete or rewrite the legacy key'
        )

        const second = loadSocialState()
        assert.equal(second.source, 'current')
        assert.equal(second.shouldPersist, false)
        assert.equal(second.state.invites[0].id, 'legacy-invite')
    })
})

test('versioned migration repairs legacy shapes and refuses unknown future versions', () => {
    const legacy = {
        circles: [{
            id: 'scenic',
            name: 'The Scenic Route',
            members: ['jamie'],
            joined: true,
            wishlist: [1055540],
        }],
        pendingInvites: [{ id: 'invite-old', circle: 'scenic', person: 'alex', status: 'pending' }],
    }
    const migrated = migrateSocialState(2, legacy)

    assert.equal(migrated.invites.length, 1)
    assert.equal(migrated.invites[0].id, 'invite-old')
    const scenic = migrated.circles.find((circle) => circle.id === 'scenic')
    assert.ok(scenic.members.includes('you'))
    assert.equal(scenic.joined, true)
    assert.deepEqual(scenic.wishlist, [1055540])

    const future = migrateSocialState(SOCIAL_STORAGE_VERSION + 10, {
        circles: [],
        privacy: { profile: 'Private' },
    })
    assert.deepEqual(future, createEmptySocialState())
})

test('malformed storage is ignored without overwriting valid records', () => {
    withStorage({ [SOCIAL_STORAGE_KEY]: '{not-json' }, (storage) => {
        const seed = loadSocialState()
        assert.equal(seed.source, 'seed')
        assert.equal(seed.shouldPersist, true)
        assert.deepEqual(seed.state.privacy, createEmptySocialState().privacy)
        assert.ok(saveSocialState(seed.state))
        assert.equal(JSON.parse(storage.store.get(SOCIAL_STORAGE_KEY)).version, SOCIAL_STORAGE_VERSION)
    })

    withStorage({
        [SOCIAL_STORAGE_KEY]: JSON.stringify({ version: 99, state: { privacy: { profile: 'Private' } } }),
        [LEGACY_SOCIAL_STORAGE_KEY]: JSON.stringify({ privacy: { profile: 'Public' } }),
    }, (storage) => {
        const blocked = loadSocialState()
        assert.equal(blocked.canPersist, false)
        assert.equal(blocked.shouldPersist, false)
        assert.equal(blocked.source, 'current')
        assert.equal(storage.store.get(SOCIAL_STORAGE_KEY),
            JSON.stringify({ version: 99, state: { privacy: { profile: 'Private' } } }))
    })
})

test('normalization drops invalid references and preserves sample identities', () => {
    const seed = createEmptySocialState()
    const normalized = normalizeSocialState({
        ...seed,
        circles: [{
            ...initialCircles[1],
            name: 'Renamed by stale storage',
            members: ['you', 'jamie', 'ghost'],
            wishlist: [1055540, 999999],
        }],
        activity: [{ ...initialActivity[0], id: 'invalid-activity', game: 999999 }],
        sent: [
            { id: 'valid', sender: 'you', recipient: 'jamie', game: 413150, text: '', createdAt: '' },
            { id: 'bad-game', sender: 'you', recipient: 'jamie', game: 999999, text: '', createdAt: '' },
            { id: 'bad-person', sender: 'you', recipient: 'ghost', game: 413150, text: '', createdAt: '' },
        ],
        shares: [
            { id: 'share', sender: 'you', recipient: 'circle:afterhours', games: [413150, 999999], createdAt: '' },
        ],
        invites: [
            { id: 'bad-circle', circle: 'ghost', person: 'jamie', status: 'pending' },
            { id: 'bad-person', circle: 'scenic', person: 'ghost', status: 'pending' },
        ],
    })

    assert.deepEqual(normalized.sent.map((item) => item.id), ['valid'])
    assert.deepEqual(normalized.shares[0].games, [413150])
    assert.deepEqual(normalized.invites, [])
    assert.equal(normalized.activity.some((item) => item.id === 'invalid-activity'), false)
    const scenic = normalized.circles.find((circle) => circle.id === 'scenic')
    assert.equal(scenic.name, initialCircles[1].name)
    assert.equal(scenic.members.includes('ghost'), false)
    assert.deepEqual(scenic.wishlist, [1055540])
    assert.deepEqual(socialPeople.map((person) => person.id), [
        'you', 'jamie', 'alex', 'morgan', 'casey', 'riley', 'sam', 'devon',
    ])
    assert.deepEqual(initialActivity.map((item) => item.id), ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'])
    assert.deepEqual(resolveActivity(normalized).map((item) => item.id),
        initialActivity.map((item) => item.id))
})

test('stale stored circles cannot remove Casey from the shared social graph', () => {
    const stale = createEmptySocialState()
    stale.circles = stale.circles.map((circle) =>
        circle.id === 'tactics'
            ? { ...circle, members: ['you'], wishlist: [...circle.wishlist] }
            : circle
    )

    const normalized = normalizeSocialState(stale)
    const tactics = normalized.circles.find((circle) => circle.id === 'tactics')
    assert.ok(tactics.members.includes('you'))
    assert.ok(tactics.members.includes('casey'), 'seeded circle relationships must be restored')

    const graph = buildSocialGraph({ circles: normalized.circles })
    assert.ok(graph.nodes.some((node) => node.id === 'casey' && node.type === 'Friend'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'casey' && to === 'tactics' && label === 'Member'))
})

test('your own circle membership choices still survive normalization', () => {
    const state = createEmptySocialState()
    state.circles = state.circles.map((circle) =>
        circle.id === 'afterhours'
            ? { ...circle, members: circle.members.filter((id) => id !== 'you') }
            : circle
    )

    const afterhours = normalizeSocialState(state).circles.find((circle) => circle.id === 'afterhours')
    assert.equal(afterhours.joined, false)
    assert.equal(afterhours.members.includes('you'), false)
    assert.ok(afterhours.members.includes('jamie'))
    assert.ok(afterhours.members.includes('alex'))
})

test('invitations remain pending until accepted, then membership and joined stay consistent', () => {
    const seed = createEmptySocialState()
    const invited = createCircleInvite(seed.invites, seed.circles, 'scenic', 'alex', 'invite-1')
    assert.equal(invited.result, 'added')
    assert.equal(invited.invites.length, 1)
    assert.equal(seed.circles.find((circle) => circle.id === 'scenic').members.includes('alex'), false)

    const accepted = applyInviteDecision(invited.invites, seed.circles, 'invite-1', 'accepted')
    const normalized = normalizeSocialState({ ...seed, ...accepted })
    const scenic = normalized.circles.find((circle) => circle.id === 'scenic')
    assert.ok(scenic.members.includes('alex'))
    assert.equal(scenic.joined, false, 'accepting for Alex must not mark you as a member')
    assert.equal(normalized.invites.find((invite) => invite.id === 'invite-1').status, 'accepted')

    const duplicate = normalizeSocialState({
        ...seed,
        circles: accepted.circles,
        invites: [{ id: 'invite-2', circle: 'scenic', person: 'alex', status: 'pending' }],
    })
    assert.equal(duplicate.invites.some((invite) => invite.id === 'invite-2'), false)
})

test('The Web resolves recommendations and wishlist shares from the shared graph', () => {
    const validGame = gameCatalog[0]
    const graph = buildSocialGraph({
        recommendations: [
            {
                id: 'rec-valid', sender: 'you', recipient: 'circle:afterhours',
                game: validGame.id, text: '', createdAt: '',
            },
            {
                id: 'rec-invalid', sender: 'you', recipient: 'jamie',
                game: 999999, text: '', createdAt: '',
            },
        ],
        shares: [{
            id: 'share-valid', sender: 'you', recipient: 'jamie',
            games: [validGame.id, 999999], createdAt: '',
        }],
    })

    const gameNode = graph.nodes.find((node) => node.id === String(validGame.id))
    assert.equal(gameNode.name, validGame.title)
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === String(validGame.id) && label === 'Recommendation'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === String(validGame.id) && to === 'afterhours' && label === 'Recommended to'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === String(validGame.id) && label === 'Shared wishlist'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === String(validGame.id) && to === 'jamie' && label === 'Shared with'))
    assert.equal(graph.relationships.some(([, to]) => to === '999999'), false)
})

test('every direct friend is connected to all wishlisted and owned games', () => {
    const graph = buildSocialGraph()

    for (const friendId of directFriendIds) {
        const person = socialPeople.find((entry) => entry.id === friendId)
        assert.ok(person, `missing canonical person ${friendId}`)

        for (const gameId of person.wishlist) {
            assert.ok(graph.nodes.some((node) => node.id === String(gameId) && node.type === 'Game'))
            assert.ok(graph.relationships.some(([from, to, label]) =>
                from === friendId && to === String(gameId) && label === 'Wishlist'),
                `${friendId} must link to wishlisted game ${gameId}`)
        }

        for (const gameId of person.owned) {
            assert.ok(graph.nodes.some((node) => node.id === String(gameId) && node.type === 'Game'))
            assert.ok(graph.relationships.some(([from, to, label]) =>
                from === friendId && to === String(gameId) && label === 'Owned'),
                `${friendId} must link to owned game ${gameId}`)
        }
    }

    const casey = socialPeople.find((entry) => entry.id === 'casey')
    assert.deepEqual(casey.wishlist, [646570, 219760, 1086940])
    assert.deepEqual(casey.owned, [323190, 261550])
})

test('app preferences keep their raw shape and validate saved game IDs on load', () => {
    withStorage({}, (storage) => {
        assert.ok(saveAppState({ saved: [gameCatalog[0].id, 999999], atmos: 'Winter', auto: true }))
        assert.deepEqual(JSON.parse(storage.store.get(APP_STORAGE_KEY)), {
            saved: [gameCatalog[0].id, 999999],
            atmos: 'Winter',
            auto: true,
        })
        assert.deepEqual(loadAppState(), {
            saved: [gameCatalog[0].id],
            atmos: 'Winter',
            auto: true,
        })
    })
})

test('no feature module writes social storage keys directly', () => {
    const files = []
    const walk = (directory) => {
        for (const entry of readdirSync(directory)) {
            const full = path.join(directory, entry)
            if (statSync(full).isDirectory()) walk(full)
            else if (/\.(ts|tsx)$/.test(entry)) files.push(full)
        }
    }
    walk(srcRoot)

    const owners = new Set([path.join(srcRoot, 'social.ts')])
    for (const file of files.filter((entry) => !owners.has(entry))) {
        const source = readFileSync(file, 'utf8')
        assert.doesNotMatch(source, /playscape-v1|playscape-community-v2|playscape-social-v1/,
            `${path.relative(srcRoot, file)} must use the shared persistence module`)
        assert.doesNotMatch(source, /localStorage\.(setItem|getItem|removeItem)/,
            `${path.relative(srcRoot, file)} must not access localStorage directly`)
    }

    const app = readFileSync(path.join(srcRoot, 'PLAYSCAPE-cleaner.tsx'), 'utf8')
    assert.match(app, /useSocialState\(/)
    assert.doesNotMatch(app, /function useCommunityState/)
    const web = readFileSync(path.join(srcRoot, 'features/the-web/index.tsx'), 'utf8')
    assert.match(web, /community\.graph/)
})

/* ------------------------------------------------------------------ */
/* buildSocialGraph tests                                             */
/* ------------------------------------------------------------------ */

const makePerson = (overrides = {}) => ({
    id: overrides.id ?? 'person-1',
    name: overrides.name ?? 'Person One',
    handle: '@person1',
    initials: 'P1',
    bio: 'A test person.',
    interests: overrides.interests ?? ['Exploration'],
    owned: overrides.owned ?? [],
    playing: overrides.playing ?? [],
    recent: overrides.recent ?? [],
    favorites: overrides.favorites ?? [],
    completed: overrides.completed ?? [],
    recommends: overrides.recommends ?? [],
    wishlist: overrides.wishlist ?? [],
    privacy: 'Public',
})

function countEdgesByLabel(graph, label) {
    return graph.relationships.filter(([, , l]) => l === label).length
}

test('buildSocialGraph: user with no friends produces only the You node and no friend edges', () => {
    const graph = buildSocialGraph({
        people: [{ id: 'you', name: 'You', handle: '@you', initials: 'Y',
            bio: '', interests: [], owned: [], playing: [], recent: [],
            favorites: [], completed: [], recommends: [], wishlist: [], privacy: 'Public' }],
        circles: [],
        friendships: [],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    const youNode = graph.nodes.find((n) => n.id === 'you')
    assert.ok(youNode)
    assert.equal(youNode?.type, 'You')
    assert.equal(graph.nodes.length, 1)
    assert.equal(graph.relationships.length, 0)
})

test('buildSocialGraph: user with many friends includes all direct friends and friend-of-friend nodes', () => {
    const friends = [
        makePerson({ id: 'f1', name: 'Friend 1', owns: [], playing: [413150] }),
        makePerson({ id: 'f2', name: 'Friend 2', owns: [], playing: [1055540] }),
        makePerson({ id: 'f3', name: 'Friend 3', owns: [], playing: [972660] }),
    ]
    const friendOfFriend = makePerson({ id: 'fof1', name: 'Friend of Friend 1' })

    const graph = buildSocialGraph({
        people: [{ id: 'you', name: 'You', handle: '@you', initials: 'Y',
            bio: '', interests: [], owned: [], playing: [], recent: [],
            favorites: [], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            ...friends, friendOfFriend],
        circles: [],
        friendships: [
            { id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' },
            { id: 'fr-you-f2', members: ['you', 'f2'], status: 'friends' },
            { id: 'fr-you-f3', members: ['you', 'f3'], status: 'friends' },
            { id: 'fr-f1-fof1', members: ['f1', 'fof1'], status: 'friends' },
        ],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    const friendIds = graph.nodes.filter((n) => n.type === 'Friend').map((n) => n.id)
    assert.ok(friendIds.includes('f1'))
    assert.ok(friendIds.includes('f2'))
    assert.ok(friendIds.includes('f3'))
    assert.ok(friendIds.includes('fof1'))
    assert.equal(countEdgesByLabel(graph, 'Friends'), 4)
})

test('buildSocialGraph: shared games create edges between friends and the same game node', () => {
    const sharedGameId = 413150
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: [], owned: [], playing: [], recent: [],
                favorites: [sharedGameId], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Friend 1', favorites: [sharedGameId] }),
            makePerson({ id: 'f2', name: 'Friend 2', playing: [sharedGameId] }),
        ],
        circles: [],
        friendships: [
            { id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' },
            { id: 'fr-you-f2', members: ['you', 'f2'], status: 'friends' },
        ],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    const gameNode = graph.nodes.find((n) => n.id === String(sharedGameId))
    assert.ok(gameNode)
    assert.equal(gameNode?.type, 'Game')
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === String(sharedGameId) && label === 'Favorite'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'f1' && to === String(sharedGameId) && label === 'Favorite'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'f2' && to === String(sharedGameId) && label === 'Currently playing'))
})

test('buildSocialGraph: friends with no shared games still appear connected only through friendship', () => {
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: [], owned: [], playing: [], recent: [],
                favorites: [], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Friend 1', favorites: [413150] }),
            makePerson({ id: 'f2', name: 'Friend 2', favorites: [1055540] }),
        ],
        circles: [],
        friendships: [
            { id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' },
            { id: 'fr-you-f2', members: ['you', 'f2'], status: 'friends' },
            { id: 'fr-f1-f2', members: ['f1', 'f2'], status: 'friends' },
        ],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === 'f1' && label === 'Friends'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === 'f2' && label === 'Friends'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'f1' && to === 'f2' && label === 'Friends'))
    assert.equal(graph.nodes.filter((n) => n.type === 'Game').length, 2)
})

test('buildSocialGraph: multiple overlapping relationships between same nodes do not duplicate edges', () => {
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: ['Exploration'], owned: [413150], playing: [413150],
                recent: [], favorites: [413150], completed: [], recommends: [413150], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Friend 1', interests: ['Exploration'],
                favorites: [413150], playing: [413150], recommends: [413150] }),
        ],
        circles: [],
        friendships: [
            { id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' },
            { id: 'fr-you-f1-dup', members: ['you', 'f1'], status: 'friends' },
        ],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    const friendsEdges = graph.relationships.filter(([from, to, label]) =>
        label === 'Friends' && from === 'you' && to === 'f1')
    assert.equal(friendsEdges.length, 1)

    const youToGameEdges = graph.relationships.filter(([from, to]) =>
        from === 'you' && to === '413150')
    assert.ok(youToGameEdges.length >= 1)
})

test('buildSocialGraph: missing references are dropped gracefully', () => {
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: [], owned: [], playing: [], recent: [],
                favorites: [], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Friend 1', favorites: [999999] }),
        ],
        circles: [],
        friendships: [
            { id: 'fr-you-ghost', members: ['you', 'ghost'], status: 'friends' },
            { id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' },
        ],
        recommendations: [
            { id: 'rec-bad', sender: 'you', recipient: 'ghost', game: 999999,
              text: '', createdAt: '' },
            { id: 'rec-valid', sender: 'you', recipient: 'f1', game: 413150,
              text: '', createdAt: '' },
        ],
        shares: [
            { id: 'share-bad', sender: 'ghost', recipient: 'f1', games: [413150],
              createdAt: '' },
            { id: 'share-valid', sender: 'you', recipient: 'f1', games: [1055540],
              createdAt: '' },
        ],
        games: gameCatalog,
    })

    assert.equal(graph.nodes.find((n) => n.id === 'ghost'), undefined)
    assert.equal(graph.relationships.some(([from, to]) => from === 'ghost' || to === 'ghost'), false)
    assert.equal(graph.nodes.find((n) => n.id === '999999'), undefined)
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === 'f1' && label === 'Friends'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === '413150' && label === 'Recommendation'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === '413150' && to === 'f1' && label === 'Recommended to'))
})

test('buildSocialGraph: friends of friends appear through friendship chains', () => {
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: [], owned: [], playing: [], recent: [],
                favorites: [], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Direct Friend' }),
            makePerson({ id: 'fof1', name: 'Friend of Friend' }),
            makePerson({ id: 'unrelated', name: 'Unrelated Person' }),
        ],
        circles: [],
        friendships: [
            { id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' },
            { id: 'fr-f1-fof1', members: ['f1', 'fof1'], status: 'friends' },
        ],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    const friendIds = graph.nodes.filter((n) => n.type === 'Friend').map((n) => n.id)
    assert.ok(friendIds.includes('f1'))
    assert.ok(friendIds.includes('fof1'))
    assert.ok(!friendIds.includes('unrelated'))
})

test('buildSocialGraph: Gaming Circles create member and shared-wishlist edges', () => {
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: [], owned: [], playing: [], recent: [],
                favorites: [], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Friend 1' }),
        ],
        circles: [{
            id: 'circle-1',
            name: 'Test Circle',
            tag: 'A test circle',
            desc: 'A circle for testing.',
            members: ['you', 'f1'],
            wishlist: [413150],
            playing: [],
            topic: 'Testing',
            joined: true,
        }],
        friendships: [{ id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' }],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    assert.ok(graph.nodes.some((n) => n.id === 'circle-1' && n.type === 'Circle'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === 'circle-1' && label === 'Member'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'f1' && to === 'circle-1' && label === 'Member'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'circle-1' && to === '413150' && label === 'Shared wishlist'))
})

test('buildSocialGraph: canonical game IDs are used for all game nodes', () => {
    const graph = buildSocialGraph({
        people: [
            { id: 'you', name: 'You', handle: '@you', initials: 'Y',
                bio: '', interests: [], owned: [], playing: [], recent: [],
                favorites: [413150], completed: [], recommends: [], wishlist: [], privacy: 'Public' },
            makePerson({ id: 'f1', name: 'Friend 1', favorites: [413150] }),
        ],
        circles: [],
        friendships: [{ id: 'fr-you-f1', members: ['you', 'f1'], status: 'friends' }],
        recommendations: [],
        shares: [],
        games: gameCatalog,
    })

    const gameNode = graph.nodes.find((n) => n.id === '413150')
    assert.ok(gameNode)
    assert.equal(gameNode?.type, 'Game')
    assert.equal(gameNode?.game, 413150)
    assert.equal(gameNode?.name, 'Stardew Valley')
})
