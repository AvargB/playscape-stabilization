import { gameCatalog, type GameRecord } from "../../data/games"
import { directFriendIds, socialPeople, type SocialPerson } from "../../socialData"
import { getGameEdition } from "./edition"
import {
    GIFT_STATUS_LABELS,
    PAYMENT_METHODS,
    PURCHASE_TYPES,
    type CheckoutResult,
    type CheckoutSession,
    type CheckoutState,
    type CheckoutSummary,
    type GiftDecision,
    type GiftResponseResult,
    type GiftStatus,
    type PrototypeTransaction,
    type PurchaseType,
} from "./types"

export type CheckoutValidationOptions = {
    games?: GameRecord[]
    people?: SocialPerson[]
    /** Current ledger, supplied by the hook to prevent duplicate personal purchases. */
    state?: CheckoutState
}

export type CreateTransactionOptions = CheckoutValidationOptions & {
    now?: string
    id?: string
}

export const createEmptyCheckoutState = (): CheckoutState => ({
    transactions: [],
    ownedGameIds: [],
})

export function createSessionId(): string {
    const crypto = (globalThis as any)?.crypto
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID()
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const ids = (values: ReadonlyArray<{ id: string }>) => values.map((entry) => entry.id)
const PURCHASE_TYPE_IDS = ids(PURCHASE_TYPES)
const PAYMENT_METHOD_IDS = ids(PAYMENT_METHODS)
const GIFT_STATUS_IDS = Object.keys(GIFT_STATUS_LABELS) as GiftStatus[]

export function isDirectFriend(id: unknown, people: SocialPerson[] = socialPeople): boolean {
    return (
        typeof id === "string" &&
        id !== "you" &&
        (directFriendIds as readonly string[]).includes(id) &&
        people.some((person) => person.id === id)
    )
}

/** Catalog prices are sample values. Missing or invalid prices are never invented. */
export function getPrototypePrice(game: Pick<GameRecord, "price">): number | null {
    const price = game?.price
    return typeof price === "number" && Number.isFinite(price) && price >= 0
        ? price
        : null
}

export function formatPrototypePrice(price: number | null): string {
    if (price === null) return "Price unavailable in prototype"
    return `$${price.toFixed(2)} USD (sample catalog price)`
}

export function buildCheckoutSummary(game: GameRecord): CheckoutSummary {
    const price = getPrototypePrice(game)
    return {
        gameId: game.id,
        edition: getGameEdition(game),
        title: game.title,
        developer: game.developer ?? null,
        publisher: game.publisher ?? null,
        price,
        priceLabel: formatPrototypePrice(price),
        subtotal: price,
        total: price,
    }
}

export type CartTotalsLine = {
    gameId: number
    edition?: string
}

export type CartTotals = {
    subtotal: number | null
    total: number | null
    itemCount: number
}

/** Prototype-only totals; a missing/invalid catalog price is never invented. */
export function calculateCartTotals(
    lines: ReadonlyArray<CartTotalsLine>,
    games: GameRecord[] = gameCatalog,
): CartTotals {
    let subtotal = 0
    for (const line of lines) {
        const game = games.find((entry) => entry.id === line.gameId)
        const price = game ? getPrototypePrice(game) : null
        if (price === null) return { subtotal: null, total: null, itemCount: lines.length }
        subtotal += price
    }
    return { subtotal, total: subtotal, itemCount: lines.length }
}

/**
 * Every edition the person already owns by canonical game ID. Seeded profile
 * games, personal purchases, and accepted gifts all count; sent gifts do not.
 */
export function getPrototypeOwnedEditions(
    state: CheckoutState,
    personId = "you",
    options: Pick<CheckoutValidationOptions, "games" | "people"> = {},
): Array<{ gameId: number; edition: string }> {
    const games = options.games ?? gameCatalog
    const people = options.people ?? socialPeople
    const entries = new Map<string, { gameId: number; edition: string }>()
    const editionFor = (gameId: number, edition?: string | null) =>
        edition?.trim() || getGameEdition(games.find((game) => game.id === gameId) ?? null)
    const add = (gameId: number, edition?: string | null) => {
        const record = { gameId, edition: editionFor(gameId, edition) }
        entries.set(`${gameId}::${record.edition}`, record)
    }

    for (const gameId of people.find((person) => person.id === personId)?.owned ?? []) {
        add(gameId)
    }
    for (const transaction of state.transactions) {
        if (
            transaction.type === "personal" &&
            transaction.senderId === personId
        ) {
            add(transaction.gameId, transaction.edition)
        }
        if (
            transaction.type === "gift" &&
            transaction.recipientId === personId &&
            transaction.giftStatus === "accepted"
        ) {
            add(transaction.gameId, transaction.edition)
        }
    }
    return [...entries.values()]
}

/** Own wishlist entries are removed only for completed personal purchases. */
export function removeWishlistPurchases(
    saved: ReadonlyArray<number>,
    purchasedGameIds: ReadonlyArray<number>,
): number[] {
    const purchased = new Set(purchasedGameIds)
    return saved.filter((id) => !purchased.has(id))
}

export function validateCheckoutSession(
    session: CheckoutSession,
    options: CheckoutValidationOptions = {},
): string[] {
    const errors: string[] = []
    const games = options.games ?? gameCatalog
    const people = options.people ?? socialPeople

    if (!session || typeof session.id !== "string" || !session.id.trim()) {
        errors.push("This checkout session could not be identified.")
    }
    if (!session || !Number.isInteger(session.gameId)) {
        errors.push("Choose a game from the catalog before checking out.")
    } else if (!games.some((game) => game.id === session.gameId)) {
        errors.push("That game is no longer available in this prototype catalog.")
    }
    if (!PURCHASE_TYPE_IDS.includes(session?.purchaseType as PurchaseType)) {
        errors.push("Choose either a personal purchase or a gift.")
    }
    if (!PAYMENT_METHOD_IDS.includes(session?.paymentMethod)) {
        errors.push("Choose an illustrative payment method.")
    }
    if (options.state && session?.purchaseType === "personal") {
        const game = games.find((entry) => entry.id === session.gameId)
        const edition = session.edition?.trim() || getGameEdition(game)
        const alreadyOwned = getPrototypeOwnedEditions(options.state, "you", {
            games,
            people,
        }).some(
            (entry) => entry.gameId === session.gameId && entry.edition === edition,
        )
        if (alreadyOwned) errors.push("This edition is already in your prototype library.")
    }
    if (typeof session?.giftMessage !== "string" || session.giftMessage.length > 500) {
        errors.push("Gift messages must be 500 characters or fewer.")
    }
    if (session?.purchaseType === "gift") {
        if (!isDirectFriend(session.recipientId, people)) {
            errors.push("Choose one of your existing PLAYSCAPE friends.")
        }
    } else if (session?.recipientId !== null) {
        errors.push("Personal purchases cannot include a gift recipient.")
    }
    return errors
}

export function createPrototypeTransaction(
    session: CheckoutSession,
    options: CreateTransactionOptions = {},
): CheckoutResult {
    const games = options.games ?? gameCatalog
    const people = options.people ?? socialPeople
    const errors = validateCheckoutSession(session, { games, people, state: options.state })
    if (errors.length) return { ok: false, errors }

    const game = games.find((entry) => entry.id === session.gameId)!
    const gift = session.purchaseType === "gift"
    const transaction: PrototypeTransaction = {
        id: options.id ?? `txn-${session.id}`,
        sessionId: session.id,
        gameId: game.id,
        title: game.title,
        edition: session.edition?.trim() || getGameEdition(game),
        senderId: "you",
        recipientId: gift ? (session.recipientId as string) : null,
        type: session.purchaseType,
        price: getPrototypePrice(game),
        paymentMethod: session.paymentMethod,
        createdAt: options.now ?? new Date().toISOString(),
        status: "simulated-complete",
        giftMessage: gift && session.giftMessage.trim() ? session.giftMessage.trim() : null,
        delivery: gift ? "immediate" : null,
        giftStatus: gift ? "received" : null,
    }
    return { ok: true, transaction }
}

export function respondToGift(
    transaction: PrototypeTransaction,
    decision: GiftDecision,
): GiftResponseResult {
    if (transaction.type !== "gift") {
        return { ok: false, errors: ["Only gift records can be accepted or declined."] }
    }
    if (decision !== "accepted" && decision !== "declined") {
        return { ok: false, errors: ["Choose accept or decline."] }
    }
    if (transaction.giftStatus !== "received") {
        return {
            ok: false,
            errors: [
                transaction.giftStatus
                    ? `This gift was already ${transaction.giftStatus}.`
                    : "This gift is still awaiting a response.",
            ],
        }
    }
    return { ok: true, transaction: { ...transaction, giftStatus: decision } }
}

export function getPersonalPurchases(
    state: CheckoutState,
    senderId = "you",
): PrototypeTransaction[] {
    return state.transactions.filter(
        (transaction) => transaction.type === "personal" && transaction.senderId === senderId,
    )
}

export function getSentGifts(
    state: CheckoutState,
    senderId = "you",
): PrototypeTransaction[] {
    return state.transactions.filter(
        (transaction) => transaction.type === "gift" && transaction.senderId === senderId,
    )
}

export function getReceivedGifts(
    state: CheckoutState,
    recipientId: string,
): PrototypeTransaction[] {
    return state.transactions.filter(
        (transaction) => transaction.type === "gift" && transaction.recipientId === recipientId,
    )
}

/** Prototype ownership is derived, never silently treated as a real license. */
export function getOwnedGameIds(state: CheckoutState, personId = "you"): number[] {
    const owned = new Set<number>()
    for (const transaction of state.transactions) {
        if (transaction.type === "personal" && transaction.senderId === personId) {
            owned.add(transaction.gameId)
        }
        if (
            transaction.type === "gift" &&
            transaction.recipientId === personId &&
            transaction.giftStatus === "accepted"
        ) {
            owned.add(transaction.gameId)
        }
    }
    return [...owned]
}

export function giftStatusLabel(status: GiftStatus | null): string {
    return status ? GIFT_STATUS_LABELS[status] : "Not a gift"
}

export function formatTransactionDate(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return "Date unavailable"
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export function transactionReference(transaction: PrototypeTransaction): string {
    return `PS-${transaction.id}`
}

export function isGiftStatus(value: unknown): value is GiftStatus {
    return typeof value === "string" && GIFT_STATUS_IDS.includes(value as GiftStatus)
}
