/**
 * Prototype ownership and purchase history.
 *
 * The checkout ledger is the single source of truth for simulated purchases.
 * This module derives ownership from that ledger and from the existing seeded
 * social profile; it never keeps a second ownership list. Product surfaces
 * should call these helpers (or their bound hook equivalents) instead of
 * building their own ownership checks.
 */

import { gameCatalog, type GameRecord } from "../../data/games"
import { clearPrototypeStorage, type PrototypeResetScope } from "../../prototypeReset"
import {
    socialPeople,
    type SocialActivity,
    type SocialPerson,
} from "../../socialData"
import {
    createEmptyCheckoutState,
    formatTransactionDate,
    getOwnedGameIds as getLedgerOwnedGameIds,
    getPrototypeOwnedEditions,
} from "./model"
import type { CheckoutState, PrototypeTransaction } from "./types"

export const PROTOTYPE_USER_ID = "you"

const uniqueIds = (values: ReadonlyArray<number>): number[] => [...new Set(values)]

const personById = (personId: string, people: SocialPerson[]): SocialPerson | undefined =>
    people.find((person) => person.id === personId)

/** Seeded demo ownership remains part of the canonical prototype profile. */
export function getSeedOwnedGameIds(
    personId = PROTOTYPE_USER_ID,
    people: SocialPerson[] = socialPeople,
): number[] {
    return uniqueIds(personById(personId, people)?.owned ?? [])
}

/** Canonical owned game IDs for a person: seeded profile plus simulated ledger. */
export function getPrototypeOwnedGameIds(
    state: CheckoutState,
    personId = PROTOTYPE_USER_ID,
    people: SocialPerson[] = socialPeople,
): number[] {
    return uniqueIds([
        ...getSeedOwnedGameIds(personId, people),
        ...getLedgerOwnedGameIds(state, personId),
    ])
}

/** Ownership is always decided by canonical game ID, never by title. */
export function ownsGame(
    state: CheckoutState,
    gameId: number,
    personId = PROTOTYPE_USER_ID,
    people: SocialPerson[] = socialPeople,
): boolean {
    return Number.isInteger(gameId) && getPrototypeOwnedGameIds(state, personId, people).includes(gameId)
}

/** Owned catalog games, always resolved from the central game catalog. */
export function getOwnedGames(
    state: CheckoutState,
    games: GameRecord[] = gameCatalog,
    personId = PROTOTYPE_USER_ID,
    people: SocialPerson[] = socialPeople,
): GameRecord[] {
    const ids = new Set(getPrototypeOwnedGameIds(state, personId, people))
    return games.filter((game) => ids.has(game.id))
}

/** All simulated transactions involving a person, newest first. */
export function getPurchaseHistory(
    state: CheckoutState,
    personId = PROTOTYPE_USER_ID,
): PrototypeTransaction[] {
    return state.transactions
        .filter(
            (transaction) =>
                transaction.senderId === personId || transaction.recipientId === personId,
        )
        .slice()
        .sort((left, right) => {
            const leftTime = Date.parse(left.createdAt)
            const rightTime = Date.parse(right.createdAt)
            if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0
            return rightTime - leftTime
        })
}

/** Owned IDs for every seeded person, including gift recipients. */
export function getOwnedGameIdsByPerson(
    state: CheckoutState,
    people: SocialPerson[] = socialPeople,
): Record<string, number[]> {
    return Object.fromEntries(
        people.map((person) => [person.id, getPrototypeOwnedGameIds(state, person.id, people)]),
    )
}

/**
 * Derived activity events for the ledger. IDs are stable transaction IDs, so a
 * refresh or a second render can never create a duplicate feed event.
 */
export function getPrototypeActivity(
    state: CheckoutState,
    games: GameRecord[] = gameCatalog,
    people: SocialPerson[] = socialPeople,
): SocialActivity[] {
    const title = (gameId: number) =>
        games.find((game) => game.id === gameId)?.title ?? "a prototype game"
    const personName = (personId: string) =>
        people.find((person) => person.id === personId)?.name ?? "a prototype friend"
    const activities: SocialActivity[] = []

    for (const transaction of state.transactions) {
        const gameTitle = title(transaction.gameId)
        if (transaction.type === "personal" && transaction.senderId === PROTOTYPE_USER_ID) {
            activities.push({
                id: `purchase-${transaction.id}`,
                person: PROTOTYPE_USER_ID,
                game: transaction.gameId,
                category: "Acquired games",
                action: `added ${gameTitle} to the prototype library`,
                time: formatTransactionDate(transaction.createdAt),
                quote: "Prototype purchase — no real payment, order, or license was created.",
                why: "Recorded locally in your prototype purchase history.",
                circle: null,
                likes: 0,
            })
        }
        if (transaction.type === "gift") {
            const recipient = transaction.recipientId
            if (transaction.senderId === PROTOTYPE_USER_ID) {
                activities.push({
                    id: `gift-${transaction.id}`,
                    person: PROTOTYPE_USER_ID,
                    game: transaction.gameId,
                    category: "Prototype gifts",
                    action: `sent ${gameTitle} as a prototype gift to ${personName(recipient ?? "")}`,
                    time: formatTransactionDate(transaction.createdAt),
                    quote: "No delivery, notification, or real gift was sent.",
                    why: "A local simulated gift record was created for this prototype friend.",
                    circle: null,
                    likes: 0,
                })
            }
            if (recipient === PROTOTYPE_USER_ID && transaction.giftStatus === "accepted") {
                activities.push({
                    id: `gift-accepted-${transaction.id}`,
                    person: PROTOTYPE_USER_ID,
                    game: transaction.gameId,
                    category: "Acquired games",
                    action: `accepted ${gameTitle} as a prototype gift`,
                    time: formatTransactionDate(transaction.createdAt),
                    quote: "Prototype gift — no real game license was delivered.",
                    why: "Accepted gifts appear in the local prototype library.",
                    circle: null,
                    likes: 0,
                })
            }
        }
    }
    return activities
}

