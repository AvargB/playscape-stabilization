/**
 * Edition identity for the local prototype cart.
 *
 * The catalog stays the single source of truth: a game may declare an edition,
 * otherwise the standard edition label is derived at the point of use. Cart
 * lines are keyed by game ID + edition so a duplicate of the same edition is
 * ignored while a deliberately different edition can coexist.
 */

import type { GameRecord } from "../../data/games"

export const PROTOTYPE_STANDARD_EDITION = "Standard edition"

export type CartEdition = string

export type EditionedGame = Pick<GameRecord, "edition">

export function getGameEdition(game: EditionedGame | null | undefined): CartEdition {
    const edition = game?.edition
    return typeof edition === "string" && edition.trim() ? edition.trim() : PROTOTYPE_STANDARD_EDITION
}

export function cartItemKey(gameId: number, edition: CartEdition): string {
    return `${gameId}::${edition}`
}
