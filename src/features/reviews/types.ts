/**
 * PLAYSCAPE review contracts.
 *
 * Reviews are authored content: every overall rating is supplied by the
 * reviewer and is never derived from category ratings, ownership, wishlists,
 * or activity. Category ratings are optional and use the same 1–10 scale.
 */
import type { GameRecord } from "../../data/games"

export const REVIEW_CATEGORIES = [
    "Story",
    "Gameplay",
    "Visuals",
    "Audio",
    "Replayability",
    "Performance",
] as const

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number]
export type ReviewCategoryRatings = Partial<Record<ReviewCategory, number>>

export const REVIEW_SCALE = { min: 1, max: 10 } as const
export const MAX_REVIEW_TEXT_LENGTH = 600

/** `prototype` marks explicit sample content, never an inferred opinion. */
export type ReviewSource = "prototype" | "local"

export type ReviewRecord = {
    id: string
    gameId: number
    personId: string
    /** Reviewer-supplied overall rating; never computed from categories. */
    overall: number
    categories: ReviewCategoryRatings
    text: string
    createdAt: string
    updatedAt?: string
    /** Present when a later submission explicitly revises an earlier review. */
    revisionOf?: string
    source: ReviewSource
}

export type ReviewDraft = {
    gameId: number
    personId: string
    overall: number
    categories?: ReviewCategoryRatings
    text?: string
}

export type NormalizedReviewDraft = {
    gameId: number
    personId: string
    overall: number
    categories: ReviewCategoryRatings
    text: string
}

export type ReviewDraftResult =
    | { ok: true; draft: NormalizedReviewDraft }
    | { ok: false; errors: string[] }

export type ReviewRecordResult =
    | { ok: true; review: ReviewRecord }
    | { ok: false; errors: string[] }

export type CreateReviewOptions = {
    now?: string
    games?: GameRecord[]
    savedIds?: number[]
    revisionOf?: string
}

export type ReviewCategoryStat = {
    category: ReviewCategory
    count: number
    average: number | null
}

export type ReviewBreakdown = {
    gameId: number | null
    reviewCount: number
    /** Mean of reviewer-supplied overall scores, never of category scores. */
    overallAverage: number | null
    categories: ReviewCategoryStat[]
}

export type ReviewInsights = {
    reviewCount: number
    prototypeCount: number
    localCount: number
    strongest: ReviewCategoryStat[]
    weakest: ReviewCategoryStat[]
    /** Difference between the highest and lowest reviewer-supplied overall scores. */
    overallSpread: number | null
    agreement: string
}

export const REVIEW_DISCOVERY_FILTERS = [
    { id: "all", label: "All games" },
    { id: "friend-reviewed", label: "Friend reviewed" },
    { id: "community-reviewed", label: "Community reviewed" },
    { id: "high-rated", label: "Overall 8+" },
] as const

export type ReviewDiscoveryFilter = (typeof REVIEW_DISCOVERY_FILTERS)[number]["id"]

/** Dedicated key; social and wishlist records keep their existing formats. */
export const REVIEW_KEYS = {
    storage: "playscape-reviews-v1",
    version: 1,
} as const
