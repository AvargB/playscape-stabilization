import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { getGameById } from '../src/data/games.ts'
import { APP_STORAGE_KEY, SOCIAL_STORAGE_KEY } from '../src/social.ts'
import { MainNavigation } from '../src/components/navigation/MainNavigation.tsx'
import CheckoutDialog from '../src/features/checkout/CheckoutDialog.tsx'
import {
    CART_STORAGE_KEY,
    CART_STORAGE_VERSION,
    addGameToCart,
    clearCart,
    createPrototypeTransaction,
    loadCartState,
    normalizeCartState,
    removeGameFromCart,
    saveCartState,
} from '../src/features/checkout/index.ts'

const srcRoot = new URL('../src/', import.meta.url)
const STARDEW = 413150
const SHORT_HIKE = 1055540
const MISSING = 999999
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

function session(overrides = {}) {
    return {
        id: `cart-session-${overrides.id ?? 'base'}`,
        gameId: STARDEW,
        purchaseType: 'personal',
        recipientId: null,
        giftMessage: '',
        paymentMethod: 'prototype',
        ...overrides,
    }
}

function transaction(overrides = {}) {
    const result = createPrototypeTransaction(session(overrides.session ?? {}), {
        id: overrides.id ?? `txn-${(overrides.session ?? {}).id ?? 'base'}`,
        now: NOW,
    })
    assert.equal(result.ok, true)
    return result.transaction
}

function renderCartDialog(options = {}) {
    const games = options.games ?? [getGameById(STARDEW)]
    return renderToStaticMarkup(
        React.createElement(CheckoutDialog, {
            games,
            sessionId: options.sessionId ?? 'cart-render',
            initialPurchaseType: options.purchaseType ?? 'personal',
            initialStep: options.step ?? 'review',
            initialCompleted: options.completed ?? null,
            cartMode: options.cartMode ?? games.length > 1,
            onAddToCart() {},
            onRemoveFromCart() {},
            onClearCart() {},
            onClose() {},
            onComplete() {
                return { ok: false, errors: [] }
            },
        }),
    )
}

test('cart state deduplicates and validates canonical game IDs', () => {
    const { state, ignored } = normalizeCartState({
        gameIds: [STARDEW, STARDEW, MISSING, 'not-an-id', SHORT_HIKE],
    })
    assert.deepEqual(state.gameIds, [STARDEW, SHORT_HIKE])
    assert.equal(ignored.length, 3)
    assert.deepEqual(addGameToCart([STARDEW], STARDEW), [STARDEW])
    assert.deepEqual(removeGameFromCart([STARDEW, SHORT_HIKE], STARDEW), [SHORT_HIKE])
    assert.deepEqual(clearCart(), [])
})

test('cart persistence uses its own versioned key and leaves other stores untouched', () => {
    const existing = {
        [APP_STORAGE_KEY]: JSON.stringify({ atmos: 'Autumn', saved: [STARDEW], auto: false }),
        [SOCIAL_STORAGE_KEY]: JSON.stringify({ version: 3, state: { circles: [] } }),
    }
    const harness = installStorage(existing)
    try {
        assert.equal(saveCartState({ gameIds: [STARDEW, SHORT_HIKE] }), true)
        const loaded = loadCartState()
        assert.deepEqual(loaded.state.gameIds, [STARDEW, SHORT_HIKE])
        assert.equal(loaded.version, CART_STORAGE_VERSION)
        assert.equal(harness.store.get(APP_STORAGE_KEY), existing[APP_STORAGE_KEY])
        assert.equal(harness.store.get(SOCIAL_STORAGE_KEY), existing[SOCIAL_STORAGE_KEY])
    } finally {
        harness.restore()
    }
})

test('future cart versions are ignored and never overwritten', () => {
    const future = JSON.stringify({ version: CART_STORAGE_VERSION + 1, state: { gameIds: [STARDEW] } })
    const harness = installStorage({ [CART_STORAGE_KEY]: future })
    try {
        const loaded = loadCartState()
        assert.deepEqual(loaded.state.gameIds, [])
        assert.equal(loaded.canPersist, false)
        assert.equal(loaded.version, CART_STORAGE_VERSION + 1)
        assert.equal(saveCartState({ gameIds: [SHORT_HIKE] }), false)
        assert.equal(harness.store.get(CART_STORAGE_KEY), future)
    } finally {
        harness.restore()
    }
})

test('upper-right cart control is accessible and announced with its count', () => {
    const props = {
        currentView: 'Discover',
        atmosphere: 'Autumn',
        wishlistCount: 0,
        cartCount: 2,
        menuOpen: false,
        query: '',
        onNavigate() {},
        onOpenCart() {},
        onToggleMenu() {},
        onQueryChange() {},
        onSearchSubmit() {},
    }
    const html = renderToStaticMarkup(React.createElement(MainNavigation, props))
    assert.match(html, /aria-label="Open prototype cart, 2 games"/)
    assert.match(html, /class="cart-count"/)
    const withoutCart = renderToStaticMarkup(
        React.createElement(MainNavigation, { ...props, onOpenCart: undefined }),
    )
    assert.doesNotMatch(withoutCart, /Open prototype cart/)
})

