import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { gameCatalog, getGameById } from '../src/data/games.ts'
import { APP_STORAGE_KEY, SOCIAL_STORAGE_KEY } from '../src/social.ts'
import { directFriendIds, initialCircles, socialPeople } from '../src/socialData.ts'
import GameDetails from '../src/features/game-details/index.tsx'
import Profiles from '../src/features/profiles/index.tsx'
import { COMPARE_STORAGE_KEY } from '../src/features/compare/storage.ts'
import { REVIEW_STORAGE_KEY } from '../src/features/reviews/storage.ts'
import {
    CHECKOUT_DISCLAIMER,
    CHECKOUT_STORAGE_KEY,
    CHECKOUT_STORAGE_VERSION,
    CheckoutDialog,
    GiftHistory,
    buildCheckoutSummary,
    createEmptyCheckoutState,
    createPrototypeTransaction,
    formatPrototypePrice,
    getOwnedGameIds,
    getReceivedGifts,
    loadCheckoutState,
    normalizePersistedCheckout,
    respondToGift,
    saveCheckoutState,
    validateCheckoutSession,
} from '../src/features/checkout/index.ts'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))
const STARDEW = 413150
const SHORT_HIKE = 1055540
const MISSING = 999999
const NOW = '2026-11-24T12:00:00.000Z'

function checkoutSession(overrides = {}) {
    return {
        id: `session-${overrides.id ?? 'baseline'}`,
        gameId: STARDEW,
        purchaseType: 'personal',
        recipientId: null,
        giftMessage: '',
        paymentMethod: 'prototype',
        ...overrides,
    }
}

function createTransaction(overrides = {}) {
    const result = createPrototypeTransaction(
        checkoutSession(overrides.session ?? {}),
        { id: overrides.id ?? `txn-${(overrides.session ?? {}).id ?? 'gift'}`, now: NOW },
    )
    assert.equal(result.ok, true)
    return result.transaction
}

function renderDialog(options = {}) {
    return renderToStaticMarkup(
        React.createElement(CheckoutDialog, {
            game: options.game ?? getGameById(STARDEW),
            sessionId: options.sessionId ?? 'session-render',
            initialPurchaseType: options.purchaseType ?? 'personal',
            initialStep: options.step ?? 'review',
            initialCompleted: options.completed ?? null,
            friends: options.friends ?? socialPeople,
            currentUser: socialPeople[0],
            renderAvatar: () => null,
            onClose() {},
            onComplete() {
                return { ok: false, errors: [] }
            },
            onViewProfile() {},
        }),
    )
}

const baseSocialState = {
    circles: initialCircles,
    reactions: [],
    comments: {},
    savedRecs: [],
    privacy: { profile: 'Public', wishlist: 'Public', activity: 'Friends only' },
    sent: [],
    shares: [],
    activity: [],
    discussions: {},
    invites: [],
    circleVotes: [],
    circlePlans: [],
    circleGroupRecommendations: [],
    circleGoals: [],
}

function renderProfileGifts({ id = 'jamie', state = createEmptyCheckoutState() } = {}) {
    const own = id === 'you'
    return renderToStaticMarkup(
        React.createElement(Profiles, {
            id,
            initialTab: own ? 'Gifts & Orders' : 'Received Gifts',
            social: {
                activity: [],
                state: baseSocialState,
                saved: [],
                go() {},
                setDialog() {},
            },
            renderAvatar: () => null,
            renderSmallGame: () => null,
            renderActivityCard: () => null,
            checkout: { state, onRespondToGift() { return { ok: false, errors: [] } } },
        }),
    )
}

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

test('game details expose contextual personal and gift checkout entry points', () => {
    const html = renderToStaticMarkup(
        React.createElement(GameDetails, {
            games: gameCatalog,
            saved: [],
            toggle() {},
            openGame() {},
            go() {},
            setDialog() {},
            activity: [],
            compareIds: [],
            toggleCompare() {},
            detail: STARDEW,
            setDetail() {},
            reviews: [],
            onSubmitReview() {
                return { ok: false, errors: [] }
            },
            onCheckout() {},
        }),
    )

    assert.match(html, /Purchase in prototype/)
    assert.match(html, /Gift to a friend/)
    assert.match(html, /Checkout is simulated; no purchase is made/)
})

