import { gameCatalog, type GameRecord } from "../../data/games"
import { readVersionedRecord, removeVersionedRecord, writeVersionedRecord } from "../../social"
import { socialPeople, type SocialPerson } from "../../socialData"
import { getGameEdition } from "./edition"
import {
    CHECKOUT_KEYS,
    PAYMENT_METHODS,
    PURCHASE_TYPES,
    type CheckoutState,
    type GiftStatus,
    type PrototypeTransaction,
    type PurchaseType,
} from "./types"
import { createEmptyCheckoutState, isDirectFriend, isGiftStatus } from "./model"

/**
 * Prototype checkout uses its own versioned key. Browser storage is still
 * accessed only through the shared owner in social.ts; no social, wishlist,
 * review, or compare record is read or written here.
 */
export const CHECKOUT_STORAGE_KEY = CHECKOUT_KEYS.storage
export const CHECKOUT_STORAGE_VERSION = CHECKOUT_KEYS.version

export type CheckoutPersistenceOptions = {
    games?: GameRecord[]
    people?: SocialPerson[]
}

export type CheckoutHydration = {
    state: CheckoutState
    ignored: unknown[]
    canPersist: boolean
    exists: boolean
    valid: boolean
    version: number
}

const isRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value)

const purchaseTypeIds = PURCHASE_TYPES.map((entry) => entry.id)
const paymentMethodIds = PAYMENT_METHODS.map((entry) => entry.id)

export const getStoredCheckoutState = (
    raw: unknown,
): { transactions: unknown[]; ownedGameIds: unknown[] } | null => {
    if (Array.isArray(raw)) return { transactions: raw, ownedGameIds: [] }
    if (!isRecord(raw)) return null
    if (isRecord(raw.state)) return getStoredCheckoutState(raw.state)
    return {
        transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
        ownedGameIds: Array.isArray(raw.ownedGameIds) ? raw.ownedGameIds : [],
    }
}

const normalizeTransaction = (
    entry: unknown,
    games: GameRecord[],
    people: SocialPerson[],
): PrototypeTransaction | null => {
    if (!isRecord(entry)) return null

    const id = typeof entry.id === "string" && entry.id.trim() ? entry.id : null
    const sessionId =
        typeof entry.sessionId === "string" && entry.sessionId.trim()
            ? entry.sessionId
            : id
    const gameId = Number.isInteger(entry.gameId) ? entry.gameId : null
    const game = games.find((record) => record.id === gameId)
    const edition =
        typeof entry.edition === "string" && entry.edition.trim()
            ? entry.edition.trim()
            : getGameEdition(game)
    const type = entry.type as PurchaseType
    const paymentMethod = entry.paymentMethod
    const createdAt = typeof entry.createdAt === "string" ? entry.createdAt : null
    const price = entry.price === null
        ? null
        : typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price >= 0
            ? entry.price
            : undefined

    if (
        !id ||
        !sessionId ||
        gameId === null ||
        !games.some((game) => game.id === gameId) ||
        entry.senderId !== "you" ||
        !purchaseTypeIds.includes(type) ||
        !paymentMethodIds.includes(paymentMethod) ||
        entry.status !== "simulated-complete" ||
        price === undefined ||
        !createdAt ||
        Number.isNaN(Date.parse(createdAt))
    ) {
        return null
    }

    if (type === "personal") {
        return {
            id,
            sessionId,
            gameId,
            title: game!.title,
            edition,
            senderId: "you",
            recipientId: null,
            type,
            price,
            paymentMethod,
            createdAt,
            status: "simulated-complete",
            giftMessage: null,
            delivery: null,
            giftStatus: null,
        }
    }

    if (
        !isDirectFriend(entry.recipientId, people) ||
        !isGiftStatus(entry.giftStatus)
    ) {
        return null
    }

    const giftMessage =
        typeof entry.giftMessage === "string" && entry.giftMessage.length <= 500
            ? entry.giftMessage
            : null
    if (typeof entry.giftMessage === "string" && entry.giftMessage.length > 500) {
        return null
    }

    return {
        id,
        sessionId,
        gameId,
        title: game!.title,
        edition,
        senderId: "you",
        recipientId: entry.recipientId,
        type,
        price,
        paymentMethod,
        createdAt,
        status: "simulated-complete",
        giftMessage,
        delivery: "immediate",
        giftStatus: entry.giftStatus as GiftStatus,
    }
}

/** Invalid, duplicate, or future records are ignored rather than invented. */
export const normalizePersistedCheckout = (
    raw: unknown,
    options: CheckoutPersistenceOptions = {},
): { state: CheckoutState; ignored: unknown[] } => {
    const stored = getStoredCheckoutState(raw)
    if (!stored) return { state: createEmptyCheckoutState(), ignored: [] }

    const games = options.games ?? gameCatalog
    const people = options.people ?? socialPeople
    const transactions: PrototypeTransaction[] = []
    const ignored: unknown[] = []
    const ids = new Set<string>()
    const sessions = new Set<string>()

    for (const entry of stored.transactions) {
        const transaction = normalizeTransaction(entry, games, people)
        if (
            !transaction ||
            ids.has(transaction.id) ||
            sessions.has(transaction.sessionId)
        ) {
            ignored.push(entry)
            continue
        }
        ids.add(transaction.id)
        sessions.add(transaction.sessionId)
        transactions.push(transaction)
    }

    // Only a recorded personal simulated purchase can create local ownership.
    // Accepted gifts are derived per recipient by getOwnedGameIds().
    const ownedGameIds = [
        ...new Set(
            transactions
                .filter((transaction) => transaction.type === "personal")
                .map((transaction) => transaction.gameId),
        ),
    ]

    return { state: { transactions, ownedGameIds }, ignored }
}

/** Future versions are never downgraded or interpreted by this version. */
export const loadCheckoutState = (
    options: CheckoutPersistenceOptions = {},
): CheckoutHydration => {
    const stored = readVersionedRecord(CHECKOUT_STORAGE_KEY)
    const storedState = getStoredCheckoutState(stored.state)
    const hasFutureVersion = stored.version > CHECKOUT_STORAGE_VERSION
    const normalized = hasFutureVersion
        ? { state: createEmptyCheckoutState(), ignored: storedState?.transactions ?? [] }
        : normalizePersistedCheckout(stored.state, options)

    return {
        state: normalized.state,
        ignored: normalized.ignored,
        canPersist: stored.available && !hasFutureVersion,
        exists: stored.exists,
        valid: !hasFutureVersion && storedState !== null,
        version: stored.version,
    }
}

export const saveCheckoutState = (
    state: CheckoutState,
    options: CheckoutPersistenceOptions = {},
): boolean => {
    const normalized = normalizePersistedCheckout(state, options)
    return writeVersionedRecord(
        CHECKOUT_STORAGE_KEY,
        CHECKOUT_STORAGE_VERSION,
        normalized.state,
    )
}

/** Used only by an explicit prototype reset; never called during hydration. */
export const clearCheckoutState = (): boolean => removeVersionedRecord(CHECKOUT_STORAGE_KEY)
