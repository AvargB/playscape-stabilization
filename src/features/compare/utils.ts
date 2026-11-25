import {
    buildComparisonSummary,
    gameCatalog,
    getGameById,
    resolveGameRecord,
    searchGames,
    type GameRecord,
} from "../../data/games"
import {
    buildReviewBreakdown,
    getFriendGameReviews,
    getGameReviews,
    type ReviewRecord,
} from "../reviews"
import {
    MAX_COMPARISON_GAMES,
    MIN_COMPARISON_GAMES,
} from "./types"

export const canAddGame = (selectedGameIds: number[]): boolean =>
    selectedGameIds.length < MAX_COMPARISON_GAMES

export const canRemoveGame = (selectedGameIds: number[]): boolean =>
    selectedGameIds.length > MIN_COMPARISON_GAMES

export const addGameToComparison = (
    gameId: number,
    selectedGameIds: number[]
): { success: boolean; newIds: number[]; error?: string } => {
    if (selectedGameIds.includes(gameId)) {
        return { success: false, newIds: selectedGameIds, error: "Game already in comparison" }
    }
    if (!canAddGame(selectedGameIds)) {
        return {
            success: false,
            newIds: selectedGameIds,
            error: `Maximum of ${MAX_COMPARISON_GAMES} games reached. Remove a game to add another.`,
        }
    }
    return { success: true, newIds: [...selectedGameIds, gameId] }
}

export const removeGameFromComparison = (
    gameId: number,
    selectedGameIds: number[]
): number[] => selectedGameIds.filter((id) => id !== gameId)

export const clearComparison = (): number[] => []

/** Keep only valid, unique canonical IDs, in selection order. */
export const resolveComparisonIds = (
    ids: unknown,
    catalog: GameRecord[] = gameCatalog
): number[] => {
    if (!Array.isArray(ids)) return []
    const seen = new Set<number>()
    const resolved: number[] = []
    for (const id of ids) {
        if (typeof id !== "number" || !Number.isInteger(id)) continue
        if (!getGameById(id, catalog) || seen.has(id)) continue
        seen.add(id)
        resolved.push(id)
        if (resolved.length === MAX_COMPARISON_GAMES) break
    }
    return resolved
}

/** IDs in a stored selection that no longer resolve to catalog records. */
export const getUnresolvedComparisonIds = (
    ids: unknown,
    catalog: GameRecord[] = gameCatalog
): unknown[] => {
    if (!Array.isArray(ids)) return []
    return ids.filter((id) => {
        if (typeof id !== "number" || !Number.isInteger(id)) return true
        return !getGameById(id, catalog)
    })
}

export const getComparisonGames = (
    selectedGameIds: number[],
    catalog: GameRecord[] = gameCatalog
): GameRecord[] =>
    selectedGameIds
        .map((id) => resolveGameRecord(id, catalog))
        .filter((game): game is GameRecord => Boolean(game))

export const getComparisonSummary = (
    selectedGameIds: number[],
    catalog: GameRecord[] = gameCatalog
) => buildComparisonSummary(getComparisonGames(selectedGameIds, catalog), catalog)

export const hasDuplicates = (selectedGameIds: number[]): boolean =>
    new Set(selectedGameIds).size !== selectedGameIds.length

export type CatalogSearchResult = {
    game: GameRecord
    selected: boolean
}

/** Catalog-backed picker results; selection status never comes from a second database. */
export const searchComparisonGames = (
    query: string,
    selectedGameIds: number[] = [],
    catalog: GameRecord[] = gameCatalog
): CatalogSearchResult[] =>
    searchGames(query, catalog).map((game) => ({
        game,
        selected: selectedGameIds.includes(game.id),
    }))

/* ------------------------------------------------------------------------- */
/* Comparison analysis                                                         */
/* ------------------------------------------------------------------------- */

export type ComparisonRowStatus = "shared" | "different" | "unavailable" | "single"

export type ComparisonRow = {
    id: string
    label: string
    values: string[]
    status: ComparisonRowStatus
    /** Values present in every selected game, even when the row otherwise differs. */
    sharedValues: string[]
    /** Text-only description used by assistive technology. */
    description: string
}

export type ComparisonFilter = "all" | "differences" | "shared"

export type PriceComparison = {
    lowestPrice: number | null
    lowestPriceIds: number[]
    differences: Array<{ gameId: number; amount: number }>
    hasDifference: boolean
}

export type SharedCharacteristic = {
    label: string
    value: string
}

const NOT_LISTED = "Not listed"

const isPresent = (value: unknown): boolean => {
    const text = String(value ?? "").trim()
    return text.length > 0 && text.toLowerCase() !== NOT_LISTED.toLowerCase()
}

const displayValue = (value: unknown): string =>
    isPresent(value) ? String(value).trim() : NOT_LISTED

const tokens = (value: unknown): string[] => {
    if (!isPresent(value)) return []
    return String(value)
        .split(/[,·]|\s+and\s+/i)
        .map((part) => part.trim())
        .filter(Boolean)
}

const comparable = (value: unknown): string =>
    tokens(value)
        .map((part) => part.toLowerCase())
        .sort()
        .join("|")

