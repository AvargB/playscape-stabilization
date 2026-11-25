import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getGameById } from '../src/data/games.ts'
import {
    APP_STORAGE_KEY,
    LEGACY_SOCIAL_STORAGE_KEY,
    SOCIAL_STORAGE_KEY,
} from '../src/social.ts'
import {
    CART_KEYS,
    CHECKOUT_DISCLAIMER,
    CHECKOUT_KEYS,
    CHECKOUT_STORAGE_KEY,
    CHECKOUT_STORAGE_VERSION,
    createEmptyCheckoutState,
    createOwnershipApi,
    createPrototypeTransaction,
    getGameEdition,
    getOwnedGameIdsByPerson,
    getOwnedGames,
    getPrototypeActivity,
    getPrototypeOwnedEditions,
    getPrototypeOwnedGameIds,
    getPurchaseHistory,
    loadCheckoutState,
    ownsGame,
    recordPurchase,
    removeOwnership,
    respondToGift,
    resetPrototypeData,
    saveCheckoutState,
    validateCheckoutSession,
} from '../src/features/checkout/index.ts'
import { COMPARE_KEYS } from '../src/features/compare/types.ts'
import { REVIEW_KEYS } from '../src/features/reviews/types.ts'
import { clearPrototypeStorage } from '../src/prototypeReset.ts'

const srcRoot = new URL('../src/', import.meta.url)
const STARDEW = 413150
const FIREWATCH = 383870
const SEA_OF_THIEVES = 1172620
const HADES = 1145360
const SLAY = 646570
const FROSTPUNK = 323190
const SEEDED_IDS = [STARDEW, FIREWATCH, SEA_OF_THIEVES, HADES]
const NOW = '2026-11-24T12:00:00.000Z'

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
        restore: () => {
            if (previousWindow === undefined) delete globalThis.window
            else globalThis.window = previousWindow
        },
    }
}

function session(id, overrides = {}) {
    return {
        id: `ownership-${id}`,
        gameId: STARDEW,
        purchaseType: 'personal',
        recipientId: null,
        giftMessage: '',
        paymentMethod: 'prototype',
        ...overrides,
    }
}

function transaction(id, overrides = {}) {
    const result = createPrototypeTransaction(session(id, overrides.session ?? {}), {
        id: `txn-${id}`,
        now: NOW,
        ...(overrides.state ? { state: overrides.state } : {}),
    })
    assert.equal(result.ok, true, JSON.stringify(result.errors))
    return result.transaction
}

const sorted = (values) => [...values].sort((left, right) => left - right)

test('ownership helpers derive canonical ownership from seeded profile and ledger', () => {
    const purchase = transaction('stardew')
    const state = { transactions: [purchase], ownedGameIds: [STARDEW] }

    assert.equal(ownsGame(state, HADES), true)
    assert.equal(ownsGame(state, STARDEW), true)
    assert.equal(ownsGame(state, SLAY), false)
    assert.equal(ownsGame(state, Number.NaN), false)
    assert.equal(ownsGame(state, String(STARDEW)), false)

    const expected = sorted(SEEDED_IDS)
    assert.deepEqual(sorted(getPrototypeOwnedGameIds(state)), expected)
    assert.deepEqual(sorted(getOwnedGames(state).map((game) => game.id)), expected)

    const history = getPurchaseHistory(state)
    assert.equal(history.length, 1)
    assert.equal(history[0].id, `txn-stardew`)
    assert.equal(history[0].gameId, STARDEW)
    assert.equal(history[0].title, getGameById(STARDEW).title)
    assert.equal(history[0].price, getGameById(STARDEW).price)
    assert.equal(history[0].status, 'simulated-complete')
})

test('bound ownership API keeps its selectors in sync after every action', () => {
    let changes = 0
    const api = createOwnershipApi(createEmptyCheckoutState(), {
        onStateChange: () => {
            changes += 1
        },
    })
    const purchase = transaction('api', { session: { gameId: SLAY } })

    assert.equal(api.ownsGame(HADES), true)
    assert.equal(api.ownsGame(SLAY), false)

    api.recordPurchase(purchase)
    assert.equal(changes, 1)
    assert.equal(api.ownsGame(SLAY), true)
    assert.equal(api.getPurchaseHistory().length, 1)

    api.recordPurchase(purchase)
    assert.equal(changes, 1)

    api.removeOwnership(SLAY)
    assert.equal(api.ownsGame(SLAY), false)
    assert.equal(changes, 2)
    assert.equal(api.ownsGame(HADES), true)
})

