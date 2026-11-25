import { gameCatalog, type GameRecord } from "../../data/games"
import { readVersionedRecord, writeVersionedRecord } from "../../social"

/** Cart is a separate local prototype concern; the ledger schema stays v1. */
export const CART_KEYS = {
    storage: "playscape-cart-v1",
    version: 1,
} as const

export const CART_STORAGE_KEY = CART_KEYS.storage
export const CART_STORAGE_VERSION = CART_KEYS.version

export type CartState = {
    gameIds: number[]
}

export type CartPersistenceOptions = {
    games?: GameRecord[]
}

export type CartHydration = {
    state: CartState
    ignored: unknown[]
    canPersist: boolean
    exists: boolean
    valid: boolean
    version: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value)

export const createEmptyCartState = (): CartState => ({ gameIds: [] })

export function normalizeCartState(
    raw: unknown,
    options: CartPersistenceOptions = {},
): { state: CartState; ignored: unknown[] } {
    const games = options.games ?? gameCatalog
    const knownIds = new Set(games.map((game) => game.id))
    const validIds = new Set<number>()
    const ignored: unknown[] = []

    const collect = (value: unknown) => {
        if (Array.isArray(value)) {
            value.forEach(collect)
            return
        }
        if (isRecord(value) && Object.prototype.hasOwnProperty.call(value, "state")) {
            collect(value.state)
            return
        }
        if (isRecord(value) && Array.isArray(value.gameIds)) {
            value.gameIds.forEach(collect)
            return
        }
        if (
            Number.isInteger(value) &&
            knownIds.has(value as number) &&
            !validIds.has(value as number)
        ) {
            validIds.add(value as number)
        } else {
            ignored.push(value)
        }
    }

    collect(raw)
    return { state: { gameIds: [...validIds] }, ignored }
}

export function loadCartState(options: CartPersistenceOptions = {}): CartHydration {
    const stored = readVersionedRecord(CART_STORAGE_KEY)
    const hasFutureVersion = stored.version > CART_STORAGE_VERSION
    const normalized = hasFutureVersion
        ? { state: createEmptyCartState(), ignored: [] }
        : normalizeCartState(stored.state, options)
    return {
        state: normalized.state,
        ignored: normalized.ignored,
        canPersist: stored.available && !hasFutureVersion,
        exists: stored.exists,
        valid: !hasFutureVersion && (Array.isArray(stored.state) || isRecord(stored.state)),
        version: stored.version,
    }
}

export function saveCartState(
    state: CartState,
    options: CartPersistenceOptions = {},
): boolean {
    const normalized = normalizeCartState(state, options)
    return writeVersionedRecord(CART_STORAGE_KEY, CART_STORAGE_VERSION, normalized.state)
}

export function addGameToCart(gameIds: number[], id: number): number[] {
    if (!Number.isInteger(id) || gameIds.includes(id)) return gameIds
    return [...gameIds, id]
}

export function removeGameFromCart(gameIds: number[], id: number): number[] {
    return gameIds.filter((entry) => entry !== id)
}

export function clearCart(): number[] {
    return []
}
