import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { gameCatalog, getGameById } from '../src/data/games.ts'
import { socialPeople } from '../src/socialData.ts'
import GameDetails from '../src/features/game-details/index.tsx'
import {
    CheckoutDialog,
    PROTOTYPE_STANDARD_EDITION,
    addCartItem,
    calculateCartTotals,
    cartItemKey,
    createPrototypeTransaction,
    getGameEdition,
    normalizeCartState,
    removeCartItem,
    removeWishlistPurchases,
} from '../src/features/checkout/index.ts'

const STARDEW = 413150
const SHORT_HIKE = 1055540
const NOW = '2026-11-24T12:00:00.000Z'

function checkoutSession(overrides = {}) {
    return {
        id: `session-${overrides.id ?? 'base'}`,
        gameId: STARDEW,
        purchaseType: 'personal',
        recipientId: null,
        giftMessage: '',
        paymentMethod: 'prototype',
        ...overrides,
    }
}

function renderDialog(options = {}) {
    return renderToStaticMarkup(
        React.createElement(CheckoutDialog, {
            game: options.game ?? getGameById(STARDEW),
            games: options.games,
            items: options.items,
            sessionId: options.sessionId ?? 'session-purchase',
            initialPurchaseType: options.purchaseType ?? 'personal',
            initialStep: options.step ?? 'review',
            initialCompleted: options.completed ?? null,
            cartMode: options.cartMode ?? false,
            friends: socialPeople,
            currentUser: socialPeople[0],
            renderAvatar: () => null,
            onAddToCart() {},
            onRemoveFromCart() {},
            onClearCart() {},
            onBackToProduct() {},
            onReturnToStore() {},
            onClose() {},
            onComplete() {
                return { ok: false, errors: [] }
            },
        }),
    )
}

test('cart lines dedupe by game and edition, and keep standard editions derived', () => {
    assert.equal(getGameEdition(getGameById(STARDEW)), PROTOTYPE_STANDARD_EDITION)
    assert.equal(cartItemKey(STARDEW, 'Deluxe edition'), '413150::Deluxe edition')

    const standard = addCartItem([], STARDEW)
    const duplicate = addCartItem(standard, STARDEW)
    assert.equal(duplicate, standard, 'duplicate standard edition must not create a new line')

    const deluxe = addCartItem(standard, STARDEW, 'Deluxe edition')
    assert.equal(deluxe.length, 2, 'a distinct edition is an intentional second line')
    assert.deepEqual(
        deluxe.map((item) => item.edition),
        [PROTOTYPE_STANDARD_EDITION, 'Deluxe edition'],
    )
    assert.equal(removeCartItem(deluxe, STARDEW, 'Deluxe edition').length, 1)
})

test('cart normalization keeps distinct editions and reports only invalid duplicates', () => {
    const { state, ignored } = normalizeCartState({
        items: [
            { gameId: STARDEW, edition: 'Standard edition' },
            { gameId: STARDEW, edition: 'Standard edition' },
            { gameId: STARDEW, edition: 'Deluxe edition' },
            { gameId: 999999, edition: 'Standard edition' },
        ],
    })
    assert.deepEqual(
        state.items.map((item) => item.edition),
        ['Standard edition', 'Deluxe edition'],
    )
    assert.deepEqual(state.gameIds, [STARDEW, STARDEW])
    assert.equal(ignored.length, 2)
})

test('cart totals use canonical catalog prices and admit unavailable prices', () => {
    const games = [getGameById(STARDEW), getGameById(SHORT_HIKE)]
    const totals = calculateCartTotals(
        [{ gameId: STARDEW }, { gameId: SHORT_HIKE }],
        games,
    )
    assert.equal(totals.itemCount, 2)
    assert.equal(totals.subtotal, 22.98)
    assert.equal(totals.total, 22.98)

    const unavailable = calculateCartTotals(
        [{ gameId: STARDEW }],
        [{ ...getGameById(STARDEW), price: Number.NaN }],
    )
    assert.equal(unavailable.subtotal, null)
    assert.equal(unavailable.total, null)
})