const overlap = (values: unknown[]): string[] => {
    const present = values.filter(isPresent)
    if (present.length < 2 || present.length !== values.length) return []
    const lists = present.map((value) => [...new Set(tokens(value).map((part) => part.toLowerCase()))])
    return lists
        .reduce((common, list) => common.filter((value) => list.includes(value)))
        .sort()
}

/** Derive capabilities only from catalog strings; never assume unlisted features. */
export const getPlayCapabilities = (game: GameRecord) => {
    const text = [game.players, ...game.playerModes].filter(Boolean).join(" ")
    const has = (pattern: RegExp) => pattern.test(text)
    return {
        local: has(/\blocal\b/i),
        online: has(/\bonline\b/i),
        coop: has(/co-?op|cooperative/i),
        multiplayer: has(/multiplayer/i),
    }
}

const listedOrNot = (listed: boolean) => (listed ? "Listed" : NOT_LISTED)

type RowDefinition = {
    id: string
    label: string
    value: (game: GameRecord) => unknown
    /** Show token-level overlap even when whole values differ. */
    overlap?: boolean
}

export const buildComparisonRows = (games: GameRecord[]): ComparisonRow[] => {
    const definitions: RowDefinition[] = [
        { id: "developer", label: "Developer", value: (game) => game.developer },
        { id: "publisher", label: "Publisher", value: (game) => game.publisher },
        { id: "releaseDate", label: "Release date", value: (game) => game.releaseDate },
        { id: "genre", label: "Genre", value: (game) => game.genres.join(", "), overlap: true },
        { id: "moods", label: "Mood / tags", value: (game) => game.moodTags.join(", "), overlap: true },
        { id: "atmosphere", label: "Atmosphere", value: (game) => game.atmosphere },
        { id: "difficulty", label: "Difficulty", value: (game) => game.difficulty },
        { id: "gameplayStyle", label: "Gameplay style", value: (game) => game.playerModes.join(", "), overlap: true },
        { id: "platforms", label: "Platforms", value: (game) => game.platforms.join(", "), overlap: true },
        { id: "players", label: "Player count", value: (game) => game.players },
        { id: "localPlay", label: "Local play", value: (game) => listedOrNot(getPlayCapabilities(game).local) },
        { id: "onlinePlay", label: "Online play", value: (game) => listedOrNot(getPlayCapabilities(game).online) },
        { id: "coop", label: "Co-op support", value: (game) => listedOrNot(getPlayCapabilities(game).coop) },
        { id: "multiplayer", label: "Multiplayer", value: (game) => listedOrNot(getPlayCapabilities(game).multiplayer) },
        { id: "session", label: "Typical session", value: (game) => `${game.sessionMinutes || game.session} min` },
        { id: "mainStory", label: "Est. main story", value: (game) => game.estimatedMainStoryHours && `${game.estimatedMainStoryHours} hours` },
        { id: "completionist", label: "Est. completionist", value: (game) => game.estimatedCompletionistHours && `${game.estimatedCompletionistHours} hours` },
        { id: "reviewScore", label: "Catalog review score", value: (game) => game.reviewScore },
        { id: "metadataStatus", label: "Catalog data status", value: (game) => game.metadataStatus },
    ]

    return definitions.flatMap((definition) => {
        const raw = games.map(definition.value)
        if (!raw.some(isPresent)) return []

        const values = raw.map(displayValue)
        const sharedValues = definition.overlap
            ? overlap(raw)
            : games.length >= MIN_COMPARISON_GAMES &&
                raw.every(isPresent) &&
                new Set(raw.map(comparable)).size === 1
              ? values.slice(0, 1)
              : []
        const hasMissing = !raw.every(isPresent)
        const status: ComparisonRowStatus =
            games.length < MIN_COMPARISON_GAMES
                ? "single"
                : hasMissing
                  ? "unavailable"
                  : new Set(raw.map(comparable)).size === 1
                    ? "shared"
                    : "different"
        const description =
            status === "shared"
                ? `${definition.label} is the same for every selected game.`
                : status === "single"
                  ? `${definition.label} is shown for the one selected game. Add another game to compare.`
                  : status === "unavailable"
                    ? `${definition.label} is unavailable for at least one selected game.`
                    : sharedValues.length
                      ? `${definition.label} differs; values shared by all: ${sharedValues.join(", ")}.`
                      : `${definition.label} differs between selected games.`

        return [{ id: definition.id, label: definition.label, values, status, sharedValues, description }]
    })
}

export const filterComparisonRows = (
    rows: ComparisonRow[],
    filter: ComparisonFilter
): ComparisonRow[] => {
    if (filter === "differences") return rows.filter((row) => row.status === "different")
    if (filter === "shared") return rows.filter((row) => row.status === "shared")
    return rows
}

