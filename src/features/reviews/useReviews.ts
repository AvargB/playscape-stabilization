import * as React from "react"
import { gameCatalog, type GameRecord } from "../../data/games"
import {
    createReviewRecord,
    findReviewForPersonGame,
    prototypeReviews,
    resolveReviews,
} from "./model"
import {
    loadReviewState,
    saveReviewState,
    type ReviewHydration,
} from "./storage"
import type {
    ReviewDraft,
    ReviewRecord,
    ReviewRecordResult,
} from "./types"

export type UseReviewsOptions = {
    games?: GameRecord[]
    savedIds?: number[]
    personId?: string
}

export type ReviewState = {
    /** Explicit prototype reviews plus locally authored reviews. */
    reviews: ReviewRecord[]
    localReviews: ReviewRecord[]
    myReviews: ReviewRecord[]
    submitReview: (draft: ReviewDraft, revisionOf?: string) => ReviewRecordResult
}

/**
 * Owns locally authored reviews and hydrates only its dedicated versioned key.
 * Explicit prototype reviews are added separately every session; this hook
 * never changes social state or writes another feature's storage key.
 */
export function useReviews({
    games = gameCatalog,
    savedIds = [],
    personId = "you",
}: UseReviewsOptions = {}): ReviewState {
    const hydrationRef = React.useRef<ReviewHydration | null>(null)
    if (!hydrationRef.current) {
        hydrationRef.current = loadReviewState({ games, savedIds })
    }
    const hydration = hydrationRef.current
    const persistenceOptionsRef = React.useRef({ games, savedIds })
    persistenceOptionsRef.current = { games, savedIds }

    const [localReviews, setLocalReviews] = React.useState<ReviewRecord[]>(
        () => hydration.reviews,
    )
    const sequence = React.useRef(0)

    React.useEffect(() => {
        if (hydration.canPersist) {
            saveReviewState(localReviews, persistenceOptionsRef.current)
        }
    }, [hydration.canPersist, localReviews])

    const reviews = React.useMemo(
        () => resolveReviews([...prototypeReviews, ...localReviews], games),
        [games, localReviews],
    )
    const myReviews = React.useMemo(
        () => reviews.filter((review) => review.personId === personId),
        [reviews, personId],
    )

    const submitReview = React.useCallback(
        (draft: ReviewDraft, revisionOf?: string): ReviewRecordResult => {
            const existing = findReviewForPersonGame(localReviews, draft.gameId, personId)
            const id = `review-${personId}-${draft.gameId}-${Date.now()}-${sequence.current++}`
            const result = createReviewRecord(id, draft, {
                savedIds,
                revisionOf: revisionOf ?? existing?.id,
            })
            if (result.ok === false) return result

            setLocalReviews((current) => [
                ...current.filter(
                    (review) =>
                        !(review.gameId === result.review.gameId && review.personId === result.review.personId),
                ),
                result.review,
            ])
            return result
        },
        [localReviews, personId, savedIds],
    )

    return { reviews, localReviews, myReviews, submitReview }
}
