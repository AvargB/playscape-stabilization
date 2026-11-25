import * as React from "react"
import { gameCatalog, type GameRecord } from "../../data/games"
import type { PrototypeResetScope } from "../../prototypeReset"
import type { SocialActivity } from "../../socialData"
import {
    createPrototypeTransaction,
    getOwnedGameIds as getLedgerOwnedGameIds,
    getPersonalPurchases,
    getSentGifts,
} from "./model"
import {
    getOwnedGameIdsByPerson,
    getOwnedGames as resolveOwnedGames,
    getPrototypeActivity,
    getPrototypeOwnedGameIds,
    getPurchaseHistory as resolvePurchaseHistory,
    ownsGame as resolveOwnership,
    recordPurchase as recordPurchaseRecord,
    removeOwnership as removeOwnershipRecord,
    resetPrototypeData as resetLedgerPrototypeData,
} from "./ownership"
import {
    loadCheckoutState,
    saveCheckoutState,
    type CheckoutHydration,
} from "./storage"
import type {
    CheckoutResult,
    CheckoutSession,
    CheckoutState,
    PrototypeTransaction,
} from "./types"

export type UseCheckoutOptions = {
    games?: GameRecord[]
}

export type CheckoutApi = {
    state: CheckoutState
    transactions: PrototypeTransaction[]
    /** Ledger-only view retained for existing callers. */
    ownedGameIds: number[]
    personalPurchases: PrototypeTransaction[]
    sentGifts: PrototypeTransaction[]
    completeCheckout: (session: CheckoutSession) => CheckoutResult
    /** Shared ownership selectors, always bound to the live ledger. */
    ownsGame: (gameId: number) => boolean
    getOwnedGames: () => GameRecord[]
    getOwnedGameIds: () => number[]
    getPurchaseHistory: () => PrototypeTransaction[]
    getOwnedGameIdsByPerson: () => Record<string, number[]>
    getPrototypeActivity: () => SocialActivity[]
    recordPurchase: (transaction: PrototypeTransaction) => void
    removeOwnership: (gameId: number) => void
    resetPrototypeData: (scope?: PrototypeResetScope) => void
}

/**
 * Owns the simulated checkout ledger and local library overlay. Every write
 * goes through the dedicated versioned key; existing social, wishlist, review,
 * and compare state is never touched except by an explicit full reset.
 */
export function useCheckout({ games = gameCatalog }: UseCheckoutOptions = {}): CheckoutApi {
    const hydrationRef = React.useRef<CheckoutHydration | null>(null)
    if (!hydrationRef.current) {
        hydrationRef.current = loadCheckoutState({ games })
    }
    const hydration = hydrationRef.current
    const persistenceOptionsRef = React.useRef({ games })
    persistenceOptionsRef.current = { games }

    const [state, setState] = React.useState<CheckoutState>(() => hydration.state)
    const [canPersist, setCanPersist] = React.useState(hydration.canPersist)
    const stateRef = React.useRef(state)
    stateRef.current = state
    const submittingRef = React.useRef<string | null>(null)
    const skipPersistRef = React.useRef(false)

    React.useEffect(() => {
        if (skipPersistRef.current) {
            skipPersistRef.current = false
            return
        }
        if (canPersist) {
            saveCheckoutState(state, persistenceOptionsRef.current)
        }
    }, [canPersist, state])

    const completeCheckout = React.useCallback(
        (session: CheckoutSession): CheckoutResult => {
            if (!session?.id) {
                return { ok: false, errors: ["This checkout session could not be identified."] }
            }
            if (submittingRef.current === session.id) {
                return { ok: false, errors: ["This checkout is already being submitted."] }
            }
            if (stateRef.current.transactions.some((entry) => entry.sessionId === session.id)) {
                return { ok: false, errors: ["This checkout session was already completed."] }
            }

            submittingRef.current = session.id
            try {
                const result = createPrototypeTransaction(session, {
                    games,
                    state: stateRef.current,
                })
                if (!result.ok) return result

                const next: CheckoutState = {
                    transactions: [...stateRef.current.transactions, result.transaction],
                    ownedGameIds: [],
                }
                next.ownedGameIds = getLedgerOwnedGameIds(next)
                stateRef.current = next
                setState(next)
                return result
            } finally {
                submittingRef.current = null
            }
        },
        [games],
    )

    const commit = React.useCallback((next: CheckoutState) => {
        if (next === stateRef.current) return
        stateRef.current = next
        setState(next)
    }, [])

    const ownsGame = React.useCallback(
        (gameId: number) => resolveOwnership(stateRef.current, gameId),
        [],
    )
    const getOwnedGameIds = React.useCallback(
        () => getPrototypeOwnedGameIds(stateRef.current),
        [],
    )
    const getOwnedGames = React.useCallback(
        () => resolveOwnedGames(stateRef.current, games),
        [games],
    )
    const getPurchaseHistory = React.useCallback(
        () => resolvePurchaseHistory(stateRef.current),
        [],
    )
    const getOwnedGameIdsByPersonCallback = React.useCallback(
        () => getOwnedGameIdsByPerson(stateRef.current),
        [],
    )
    const getPrototypeActivityCallback = React.useCallback(
        () => getPrototypeActivity(stateRef.current, games),
        [games],
    )
    const recordPurchase = React.useCallback(
        (transaction: PrototypeTransaction) => {
            commit(recordPurchaseRecord(stateRef.current, transaction, games))
        },
        [commit, games],
    )
    const removeOwnership = React.useCallback(
        (gameId: number) => commit(removeOwnershipRecord(stateRef.current, gameId)),
        [commit],
    )
    const resetPrototypeData = React.useCallback(
        (scope: PrototypeResetScope = "purchases") => {
            const empty = resetLedgerPrototypeData(scope)
            skipPersistRef.current = true
            setCanPersist(true)
            commit(empty)
        },
        [commit],
    )

    const personalPurchases = React.useMemo(
        () => getPersonalPurchases(state),
        [state],
    )
    const sentGifts = React.useMemo(() => getSentGifts(state), [state])

    return {
        state,
        transactions: state.transactions,
        ownedGameIds: state.ownedGameIds,
        personalPurchases,
        sentGifts,
        completeCheckout,
        ownsGame,
        getOwnedGames,
        getOwnedGameIds,
        getPurchaseHistory,
        getOwnedGameIdsByPerson: getOwnedGameIdsByPersonCallback,
        getPrototypeActivity: getPrototypeActivityCallback,
        recordPurchase,
        removeOwnership,
        resetPrototypeData,
    }
}
