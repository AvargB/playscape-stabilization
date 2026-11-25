import * as React from "react"
import { gameCatalog, type GameRecord } from "../../data/games"
import {
    addGameToCart,
    clearCart,
    loadCartState,
    removeGameFromCart,
    saveCartState,
    type CartState,
} from "./cart"

export type UseCartOptions = {
    games?: GameRecord[]
}

export type CartApi = {
    gameIds: number[]
    add: (id: number) => void
    remove: (id: number) => void
    clear: () => void
}

/** Local prototype cart; game identity is always validated from the catalog. */
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
        const next = addGameToCart(stateRef.current.gameIds, id)
        if (next === stateRef.current.gameIds) return
        stateRef.current = { gameIds: next }
        setState(stateRef.current)
    }, [])

    const remove = React.useCallback((id: number) => {
        const next = removeGameFromCart(stateRef.current.gameIds, id)
        if (next === stateRef.current.gameIds) return
        stateRef.current = { gameIds: next }
        setState(stateRef.current)
    }, [])

    const clear = React.useCallback(() => {
        const next = clearCart()
        if (next === stateRef.current.gameIds) return
        stateRef.current = { gameIds: next }
        setState(stateRef.current)
    }, [])

    return { gameIds: state.gameIds, add, remove, clear }
}