export const getPriceComparison = (games: GameRecord[]): PriceComparison => {
    const prices = games.filter((game) => Number.isFinite(game.price)).map((game) => game.price)
    if (!prices.length) {
        return { lowestPrice: null, lowestPriceIds: [], differences: [], hasDifference: false }
    }
    const lowestPrice = Math.min(...prices)
    return {
        lowestPrice,
        lowestPriceIds: games.filter((game) => game.price === lowestPrice).map((game) => game.id),
        differences: games.map((game) => ({
            gameId: game.id,
            amount: Number((game.price - lowestPrice).toFixed(2)),
        })),
        hasDifference: Math.max(...prices) > lowestPrice,
    }
}

/** Price is shown as stored catalog data, never as a live store price. */
export const getPriceRow = (
    games: GameRecord[],
    price: PriceComparison = getPriceComparison(games)
): ComparisonRow => {
    const lowest = price.lowestPrice === null ? "Not listed" : `$${price.lowestPrice.toFixed(2)}`
    const hasMissingPrice = games.some((game) => !Number.isFinite(game.price))
    const status: ComparisonRowStatus =
        games.length < MIN_COMPARISON_GAMES
            ? "single"
            : hasMissingPrice
              ? "unavailable"
              : price.lowestPrice !== null &&
                  games.every((game) => game.price === price.lowestPrice)
                ? "shared"
                : "different"
    const lowestTitles = games
        .filter((game) => price.lowestPriceIds.includes(game.id))
        .map((game) => game.title)
    return {
        id: "price",
        label: "Listed catalog price",
        values: games.map((game) => {
            const base = `$${game.price.toFixed(2)}`
            const difference = price.differences.find((item) => item.gameId === game.id)
            return difference && difference.amount > 0
                ? `${base} (+$${difference.amount.toFixed(2)} vs lowest)`
                : base
        }),
        status,
        sharedValues: [],
        description:
            status === "unavailable"
                ? "A listed catalog price is unavailable for at least one selected game."
                : status === "shared"
                  ? `All selected games have the same listed catalog price of ${lowest}.`
                  : `Lowest listed catalog price: ${lowestTitles.join(", ")} at ${lowest}. Prices are catalog samples, not live prices.`,
    }
}

/**
 * Review facts are optional comparison context, never a ranking verdict.
 * Rows appear only when at least one selected game has an authored review.
 */
export const buildComparisonReviewRows = (
    games: GameRecord[],
    reviews: ReviewRecord[],
): ComparisonRow[] => {
    const hasReview = games.some((game) => getGameReviews(reviews, game.id).length > 0)
    if (!hasReview) return []

    const fact = (
        id: string,
        label: string,
        value: (game: GameRecord) => string,
        description: string,
    ): ComparisonRow => {
        const values = games.map(value)
        const allListed = values.every((entry) => entry !== NOT_LISTED)
        const status: ComparisonRowStatus =
            games.length < MIN_COMPARISON_GAMES
                ? "single"
                : !allListed
                  ? "unavailable"
                  : new Set(values).size === 1
                    ? "shared"
                    : "different"
        return {
            id,
            label,
            values,
            status,
            sharedValues: status === "shared" ? values.slice(0, 1) : [],
            description:
                status === "unavailable"
                    ? `${description} At least one selected game has no listed value.`
                    : description,
        }
    }

    return [
        fact(
            "communityReviewCount",
            "Community reviews",
            (game) => {
                const count = getGameReviews(reviews, game.id).length
                return count ? `${count} ${count === 1 ? "review" : "reviews"}` : NOT_LISTED
            },
            "Community review counts come only from authored reviews; Not listed means no reviews were supplied.",
        ),
        fact(
            "communityReviewOverall",
            "Reviewer-supplied overall",
            (game) => {
                const breakdown = buildReviewBreakdown(getGameReviews(reviews, game.id), game.id)
                return breakdown.overallAverage === null
                    ? NOT_LISTED
                    : `${breakdown.overallAverage.toFixed(1)}/10 · ${breakdown.reviewCount} ${breakdown.reviewCount === 1 ? "review" : "reviews"}`
            },
            "Overall values are supplied by reviewers and are never computed from category ratings.",
        ),
        fact(
            "friendReviewCount",
            "Friends’ reviews",
            (game) => {
                const count = getFriendGameReviews(reviews, game.id).length
                return count ? `${count} friend ${count === 1 ? "review" : "reviews"}` : NOT_LISTED
            },
            "Direct-friend review counts come from the existing friendship graph; open a game to read them.",
        ),
    ]
}

export const getSharedCharacteristics = (
    games: GameRecord[],
    rows: ComparisonRow[] = buildComparisonRows(games)
): SharedCharacteristic[] =>
    rows.flatMap((row) =>
        row.sharedValues.map((value) => ({ label: row.label, value }))
    )

export const getMajorDifferences = (
    games: GameRecord[],
    rows: ComparisonRow[] = buildComparisonRows(games)
): ComparisonRow[] => rows.filter((row) => row.status === "different")

/** Games whose catalog platforms include the selected platform (case-insensitive). */
export const getPlatformSupport = (games: GameRecord[], platform: string): number[] => {
    const requested = platform.trim().toLowerCase()
    if (!requested) return []
    return games
        .filter((game) => game.platforms.some((value) => value.toLowerCase() === requested))
        .map((game) => game.id)
}
