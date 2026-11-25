import * as React from "react"
import { gameCatalog, type GameRecord } from "../../data/games"
import {
    createPrototypeTransaction,
    getOwnedGameIds,
    getPersonalPurchases,
    getSentGifts,
    respondToGift as respondToGiftRecord,
} from "./model"
import {
    loadCheckoutState,
    saveCheckoutState,
    type CheckoutHydration,
} from "./storage"
import type {
    CheckoutResult,
    CheckoutSession,
    CheckoutState,
    GiftDecision,
    GiftResponseResult,
    PrototypeTransaction,
} from "./types"

export type UseCheckoutOptions = {
    games?: GameRecord[]
}

export type CheckoutApi = {
    state: CheckoutState
    transactions: PrototypeTransaction[]
    ownedGameIds: number[]
    personalPurchases: PrototypeTransaction[]
    sentGifts: PrototypeTransaction[]
    completeCheckout: (session: CheckoutSession) => CheckoutResult
    respondToGift: (id: string, decision: GiftDecision) => GiftResponseResult
}

/**
 * Owns the simulated checkout ledger and local library overlay. Every write
 * goes through the dedicated versioned key; existing social, wishlist, review,
 * and compare state is never touched.
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
    const stateRef = React.useRef(state)
    stateRef.current = state
    const submittingRef = React.useRef<string | null>(null)
    const respondingRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        if (hydration.canPersist) {
            saveCheckoutState(state, persistenceOptionsRef.current)
        }
    }, [hydration.canPersist, state])

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
                const result = createPrototypeTransaction(session, { games })
                if (!result.ok) return result

                const next: CheckoutState = {
                    transactions: [...stateRef.current.transactions, result.transaction],
                    ownedGameIds: [],
                }
                next.ownedGameIds = getOwnedGameIds(next)
                stateRef.current = next
                setState(next)
                return result
            } finally {
                submittingRef.current = null
            }
        },
        [games],
    )

    const respondToGift = React.useCallback(
        (id: string, decision: GiftDecision): GiftResponseResult => {
            if (respondingRef.current === id) {
                return { ok: false, errors: ["This gift response is already being saved."] }
            }
            const existing = stateRef.current.transactions.find(
                (transaction) => transaction.id === id,
            )
            if (!existing) {
                return { ok: false, errors: ["That prototype gift could not be found."] }
            }

            respondingRef.current = id
            try {
                const result = respondToGiftRecord(existing, decision)
                if (!result.ok) return result

                const nextTransactions = stateRef.current.transactions.map((transaction) =>
                    transaction.id === id ? result.transaction : transaction,
                )
                const next: CheckoutState = {
                    transactions: nextTransactions,
                    ownedGameIds: [],
                }
                next.ownedGameIds = getOwnedGameIds(next)
                stateRef.current = next
                setState(next)
                return result
            } finally {
                respondingRef.current = null
            }
        },
        [],
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
        respondToGift,
    }
}
