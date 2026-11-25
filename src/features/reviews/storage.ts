import { gameCatalog, type GameRecord } from "../../data/games"
import { readVersionedRecord, writeVersionedRecord } from "../../social"
import {
    normalizeReviewRecord,
    reviewKey,
} from "./model"
import {
    REVIEW_KEYS,
    type ReviewRecord,
} from "./types"

/**
 * Locally authored reviews use their own versioned key. The explicit prototype
 * reviews stay in code, and social/wishlist/compare keys are never touched.
 */
export const REVIEW_STORAGE_KEY = REVIEW_KEYS.storage
export const REVIEW_STORAGE_VERSION = REVIEW_KEYS.version

export type ReviewPersistenceOptions = {
    games?: GameRecord[]
    savedIds?: number[]
}

export type ReviewHydration = {
    /** Valid, locally authored records; one active review per person and game. */
    reviews: ReviewRecord[]
    /** Malformed, invalid, duplicate, prototype, or future-version entries. */
    ignored: unknown[]
    canPersist: boolean
    exists: boolean
    valid: boolean
    version: number
}

const isRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value)

/** Accepts the versioned envelope and a bare review array as read inputs. */
export const getStoredReviewRecords = (raw: unknown): unknown[] | null => {
    if (Array.isArray(raw)) return raw
    if (!isRecord(raw)) return null
    if (Array.isArray(raw.reviews)) return raw.reviews
    if (isRecord(raw.state)) return getStoredReviewRecords(raw.state)
    return null
}

const reviewTime = (review: ReviewRecord): number =>
    Date.parse(review.updatedAt ?? review.createdAt) || 0

const isNewer = (candidate: ReviewRecord, current: ReviewRecord): boolean =>
    reviewTime(candidate) >= reviewTime(current)

/**
 * Normalize persisted reviews without inventing content. Records that fail
 * validation, prototype records, duplicate IDs, and duplicate person/game
 * pairs are ignored; the most recently timestamped duplicate wins.
 */
export const normalizePersistedReviews = (
    raw: unknown,
    options: ReviewPersistenceOptions = {},
): { reviews: ReviewRecord[]; ignored: unknown[] } => {
    const stored = getStoredReviewRecords(raw)
    if (!stored) return { reviews: [], ignored: [] }

    const games = options.games ?? gameCatalog
    const savedIds = options.savedIds ?? []
    const selected = new Map<string, { entry: unknown; review: ReviewRecord }>()
    const keyToId = new Map<string, string>()
    const ignored: unknown[] = []

    for (const entry of stored) {
        const review = normalizeReviewRecord(entry, games, savedIds)
        if (!review || review.source !== "local") {
            ignored.push(entry)
            continue
        }

        const key = reviewKey(review.gameId, review.personId)
        const match =
            selected.get(review.id) ??
            (keyToId.has(key) ? selected.get(keyToId.get(key) as string) : undefined)

        if (!match) {
            selected.set(review.id, { entry, review })
            keyToId.set(key, review.id)
            continue
        }

        if (!isNewer(review, match.review)) {
            ignored.push(entry)
            continue
        }

        if (match.review.id !== review.id) {
            selected.delete(match.review.id)
        }
        ignored.push(match.entry)
        selected.set(review.id, { entry, review })
        keyToId.set(key, review.id)
    }

    return { reviews: [...selected.values()].map((item) => item.review), ignored }
}

/** Future versions are never downgraded or interpreted by this version. */
export const loadReviewState = (
    options: ReviewPersistenceOptions = {},
): ReviewHydration => {
    const stored = readVersionedRecord(REVIEW_STORAGE_KEY)
    const storedRecords = getStoredReviewRecords(stored.state)
    const hasFutureVersion = stored.version > REVIEW_STORAGE_VERSION
    const normalized = hasFutureVersion
        ? { reviews: [], ignored: storedRecords ?? [] }
        : normalizePersistedReviews(stored.state, options)

    return {
        reviews: normalized.reviews,
        ignored: normalized.ignored,
        canPersist: stored.available && !hasFutureVersion,
        exists: stored.exists,
        valid: !hasFutureVersion && storedRecords !== null,
        version: stored.version,
    }
}

export const saveReviewState = (
    reviews: ReviewRecord[],
    options: ReviewPersistenceOptions = {},
): boolean => {
    const normalized = normalizePersistedReviews(reviews, options)
    return writeVersionedRecord(
        REVIEW_STORAGE_KEY,
        REVIEW_STORAGE_VERSION,
        { reviews: normalized.reviews },
    )
}