test('direct game checkout and cart entry point coexist', () => {
    const app = readFileSync(new URL('PLAYSCAPE-cleaner.tsx', srcRoot), 'utf8')
    assert.match(app, /onCheckout=\{openCheckout\}/)
    assert.match(app, /onOpenCart=\{openCartCheckout\}/)
    assert.match(app, /onAddToCart=\{addToCart\}/)
    assert.match(app, /cartCount=\{cart\.gameIds\.length\}/)
    assert.match(app, /setCheckoutIds\(next\)/)
})

test('checkout review advances to a fake payment screen without a payment chooser', () => {
    const html = renderCartDialog()
    const payment = renderCartDialog({ step: 'payment' })
    assert.match(html, /Continue to payment/)
    assert.match(html, /Add to cart/)
    assert.doesNotMatch(html, /Create prototype record/)
    assert.doesNotMatch(html, /Review final order/)
    assert.doesNotMatch(html, /Simulated payment method/)
    assert.doesNotMatch(html, /Credit\/Debit Card/)
    assert.match(payment, /Fake number/)
    assert.match(payment, /Prefilled with demo values/)
    assert.match(payment, /Restore demo details/)
    assert.match(payment, /value="Demo card"/)
    assert.match(payment, /value="0000 0000 0000 0000"/)
    assert.match(payment, /value="12\/30"/)
    assert.match(payment, /value="000"/)
    assert.match(payment, /Create prototype record/)
    assert.match(payment, /Back<\/button>/)
})

test('payment prefill uses fixed demo values without persisting them', () => {
    const payment = renderCartDialog({ step: 'payment' })
    const source = readFileSync(new URL('features/checkout/CheckoutDialog.tsx', srcRoot), 'utf8')
    assert.match(source, /const DEMO_CARD_DETAILS = \{/)
    assert.match(source, /React\.useState<string>\(DEMO_CARD_DETAILS\.label\)/)
    assert.match(source, /React\.useState<string>\(DEMO_CARD_DETAILS\.number\)/)
    assert.match(source, /React\.useState<string>\(DEMO_CARD_DETAILS\.expiry\)/)
    assert.match(source, /React\.useState<string>\(DEMO_CARD_DETAILS\.code\)/)
    assert.doesNotMatch(source, /localStorage/)
    assert.doesNotMatch(payment, /value="4242/)
})

test('payment is fixed to a local prototype record in code', () => {
    const source = readFileSync(new URL('features/checkout/CheckoutDialog.tsx', srcRoot), 'utf8')
    assert.doesNotMatch(source, /PAYMENT_METHODS/)
    assert.match(source, /paymentMethod: "prototype"/)
    assert.doesNotMatch(renderCartDialog(), /type="(?:text|number|password)"/i)
})

test('cart checkout lists every game and exposes remove and clear controls', () => {
    const html = renderCartDialog({
        games: [getGameById(STARDEW), getGameById(SHORT_HIKE)],
    })
    assert.match(html, /Prototype cart · 2 games/)
    assert.match(html, /aria-label="Remove Stardew Valley from cart"/)
    assert.match(html, /aria-label="Remove A Short Hike from cart"/)
    assert.match(html, /Clear cart/)
    assert.match(html, /Continue to payment/)
})

test('a single cart item still uses the cart presentation and controls', () => {
    const html = renderCartDialog({
        games: [getGameById(STARDEW)],
        cartMode: true,
    })
    assert.match(html, /Prototype cart · 1 game/)
    assert.match(html, /aria-label="Remove Stardew Valley from cart"/)
    assert.match(html, /Clear cart/)
    assert.doesNotMatch(html, /Add to cart/)
    assert.match(html, /Continue to payment/)
})

test('batch receipt keeps one simulated record per cart game', () => {
    const first = transaction({ id: 'cart-txn-1', session: { id: 'cart-session-1' } })
    const second = transaction({
        id: 'cart-txn-2',
        session: { id: 'cart-session-2', gameId: SHORT_HIKE },
    })
    const html = renderCartDialog({
        games: [getGameById(STARDEW), getGameById(SHORT_HIKE)],
        step: 'complete',
        completed: [first, second],
    })
    assert.match(html, /Prototype checkout complete/)
    assert.match(html, /data-checkout-complete="true"/)
    assert.match(html, /PS-cart-txn-1/)
    assert.match(html, /PS-cart-txn-2/)
    assert.equal((html.match(/data-transaction-reference="true"/g) ?? []).length, 2)
    assert.equal((html.match(/class="chk-success-icon"/g) ?? []).length, 1)
    assert.match(html, /class="chk-receipt"[^>]*>\s*<span class="chk-success-icon"/)
})

test('receipt success badge sits inside the first receipt corner', () => {
    const source = readFileSync(new URL('features/checkout/checkout.css', srcRoot), 'utf8')
    assert.match(source, /\.ps \.chk-receipt \{[^}]*position: relative/)
    assert.match(source, /\.ps \.chk-receipt \.chk-success-icon \{[^}]*left: 10px[^}]*top: 10px/)
})
