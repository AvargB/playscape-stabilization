import * as React from "react"
import { gameCatalog, type GameRecord } from "../../data/games"
import { getGameEdition } from "./edition"
import {
    addCartItem,
    addGameToCart,
    clearCart,
    clearCartItems,
    loadCartState,
    removeCartItem,
    removeGameFromCart,
    removeOwnedCartItems,
    saveCartState,
    type CartItem,
    type CartState,
} from "./cart"

export type UseCartOptions = {
    games?: GameRecord[]
}

export type CartApi = {
    gameIds: number[]
    items: CartItem[]
    add: (id: number) => void
    addEdition: (id: number, edition?: string) => void
    remove: (id: number) => void
    removeEdition: (id: number, edition?: string) => void
    removeOwned: (gameIds: ReadonlyArray<number>) => void
    clear: () => void
}

/** Local prototype cart; game identity and edition are validated from the catalog. */
export function useCart({ games = gameCatalog }: UseCartOptions = {}): CartApi {
    const hydrationRef = React.useRef<ReturnType<typeof loadCartState> | null>(null)
    if (!hydrationRef.current) hydrationRef.current = loadCartState({ games })
    const hydration = hydrationRef.current
    const optionsRef = React.useRef({ games })
    optionsRef.current = { games }

    const [state, setState] = React.useState<CartState>(() => hydration.state)
    const stateRef = React.useRef(state)
    stateRef.current = state

    React.useEffect(() => {
        if (hydration.canPersist) saveCartState(state, optionsRef.current)
    }, [hydration.canPersist, state])

    const add = React.useCallback((id: number) => {
        if (!optionsRef.current.games.some((game) => game.id === id)) return
        const nextItems = addCartItem(stateRef.current.items, id, getGameEdition(
            optionsRef.current.games.find((game) => game.id === id),
        ))
        if (nextItems === stateRef.current.items) return
        const next: CartState = {
            items: nextItems,
            gameIds: addGameToCart(stateRef.current.gameIds, id),
        }
        stateRef.current = next
        setState(next)
    }, [])

    const addEdition = React.useCallback((id: number, edition?: string) => {
        const game = optionsRef.current.games.find((entry) => entry.id === id)
        if (!game) return
        const nextItems = addCartItem(stateRef.current.items, id, edition ?? getGameEdition(game))
        if (nextItems === stateRef.current.items) return
        const next: CartState = {
            items: nextItems,
            gameIds: addGameToCart(stateRef.current.gameIds, id),
        }
        stateRef.current = next
        setState(next)
    }, [])

    const remove = React.useCallback((id: number) => {
        // The cart control is per game, so it removes every edition of that game.
        const nextItems = stateRef.current.items.filter((item) => item.gameId !== id)
        if (nextItems.length === stateRef.current.items.length) return
        const next: CartState = {
            items: nextItems,
            gameIds: removeGameFromCart(stateRef.current.gameIds, id),
        }
        stateRef.current = next
        setState(next)
    }, [])

    const removeEdition = React.useCallback((id: number, edition?: string) => {
        const nextItems = removeCartItem(stateRef.current.items, id, edition)
        if (nextItems === stateRef.current.items) return
        const next: CartState = {
            items: nextItems,
            gameIds: nextItems.map((item) => item.gameId),
        }
        stateRef.current = next
        setState(next)
    }, [])

    const removeOwned = React.useCallback((gameIds: ReadonlyArray<number>) => {
        const nextItems = removeOwnedCartItems(stateRef.current.items, gameIds)
        if (nextItems.length === stateRef.current.items.length) return
        const next: CartState = {
            items: nextItems,
            gameIds: [...new Set(nextItems.map((item) => item.gameId))],
        }
        stateRef.current = next
        setState(next)
    }, [])

    const clear = React.useCallback(() => {
        const next: CartState = { gameIds: clearCart(), items: clearCartItems() }
        if (
            next.items.length === stateRef.current.items.length &&
            next.gameIds.length === stateRef.current.gameIds.length
        ) return
        stateRef.current = next
        setState(next)
    }, [])

    return {
        gameIds: state.gameIds,
        items: state.items,
        add,
        addEdition,
        remove,
        removeEdition,
        removeOwned,
        clear,
    }
}