test('duplicate personal purchases are rejected while distinct editions stay valid', () => {
    const standard = transaction('standard', { session: { gameId: SLAY } })
    const duplicate = createPrototypeTransaction(session('duplicate', { gameId: SLAY }), {
        state: { transactions: [standard], ownedGameIds: [SLAY] },
        now: NOW,
    })
    assert.equal(duplicate.ok, false)
    assert.ok(duplicate.errors.some((error) => /already in your prototype library/.test(error)))

    const seeded = createPrototypeTransaction(session('seeded', { gameId: STARDEW }), {
        state: createEmptyCheckoutState(),
        now: NOW,
    })
    assert.equal(seeded.ok, false)
    assert.ok(seeded.errors.some((error) => /already in your prototype library/.test(error)))

    const deluxe = transaction('deluxe', {
        session: { gameId: SLAY, edition: 'Deluxe Edition' },
    })
    const withBoth = recordPurchase(
        recordPurchase(createEmptyCheckoutState(), standard),
        deluxe,
    )
    assert.equal(withBoth.transactions.length, 2)
    assert.deepEqual(
        getPrototypeOwnedEditions(withBoth)
            .filter((entry) => entry.gameId === SLAY)
            .map((entry) => entry.edition)
            .sort(),
        [getGameEdition(getGameById(SLAY)), 'Deluxe Edition'].sort(),
    )

    const sameStandardAgain = recordPurchase(withBoth, {
        ...standard,
        id: 'txn-another-standard',
        sessionId: 'ownership-another-standard',
    })
    assert.equal(sameStandardAgain, withBoth)
})

test('gifts grant only the accepting recipient, never the sender', () => {
    const gift = transaction('gift', {
        session: { gameId: SLAY, purchaseType: 'gift', recipientId: 'jamie' },
    })
    const pending = { transactions: [gift], ownedGameIds: [] }

    assert.equal(ownsGame(pending, SLAY, 'you'), false)
    assert.equal(ownsGame(pending, SLAY, 'jamie'), false)

    const response = respondToGift(gift, 'accepted')
    assert.equal(response.ok, true)
    const purchase = transaction('gift-activity-purchase')
    const accepted = {
        transactions: [response.transaction, purchase],
        ownedGameIds: [STARDEW],
    }

    assert.equal(ownsGame(accepted, SLAY, 'you'), false)
    assert.equal(ownsGame(accepted, SLAY, 'jamie'), true)
    assert.equal(getPrototypeOwnedGameIds(accepted, 'you').includes(SLAY), false)
    assert.equal(getPrototypeOwnedGameIds(accepted, 'jamie').includes(SLAY), true)

    const byPerson = getOwnedGameIdsByPerson(accepted)
    assert.equal(byPerson.you.includes(SLAY), false)
    assert.equal(byPerson.jamie.includes(SLAY), true)

    const activity = getPrototypeActivity(accepted)
    assert.equal(new Set(activity.map((item) => item.id)).size, activity.length)
    assert.ok(activity.some((item) => item.category === 'Prototype gifts'))
    assert.ok(activity.some((item) => item.category === 'Acquired games'))
})

test('purchase records persist, restore, and never include sensitive payment details', () => {
    const purchase = transaction('persist')
    const gift = transaction('persist-gift', {
        session: { gameId: SLAY, purchaseType: 'gift', recipientId: 'jamie' },
    })
    const accepted = respondToGift(gift, 'accepted').transaction
    const state = {
        transactions: [purchase, accepted],
        ownedGameIds: [STARDEW],
    }
    const harness = installStorage()
    try {
        const missing = loadCheckoutState()
        assert.equal(missing.exists, false)
        assert.deepEqual(missing.state, createEmptyCheckoutState())
        assert.equal(harness.store.size, 0)

        assert.equal(saveCheckoutState(state), true)
        const raw = harness.store.get(CHECKOUT_STORAGE_KEY)
        assert.match(raw, /"title":"Stardew Valley"/)
        assert.doesNotMatch(raw, /cardNumber|cvv|expiry|billingAddress|email|phone/i)

        const loaded = loadCheckoutState()
        assert.equal(loaded.canPersist, true)
        assert.equal(loaded.state.transactions.length, 2)
        assert.deepEqual(
            loaded.state.transactions.map((entry) => entry.title),
            [getGameById(STARDEW).title, getGameById(SLAY).title],
        )
        assert.equal(ownsGame(loaded.state, STARDEW, 'you'), true)
        assert.equal(ownsGame(loaded.state, SLAY, 'you'), false)
        assert.equal(ownsGame(loaded.state, SLAY, 'jamie'), true)
        assert.equal(harness.store.get(CHECKOUT_STORAGE_KEY), raw)
    } finally {
        harness.restore()
    }
})

