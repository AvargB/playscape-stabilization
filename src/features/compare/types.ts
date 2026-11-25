import type { GameRecord } from "../../data/games"

/** A persisted comparison stores only canonical catalog IDs. */
export type ComparisonSelection = {
    selectedGameIds: number[]
}

export type ComparisonGame = {
    game: GameRecord | null
    addedBy: string
    addedAt: number
}

/** Retained for callers that used the earlier shape. */
export type ComparisonState = ComparisonSelection & {
    maxGames: 4
}

/** Shared handlers for the single portal-based comparison info popover. */
export type GameInfoHandlers = {
    onGameHover: (game: GameRecord, element: HTMLElement) => void
    onGameLeave: () => void
    onGameInfoToggle: (game: GameRecord, element: HTMLElement) => void
    infoGameId?: number
}

export const MAX_COMPARISON_GAMES = 4
export const MIN_COMPARISON_GAMES = 2

/** Dedicated storage key; social/wishlist records keep their own keys. */
export const COMPARE_KEYS = {
    storage: "playscape-compare-v1",
    version: 1,
} as const
