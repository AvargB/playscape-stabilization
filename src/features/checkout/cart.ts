import { gameCatalog, type GameRecord } from "../../data/games"
import { readVersionedRecord, writeVersionedRecord } from "../../social"
import { cartItemKey, getGameEdition } from "./edition"

/** Cart is a separate local prototype concern; the ledger schema stays v1. */
export const CART_KEYS = {
    storage: "playscape-cart-v1",
    version: 1,
} as const

export const CART_STORAGE_KEY = CART_KEYS.storage
export const CART_STORAGE_VERSION = CART_KEYS.version

export type CartItem = {
    gameId: number
    edition: string
}

export type CartState = {
    /** Legacy view of the cart; derived from `items` so existing callers keep working. */
    gameIds: number[]
    /** Edition-aware lines. The catalog is still the only source of game metadata. */
    items: CartItem[]
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

export const createEmptyCartState = (): CartState => ({ gameIds: [], items: [] })

export function normalizeCartState(
    raw: unknown,
    options: CartPersistenceOptions = {},
): { state: CartState; ignored: unknown[] } {
    const games = options.games ?? gameCatalog
    const knownIds = new Set(games.map((game) => game.id))
    const lines = new Map<string, CartItem>()
    const ignored: unknown[] = []

    const addLine = (gameId: number, edition?: string): boolean => {
        if (!Number.isInteger(gameId) || !knownIds.has(gameId)) return false
        const game = games.find((entry) => entry.id === gameId)
        const line: CartItem = {
            gameId,
            edition: edition?.trim() || getGameEdition(game),
        }
        const key = cartItemKey(line.gameId, line.edition)
        if (lines.has(key)) return false
        lines.set(key, line)
        return true
    }

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
        if (isRecord(value) && Array.isArray(value.items)) {
            value.items.forEach((item) => {
                if (
                    isRecord(item) &&
                    Number.isInteger(item.gameId) &&
                    (!item.edition || typeof item.edition === "string")
                ) {
                    if (!addLine(item.gameId as number, item.edition as string | undefined)) {
                        ignored.push(item)
                    }
                } else {
                    ignored.push(item)
                }
            })
            return
        }
        if (isRecord(value) && Number.isInteger(value.gameId)) {
            if (
                !addLine(
                    value.gameId as number,
                    typeof value.edition === "string" ? value.edition : undefined,
                )
            ) {
                ignored.push(value)
            }
            return
        }
        if (Number.isInteger(value) && knownIds.has(value as number)) {
            if (!addLine(value as number)) ignored.push(value)
            return
        }
        ignored.push(value)
    }

    collect(raw)
    const items = [...lines.values()]
    return {
        state: { gameIds: items.map((item) => item.gameId), items },
        ignored,
    }
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

export function addCartItem(items: CartItem[], gameId: number, edition?: string): CartItem[] {
    if (!Number.isInteger(gameId)) return items
    const line: CartItem = { gameId, edition: edition?.trim() || getGameEdition(null) }
    const key = cartItemKey(gameId, line.edition)
    if (items.some((item) => cartItemKey(item.gameId, item.edition) === key)) return items
    return [...items, line]
}

export function removeGameFromCart(gameIds: number[], id: number): number[] {
    return gameIds.filter((entry) => entry !== id)
}

export function removeCartItem(items: CartItem[], gameId: number, edition?: string): CartItem[] {
    const target = edition?.trim() || getGameEdition(null)
    const key = cartItemKey(gameId, target)
    return items.filter((item) => cartItemKey(item.gameId, item.edition) !== key)
}

/** Removes every edition of games that are already owned by canonical ID. */
export function removeOwnedCartItems(
    items: CartItem[],
    ownedIds: ReadonlyArray<number>,
): CartItem[] {
    const owned = new Set(ownedIds)
    return items.filter((item) => !owned.has(item.gameId))
}

export function clearCart(): number[] {
    return []
}

export function clearCartItems(): CartItem[] {
    return []
}