test('missing, malformed, and future checkout records are ignored without overwriting', () => {
    const valid = transaction('valid')
    const futureRaw = JSON.stringify({
        version: CHECKOUT_STORAGE_VERSION + 1,
        state: { transactions: [valid], ownedGameIds: [STARDEW] },
    })
    let harness = installStorage({ [CHECKOUT_STORAGE_KEY]: futureRaw })
    try {
        const future = loadCheckoutState()
        assert.deepEqual(future.state, createEmptyCheckoutState())
        assert.equal(future.canPersist, false)
        assert.equal(saveCheckoutState({ transactions: [valid], ownedGameIds: [STARDEW] }), false)
        assert.equal(harness.store.get(CHECKOUT_STORAGE_KEY), futureRaw)
    } finally {
        harness.restore()
    }

    const malformedRaw = JSON.stringify({
        version: CHECKOUT_STORAGE_VERSION,
        state: {
            transactions: [
                valid,
                {
                    id: '',
                    sessionId: '',
                    gameId: STARDEW,
                    senderId: 'you',
                    type: 'personal',
                    paymentMethod: 'prototype',
                    createdAt: NOW,
                    status: 'completed',
                    price: 14.99,
                    recipientId: null,
                },
            ],
            ownedGameIds: [STARDEW],
        },
    })
    harness = installStorage({ [CHECKOUT_STORAGE_KEY]: malformedRaw })
    try {
        const loaded = loadCheckoutState()
        assert.equal(loaded.state.transactions.length, 1)
        assert.equal(loaded.state.transactions[0].id, valid.id)
        assert.equal(loaded.ignored.length, 1)
        assert.equal(harness.store.get(CHECKOUT_STORAGE_KEY), malformedRaw)
    } finally {
        harness.restore()
    }
})

test('reset scopes clear only their own records and always require explicit calls', () => {
    const keys = [
        CHECKOUT_KEYS.storage,
        CART_KEYS.storage,
        APP_STORAGE_KEY,
        SOCIAL_STORAGE_KEY,
        LEGACY_SOCIAL_STORAGE_KEY,
        REVIEW_KEYS.storage,
        COMPARE_KEYS.storage,
    ]
    const seed = Object.fromEntries(
        keys.map((key) => [key, JSON.stringify({ version: 1, state: { marker: key } })]),
    )
    const harness = installStorage(seed)
    try {
        clearPrototypeStorage('purchases')
        assert.equal(harness.store.has(CHECKOUT_STORAGE_KEY), false)
        assert.equal(harness.store.has(CART_KEYS.storage), false)
        for (const key of keys.slice(2)) {
            assert.equal(harness.store.get(key), seed[key])
        }

        assert.deepEqual(resetPrototypeData('purchases'), createEmptyCheckoutState())
        clearPrototypeStorage('all')
        for (const key of keys) {
            assert.equal(harness.store.has(key), false)
        }
    } finally {
        harness.restore()
    }
})

test('protected prototype copy and reset wiring stay in place', () => {
    const app = readFileSync(new URL('PLAYSCAPE-cleaner.tsx', srcRoot), 'utf8')
    const checkout = readFileSync(
        new URL('features/checkout/CheckoutDialog.tsx', srcRoot),
        'utf8',
    )
    const profile = readFileSync(new URL('features/profiles/index.tsx', srcRoot), 'utf8')
    const footer = readFileSync(
        new URL('components/layout/GlobalFooter.tsx', srcRoot),
        'utf8',
    )
    const ownership = readFileSync(
        new URL('features/checkout/ownership.ts', srcRoot),
        'utf8',
    )
    const reset = readFileSync(new URL('prototypeReset.ts', srcRoot), 'utf8')

    assert.equal(
        CHECKOUT_DISCLAIMER,
        'PLAYSCAPE Prototype Checkout — No real payment will be processed.',
    )
    assert.match(footer, /PLAYSCAPE is a prototype\./)
    assert.match(app, /checkoutState\.getOwnedGameIds\(\)/)
    assert.match(app, /ownedIds=\{ownedIds\}/)
    assert.match(app, /getOwnedGameIdsByPerson\(\)/)
    assert.match(app, /ownedIdsByPerson,/)
    assert.match(app, /ownedIds=\{profileOwnedIds\}/)
    assert.match(app, /ownedSet\.has\(session\.gameId\)/)
    assert.match(app, /cart\.removeOwned/)
    assert.match(app, /onResetPrototypeData=\{resetPrototypeData\}/)
    assert.match(app, /social\.reset\(\)/)
    assert.match(app, /reviewState\.reset\(\)/)
    assert.match(checkout, /staleOwnedGames/)
    assert.match(checkout, /onViewLibrary/)
    assert.match(profile, /Reset Prototype Data/)
    assert.match(profile, /Confirm reset/)
    assert.doesNotMatch(ownership, /localStorage/)
    assert.doesNotMatch(reset, /localStorage/)
})