/** Appends a ledger record once; duplicate IDs and sessions are ignored. */
export function recordPurchase(
    state: CheckoutState,
    transaction: PrototypeTransaction,
    games: GameRecord[] = gameCatalog,
): CheckoutState {
    if (
        !transaction ||
        !transaction.id ||
        !transaction.sessionId ||
        !games.some((game) => game.id === transaction.gameId) ||
        state.transactions.some(
            (entry) => entry.id === transaction.id || entry.sessionId === transaction.sessionId,
        )
    ) {
        return state
    }
    if (
        transaction.type === "personal" &&
        transaction.senderId === PROTOTYPE_USER_ID &&
        getPrototypeOwnedEditions(state, PROTOTYPE_USER_ID, { games }).some(
            (entry) =>
                entry.gameId === transaction.gameId && entry.edition === transaction.edition,
        )
    ) {
        return state
    }
    const transactions = [...state.transactions, transaction]
    return {
        transactions,
        ownedGameIds: getLedgerOwnedGameIds({ transactions, ownedGameIds: state.ownedGameIds }),
    }
}

/**
 * Removes a game's dynamic purchase/gift records for prototype administration
 * or testing. Seeded demo ownership is intentionally preserved.
 */
export function removeOwnership(
    state: CheckoutState,
    gameId: number,
    personId = PROTOTYPE_USER_ID,
): CheckoutState {
    const transactions = state.transactions.filter((transaction) => {
        if (transaction.gameId !== gameId) return true
        if (transaction.type === "personal") return transaction.senderId !== personId
        return transaction.recipientId !== personId
    })
    return {
        transactions,
        ownedGameIds: getLedgerOwnedGameIds({ transactions, ownedGameIds: state.ownedGameIds }),
    }
}

/** Explicit reset only; never called during hydration or navigation. */
export function resetPrototypeData(
    scope: PrototypeResetScope = "purchases",
): CheckoutState {
    clearPrototypeStorage(scope)
    return createEmptyCheckoutState()
}

export type OwnershipApi = {
    ownsGame: (gameId: number) => boolean
    getOwnedGames: () => GameRecord[]
    getOwnedGameIds: () => number[]
    getPurchaseHistory: () => PrototypeTransaction[]
    recordPurchase: (transaction: PrototypeTransaction) => void
    removeOwnership: (gameId: number) => void
    resetPrototypeData: (scope?: PrototypeResetScope) => void
}

/** Binds a hook's current state so components never pass ownership around. */
export function createOwnershipApi(
    state: CheckoutState,
    options: {
        games?: GameRecord[]
        people?: SocialPerson[]
        personId?: string
        onStateChange?: (next: CheckoutState) => void
        onReset?: (scope: PrototypeResetScope) => void
    } = {},
): OwnershipApi {
    const games = options.games ?? gameCatalog
    const people = options.people ?? socialPeople
    const personId = options.personId ?? PROTOTYPE_USER_ID
    let current = state
    const commit = (next: CheckoutState) => {
        if (next === current) return
        current = next
        options.onStateChange?.(next)
    }
    return {
        ownsGame: (gameId) => ownsGame(current, gameId, personId, people),
        getOwnedGames: () => getOwnedGames(current, games, personId, people),
        getOwnedGameIds: () => getPrototypeOwnedGameIds(current, personId, people),
        getPurchaseHistory: () => getPurchaseHistory(current, personId),
        recordPurchase: (transaction) => commit(recordPurchase(current, transaction, games)),
        removeOwnership: (gameId) => commit(removeOwnership(current, gameId, personId)),
        resetPrototypeData: (scope = "purchases") => {
            commit(resetPrototypeData(scope))
            options.onReset?.(scope)
        },
    }
}