test('shared cards, Compare, and Profile keep checkout entry points contextual', () => {
    const app = readFileSync(path.join(srcRoot, 'PLAYSCAPE-cleaner.tsx'), 'utf8')
    const summary = readFileSync(
        path.join(srcRoot, 'features/compare/ComparisonSummary.tsx'),
        'utf8',
    )
    const profiles = readFileSync(path.join(srcRoot, 'features/profiles/index.tsx'), 'utf8')

    assert.match(app, /className="web-secondary card-checkout"/)
    assert.match(app, /onCheckout=\{openCheckout\}/)
    assert.match(app, /<CheckoutDialog/)
    assert.match(summary, /Simulated checkout/)
    assert.doesNotMatch(summary, /Checkout and\s+availability are not handled here/)
    assert.match(profiles, /Received Gifts/)
    assert.match(profiles, /GiftHistory/)
})

test('compact review uses canonical catalog metadata without price overload', () => {
    const celeste = 504230
    const game = getGameById(celeste)
    const html = renderDialog({ game })
    const transaction = createTransaction({ session: { gameId: celeste } })
    const receipt = renderDialog({ game, step: 'complete', completed: transaction })

    assert.match(html, /aria-label="PLAYSCAPE prototype checkout"/)
    assert.match(html, new RegExp(game.title))
    assert.match(html, /Maddy Makes Games/)
    assert.match(html, /Matt Makes Games/)
    assert.doesNotMatch(html, /Simulated subtotal/)
    assert.doesNotMatch(html, /Simulated total/)
    assert.doesNotMatch(html, /sample catalog price/)
    assert.doesNotMatch(html, /Prices are shown on the receipt/)
    assert.match(html, new RegExp(CHECKOUT_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(receipt, /\$14\.99 USD \(sample catalog price\)/)
})

test('missing or invalid prices stay unavailable on the receipt', () => {
    const game = { ...getGameById(STARDEW), price: Number.NaN }
    const summary = buildCheckoutSummary(game)
    assert.equal(summary.price, null)
    assert.equal(summary.total, null)
    assert.equal(summary.priceLabel, 'Price unavailable in prototype')
    assert.doesNotMatch(renderDialog({ game }), /Price unavailable in prototype/)
    const result = createPrototypeTransaction(
        checkoutSession({ gameId: STARDEW }),
        { games: [game], id: 'txn-no-price', now: NOW },
    )
    assert.equal(result.ok, true)
    assert.match(
        renderDialog({ game, step: 'complete', completed: result.transaction }),
        /Price unavailable in prototype/g,
    )
    assert.equal(formatPrototypePrice(null), 'Price unavailable in prototype')
})

test('checkout can be canceled without completing a transaction', () => {
    const html = renderDialog()
    assert.match(html, /aria-label="Cancel checkout"/)
    assert.match(html, /Cancel checkout<\/button>/)
    assert.doesNotMatch(html, /Confirm simulated purchase/)
})

test('purchase type can be switched between personal purchase and gift', () => {
    const personal = renderDialog()
    assert.match(personal, /Purchase for Myself/)
    assert.match(personal, /Gift to a Friend/)
    assert.doesNotMatch(personal, /Personal purchase selected/)

    const gift = renderDialog({ purchaseType: 'gift' })
    assert.match(gift, /class="chk-choice-button selected" aria-pressed="true">Gift to a Friend/)
    assert.match(gift, /aria-label="Gift message"/)
})

test('gift details only expose searchable existing friends', () => {
    const html = renderDialog({ purchaseType: 'gift', step: 'details' })
    assert.match(html, /aria-label="Search friends"/)
    assert.match(html, /aria-label="Existing PLAYSCAPE friends"/)
    for (const id of directFriendIds) {
        const person = socialPeople.find((entry) => entry.id === id)
        assert.match(html, new RegExp(person.handle.replace('@', '@')))
    }
    assert.doesNotMatch(html, /aria-label="Recipient username"/)
})

test('gift messages and immediate delivery are explicit without scheduling complexity', () => {
    const html = renderDialog({ purchaseType: 'gift', step: 'details' })
    assert.match(html, /aria-label="Gift message"/)
    assert.match(html, /0\/500 characters/)
    assert.match(html, /Choose a friend/)
    assert.match(html, /Immediate, prototype only\. No email or delivery\./)
    assert.doesNotMatch(html, /Schedule/)
})

test('review has no payment chooser and the fake screen collects no real credentials', () => {
    const html = renderDialog()
    const payment = renderDialog({ step: 'payment' })
    const source = readFileSync(
        path.join(srcRoot, 'features/checkout/CheckoutDialog.tsx'),
        'utf8',
    )
    assert.doesNotMatch(html, /Credit\/Debit Card/)
    assert.doesNotMatch(html, /Digital Wallet/)
    assert.doesNotMatch(html, /Simulated payment method/)
    assert.doesNotMatch(html, /Payment is fixed to a local prototype record/)
    assert.doesNotMatch(source, /PAYMENT_METHODS/)
    assert.match(source, /paymentMethod: "prototype"/)
    assert.doesNotMatch(html, /<input[^>]*type="(?:number|text|password)"/i)
    assert.doesNotMatch(payment, /name="(?:card|cvv|billing)/i)
    assert.doesNotMatch(payment, /type="password"/)
    assert.doesNotMatch(source, /localStorage/)
    assert.doesNotMatch(source, /fetch\(/)
    assert.match(payment, /Fake number/)
    assert.match(payment, /Nothing is saved, sent, or used for a real payment\./)
})

test('review advances to fake payment without an acknowledgement checkbox', () => {
    const html = renderDialog()
    const payment = renderDialog({ step: 'payment' })
    assert.doesNotMatch(html, /Final confirmation/)
    assert.doesNotMatch(html, /I understand this is a prototype and no real transaction will occur/)
    assert.doesNotMatch(html, /type="checkbox"/)
    assert.doesNotMatch(html, /disabled=""/)
    assert.match(html, /Continue to payment/)
    assert.doesNotMatch(html, /Create prototype record/)
    assert.match(payment, /Create prototype record/)
    assert.match(payment, /Back<\/button>/)
    assert.doesNotMatch(html, /Review final order/)
})

test('personal checkout creates a simulated purchase and local library overlay', () => {
    const result = createPrototypeTransaction(
        checkoutSession({ id: 'personal-1' }),
        { now: NOW },
    )
    assert.equal(result.ok, true)
    const transaction = result.transaction
    assert.equal(transaction.type, 'personal')
    assert.equal(transaction.senderId, 'you')
    assert.equal(transaction.recipientId, null)
    assert.equal(transaction.giftStatus, null)
    assert.equal(transaction.status, 'simulated-complete')
    assert.equal(transaction.price, 14.99)

    const state = { transactions: [transaction], ownedGameIds: [] }
    assert.deepEqual(getOwnedGameIds(state), [STARDEW])
})

test('gift checkout creates a canonical gift record for an existing friend only', () => {
    const result = createPrototypeTransaction(
        checkoutSession({
            id: 'gift-1',
            purchaseType: 'gift',
            recipientId: 'jamie',
            giftMessage: 'Hope you love this one.',
        }),
        { now: NOW },
    )
    assert.equal(result.ok, true)
    const transaction = result.transaction
    assert.equal(transaction.type, 'gift')
    assert.equal(transaction.recipientId, 'jamie')
    assert.equal(transaction.giftMessage, 'Hope you love this one.')
    assert.equal(transaction.giftStatus, 'received')
    assert.equal(transaction.delivery, 'immediate')
    assert.equal(transaction.status, 'simulated-complete')

    const invalid = validateCheckoutSession(
        checkoutSession({ id: 'bad', purchaseType: 'gift', recipientId: 'stranger' }),
    )
    assert.ok(invalid.some((error) => /existing PLAYSCAPE friends/.test(error)))
    assert.ok(
        validateCheckoutSession(
            checkoutSession({ id: 'missing', gameId: MISSING }),
        ).some((error) => /no longer available/.test(error)),
    )
})

test('gift confirmation shows sender, recipient, message, date, and reference', () => {
    const transaction = createTransaction({
        id: 'txn-confirm',
        session: {
            id: 'gift-confirm',
            purchaseType: 'gift',
            recipientId: 'jamie',
            giftMessage: 'For our next rainy day.',
        },
    })
    const html = renderDialog({
        purchaseType: 'gift',
        step: 'complete',
        completed: transaction,
    })

    assert.match(html, /Gift Sent!/)
    assert.match(html, /Jamie Lee/)
    assert.match(html, /@jamiewanders/)
    assert.match(html, /Sarah Chen/)
    assert.match(html, /@sarahchen/)
    assert.match(html, /For our next rainy day/)
    assert.match(html, /Nov 24, 2026/)
    assert.match(html, /PS-txn-confirm/)
    assert.match(html, /Prototype gift/)
    assert.doesNotMatch(html, /Simulated gift records were created/)
    assert.doesNotMatch(html, /No payment, license, email, or external delivery occurred/)
    assert.doesNotMatch(html, /Simulated purchase records were created/)
})

test('duplicate ledger records and duplicate submissions are rejected', () => {
    const transaction = createTransaction({
        id: 'txn-duplicate',
        session: { id: 'duplicate-session', purchaseType: 'gift', recipientId: 'alex' },
    })
    const duplicate = { ...transaction }
    const { state, ignored } = normalizePersistedCheckout({ transactions: [transaction, duplicate] })
    assert.equal(state.transactions.length, 1)
    assert.equal(ignored.length, 1)
    assert.equal(state.transactions[0].sessionId, 'duplicate-session')

    const accepted = respondToGift(transaction, 'accepted')
    assert.equal(accepted.ok, true)
    const secondAccept = respondToGift(accepted.transaction, 'accepted')
    assert.equal(secondAccept.ok, false)
})

test('received gifts appear on the recipient profile with sender and status', () => {
    const transaction = createTransaction({
        id: 'txn-received',
        session: {
            id: 'gift-received',
            purchaseType: 'gift',
            recipientId: 'jamie',
            giftMessage: 'A trail for you.',
        },
    })
    const state = { transactions: [transaction], ownedGameIds: [] }
    const html = renderProfileGifts({ id: 'jamie', state })

    assert.match(html, /Received Gifts/)
    assert.match(html, /data-gift-id="txn-received"/)
    assert.match(html, /A trail for you/)
    assert.match(html, /Sarah Chen/)
    assert.match(html, /Received/)
    assert.match(html, /Accept gift/)
    assert.match(html, /Decline gift/)
    assert.equal(getReceivedGifts(state, 'jamie').length, 1)
})

test('accepting a gift adds it to the recipient prototype library without a real license', () => {
    const transaction = createTransaction({
        id: 'txn-accepted',
        session: { id: 'gift-accepted', purchaseType: 'gift', recipientId: 'jamie' },
    })
    const accepted = respondToGift(transaction, 'accepted')
    assert.equal(accepted.ok, true)
    const state = { transactions: [accepted.transaction], ownedGameIds: [] }
    const html = renderProfileGifts({ id: 'jamie', state })

    assert.match(html, /Accepted/)
    assert.match(html, /added to Jamie Lee’s prototype library/)
    assert.match(html, /No real game license was delivered/)
    assert.doesNotMatch(html, /Accept gift<\/button>/)
    assert.deepEqual(getOwnedGameIds(state, 'jamie'), [STARDEW])
})

test('declining a gift keeps the record and prevents duplicate acceptance', () => {
    const transaction = createTransaction({
        id: 'txn-declined',
        session: { id: 'gift-declined', purchaseType: 'gift', recipientId: 'alex' },
    })
    const declined = respondToGift(transaction, 'declined')
    assert.equal(declined.ok, true)
    const html = renderProfileGifts({
        id: 'alex',
        state: { transactions: [declined.transaction], ownedGameIds: [] },
    })

    assert.match(html, /Declined/)
    assert.match(html, /historical prototype record is kept/)
    assert.doesNotMatch(html, /Accept gift<\/button>/)
    assert.equal(respondToGift(declined.transaction, 'accepted').ok, false)
    assert.deepEqual(getOwnedGameIds({ transactions: [declined.transaction], ownedGameIds: [] }, 'alex'), [])
})

test('empty history states do not invent purchases, gifts, or ownership', () => {
    const html = renderProfileGifts({ id: 'you', state: createEmptyCheckoutState() })
    assert.match(html, /No simulated gifts received yet/)
    assert.match(html, /No simulated purchases yet/)
    assert.match(html, /No gifts sent yet/)
    assert.match(html, /Your prototype library is empty/)
})

test('personal purchases, sent gifts, and received gifts stay in separate views', () => {
    const purchase = createTransaction({ id: 'txn-purchase', session: { id: 'purchase-view' } })
    const sent = createTransaction({
        id: 'txn-sent',
        session: { id: 'gift-view', purchaseType: 'gift', recipientId: 'morgan', gameId: SHORT_HIKE },
    })
    const html = renderProfileGifts({
        id: 'you',
        state: { transactions: [purchase, sent], ownedGameIds: [STARDEW] },
    })

    assert.match(html, /Personal purchases/)
    assert.match(html, /Sent gifts/)
    assert.match(html, /Received Gifts/)
    assert.match(html, /Morgan Reed/)
    assert.match(html, /data-transaction-id="txn-purchase"/)
    assert.match(html, /data-gift-id="txn-sent"/)
})

test('transactions and gift status persist across a simulated refresh', () => {
    const purchase = createTransaction({ id: 'txn-persist-buy', session: { id: 'persist-buy' } })
    const gift = createTransaction({
        id: 'txn-persist-gift',
        session: { id: 'persist-gift', purchaseType: 'gift', recipientId: 'casey', gameId: SHORT_HIKE },
    })
    const accepted = respondToGift(gift, 'accepted')
    assert.equal(accepted.ok, true)
    const savedState = {
        transactions: [purchase, accepted.transaction],
        ownedGameIds: [STARDEW],
    }
    const harness = installStorage()
    try {
        assert.equal(saveCheckoutState(savedState), true)
        const reloaded = loadCheckoutState()
        assert.equal(reloaded.state.transactions.length, 2)
        assert.equal(reloaded.state.transactions.find((entry) => entry.type === 'gift').giftStatus, 'accepted')
        assert.deepEqual(reloaded.state.ownedGameIds, [STARDEW])
        assert.equal(reloaded.version, CHECKOUT_STORAGE_VERSION)
        const html = renderProfileGifts({ id: 'casey', state: reloaded.state })
        assert.match(html, /data-gift-status="accepted"/)
    } finally {
        harness.restore()
    }
})

test('checkout persistence writes only its dedicated key', () => {
    const existing = {
        [APP_STORAGE_KEY]: JSON.stringify({ atmos: 'Autumn', saved: [STARDEW], auto: false }),
        [SOCIAL_STORAGE_KEY]: JSON.stringify({ version: 3, state: { circles: initialCircles } }),
        [COMPARE_STORAGE_KEY]: JSON.stringify({ version: 1, state: { selectedGameIds: [STARDEW] } }),
        [REVIEW_STORAGE_KEY]: JSON.stringify({ version: 1, state: { reviews: [] } }),
    }
    const harness = installStorage(existing)
    try {
        const transaction = createTransaction({ id: 'txn-key', session: { id: 'key-session' } })
        assert.equal(saveCheckoutState({ transactions: [transaction], ownedGameIds: [STARDEW] }), true)
        assert.equal(harness.store.get(APP_STORAGE_KEY), existing[APP_STORAGE_KEY])
        assert.equal(harness.store.get(SOCIAL_STORAGE_KEY), existing[SOCIAL_STORAGE_KEY])
        assert.equal(harness.store.get(COMPARE_STORAGE_KEY), existing[COMPARE_STORAGE_KEY])
        assert.equal(harness.store.get(REVIEW_STORAGE_KEY), existing[REVIEW_STORAGE_KEY])
        assert.ok(harness.store.has(CHECKOUT_STORAGE_KEY))
    } finally {
        harness.restore()
    }
})

test('future checkout versions are ignored and never overwritten', () => {
    const future = JSON.stringify({
        version: CHECKOUT_STORAGE_VERSION + 1,
        state: { transactions: [{ fake: true }], ownedGameIds: [STARDEW] },
    })
    const harness = installStorage({ [CHECKOUT_STORAGE_KEY]: future })
    try {
        const loaded = loadCheckoutState()
        assert.deepEqual(loaded.state.transactions, [])
        assert.deepEqual(loaded.state.ownedGameIds, [])
        assert.equal(loaded.canPersist, false)
        assert.equal(loaded.version, CHECKOUT_STORAGE_VERSION + 1)
        assert.equal(saveCheckoutState(createEmptyCheckoutState()), false)
        assert.equal(harness.store.get(CHECKOUT_STORAGE_KEY), future)
    } finally {
        harness.restore()
    }
})

test('malformed and unavailable gift records are dropped during normalization', () => {
    const good = createTransaction({
        id: 'txn-good',
        session: { id: 'good', purchaseType: 'gift', recipientId: 'sam' },
    })
    const { state, ignored } = normalizePersistedCheckout({
        transactions: [
            good,
            { ...good, id: 'txn-stranger', recipientId: 'not-a-friend' },
            { ...good, id: 'txn-missing-game', gameId: MISSING },
            { ...good, id: 'txn-future-date', createdAt: 'not-a-date' },
            { ...good, id: 'txn-fake-status', status: 'completed' },
            null,
        ],
        ownedGameIds: [MISSING],
    })

    assert.deepEqual(state.transactions.map((entry) => entry.id), ['txn-good'])
    assert.equal(ignored.length, 5)
    assert.deepEqual(state.ownedGameIds, [])
})

test('checkout feature modules rely on the shared storage owner', () => {
    const files = [
        'features/checkout/types.ts',
        'features/checkout/model.ts',
        'features/checkout/storage.ts',
        'features/checkout/useCheckout.ts',
        'features/checkout/cart.ts',
        'features/checkout/useCart.ts',
        'features/checkout/CheckoutDialog.tsx',
        'features/checkout/GiftHistory.tsx',
    ]
    for (const file of files) {
        const source = readFileSync(path.join(srcRoot, file), 'utf8')
        assert.doesNotMatch(source, /localStorage\.(setItem|getItem|removeItem)/)
    }
    const storage = readFileSync(path.join(srcRoot, 'features/checkout/storage.ts'), 'utf8')
    const types = readFileSync(path.join(srcRoot, 'features/checkout/types.ts'), 'utf8')
    assert.match(storage, /readVersionedRecord/)
    assert.match(storage, /writeVersionedRecord/)
    assert.match(storage, /CHECKOUT_KEYS\.storage/)
    assert.match(types, /playscape-checkout-v1/)
    assert.doesNotMatch(types, /playscape-(social|community|reviews|compare)/)
    assert.doesNotMatch(storage, /playscape-(social|community|reviews|compare)/)
})

test('checkout UI stays accessible and responsive', () => {
    const html = renderDialog()
    const giftHtml = renderDialog({ purchaseType: 'gift' })
    assert.match(html, /role="dialog"/)
    assert.match(html, /aria-modal="true"/)
    assert.doesNotMatch(html, /aria-current="step"/)
    assert.doesNotMatch(html, /type="checkbox"/)
    assert.match(html, /role="note"/)
    assert.match(html, /role="group" aria-label="Purchase type"/)
    assert.match(giftHtml, /role="status"/)
    assert.match(html, /aria-busy="false"/)

    const dialog = readFileSync(
        path.join(srcRoot, 'features/checkout/CheckoutDialog.tsx'),
        'utf8',
    )
    assert.match(dialog, /role="alert"/)
    assert.match(dialog, /aria-label="Search friends"/)

    const css = readFileSync(path.join(srcRoot, 'features/checkout/checkout.css'), 'utf8')
    const main = readFileSync(path.join(srcRoot, 'main.tsx'), 'utf8')
    assert.match(main, /features\/checkout\/checkout\.css/)
    assert.match(css, /@media \(max-width: 760px\)/)
    assert.match(css, /grid-template-columns: 1fr/)
})