test('duplicate personal purchases are rejected while different editions remain valid', () => {
    const first = createPrototypeTransaction(checkoutSession({ id: 'first' }), { now: NOW })
    assert.equal(first.ok, true)
    const state = { transactions: [first.transaction], ownedGameIds: [STARDEW] }

    const duplicate = createPrototypeTransaction(checkoutSession({ id: 'second' }), {
        state,
        now: NOW,
    })
    assert.equal(duplicate.ok, false)
    assert.ok(duplicate.errors.some((error) => /already in your prototype library/.test(error)))

    const otherEdition = createPrototypeTransaction(
        checkoutSession({ id: 'third', edition: 'Deluxe edition' }),
        { state, now: NOW },
    )
    assert.equal(otherEdition.ok, true)
    assert.equal(otherEdition.transaction.edition, 'Deluxe edition')
})

test('completed personal purchases remove only those games from the wishlist', () => {
    assert.deepEqual(
        removeWishlistPurchases([STARDEW, SHORT_HIKE], [STARDEW]),
        [SHORT_HIKE],
    )
    assert.deepEqual(
        removeWishlistPurchases([SHORT_HIKE], [STARDEW]),
        [SHORT_HIKE],
    )
})

test('cart review shows edition, prices, subtotal, total, and progress steps', () => {
    const html = renderDialog({
        games: [getGameById(STARDEW), getGameById(SHORT_HIKE)],
        items: [
            { gameId: STARDEW, edition: 'Deluxe edition' },
            { gameId: SHORT_HIKE, edition: 'Standard edition' },
        ],
        cartMode: true,
    })
    assert.match(html, /Deluxe edition/)
    assert.match(html, /\$14\.99 USD \(sample catalog price\)/)
    assert.match(html, /\$7\.99 USD \(sample catalog price\)/)
    assert.match(html, />Subtotal</)
    assert.match(html, />Total</)
    assert.match(html, /\$22\.98 USD \(sample catalog price\)/)
    assert.match(html, /class="chk-step-track"/)
    assert.match(html, /Purchase method/)
})

test('cart review keeps distinct editions for the same game', () => {
    const game = getGameById(STARDEW)
    const html = renderDialog({
        games: [game, game],
        items: [
            { gameId: STARDEW, edition: 'Standard edition' },
            { gameId: STARDEW, edition: 'Deluxe edition' },
        ],
        cartMode: true,
    })
    assert.match(html, /Standard edition/)
    assert.match(html, /Deluxe edition/)
    assert.equal((html.match(/Deluxe edition/g) || []).length, 1)
    assert.equal((html.match(/Standard edition/g) || []).length, 1)
    assert.match(html, /Prototype cart · 2 games/)
})

test('product return and store return keep navigation available', () => {
    const review = renderDialog({ onBackToProduct() {} })
    assert.match(review, /Back to game<\/button>/)
    assert.doesNotMatch(review, /Return to store/)

    const result = createPrototypeTransaction(checkoutSession({ id: 'receipt' }), {
        now: NOW,
    })
    assert.equal(result.ok, true)
    const receipt = renderDialog({
        step: 'complete',
        completed: result.transaction,
        onReturnToStore() {},
    })
    assert.match(receipt, /Return to store<\/button>/)
    assert.match(receipt, /Standard edition/)
})

test('game details surface the local prototype library overlay', () => {
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
            ownedIds: [STARDEW],
            onCheckout() {},
        }),
    )
    assert.match(html, /data-owned-game="413150"/)
    assert.match(html, /In prototype library/)
})

test('app wiring connects editions, wishlist updates, and return navigation', () => {
    const app = readFileSync(
        new URL('../src/PLAYSCAPE-cleaner.tsx', import.meta.url),
        'utf8',
    )
    assert.match(app, /items=\{checkoutFromCart \? cart\.items : undefined\}/)
    assert.match(app, /removePurchasedFromWishlist\(\[session\.gameId\]\)/)
    assert.match(app, /session\.purchaseType === "personal"/)
    assert.match(app, /onBackToProduct=/)
    assert.match(app, /onReturnToStore=/)
    assert.match(app, /checkoutState\.ownedGameIds/)
})
