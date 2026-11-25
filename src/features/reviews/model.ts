import { gameCatalog, getGameById, type GameRecord } from "../../data/games"
import {
    initialFriendships,
    socialPeople,
    type SocialFriendship,
    type SocialPerson,
} from "../../socialData"
import {
    MAX_REVIEW_TEXT_LENGTH,
    REVIEW_CATEGORIES,
    REVIEW_SCALE,
    type CreateReviewOptions,
    type ReviewBreakdown,
    type ReviewInsights,
    type ReviewCategory,
    type ReviewCategoryRatings,
    type ReviewCategoryStat,
    type ReviewDraft,
    type ReviewDraftResult,
    type ReviewRecord,
    type ReviewRecordResult,
} from "./types"

const isRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value)

const isRating = (value: unknown): value is number =>
    Number.isInteger(value) &&
    (value as number) >= REVIEW_SCALE.min &&
    (value as number) <= REVIEW_SCALE.max

const isCategory = (value: string): value is ReviewCategory =>
    (REVIEW_CATEGORIES as readonly string[]).includes(value)

export function getReviewRelationship(
    person: SocialPerson,
    gameId: number,
    savedIds: number[] = [],
): "owns" | "wishlisted" | "none" {
    const saved = new Set(
        savedIds.filter((id): id is number => Number.isInteger(id)).map(Number),
    )
    if (person.owned.includes(gameId)) return "owns"
    if (person.wishlist.includes(gameId) || saved.has(gameId)) return "wishlisted"
    return "none"
}

/**
 * Reviews must be authored by someone with a real catalog relationship to the
 * game. Ownership and wishlist membership establish eligibility; they never
 * supply a rating or an opinion by themselves.
 */
export function isEligibleReviewAuthor(
    personId: string,
    gameId: number,
    people: SocialPerson[] = socialPeople,
    savedIds: number[] = [],
): boolean {
    const person = people.find((entry) => entry.id === personId)
    return Boolean(person && getReviewRelationship(person, gameId, savedIds) !== "none")
}

/** Validate an authored draft before it becomes a review record. */
export function normalizeReviewDraft(
    value: unknown,
    games: GameRecord[] = gameCatalog,
    savedIds: number[] = [],
): ReviewDraftResult {
    if (!isRecord(value)) {
        return { ok: false, errors: ["Review details are missing."] }
    }

    const errors: string[] = []
    const { gameId, personId, overall } = value

    if (!Number.isInteger(gameId) || !getGameById(gameId as number, games)) {
        errors.push("Choose a game from the catalog.")
    }
    if (typeof personId !== "string" || !socialPeople.some((person) => person.id === personId)) {
        errors.push("Choose a known player.")
    }
    if (!isRating(overall)) {
        errors.push(`Overall rating must be a whole number from ${REVIEW_SCALE.min} to ${REVIEW_SCALE.max}.`)
    }

    const categories: ReviewCategoryRatings = {}
    const rawCategories = value.categories
    if (rawCategories !== undefined && !isRecord(rawCategories)) {
        errors.push("Category ratings must be a set of named ratings.")
    } else if (isRecord(rawCategories)) {
        for (const [key, rating] of Object.entries(rawCategories)) {
            if (!isCategory(key)) {
                errors.push(`Unknown review category: ${key}.`)
            } else if (!isRating(rating)) {
                errors.push(`${key} rating must be a whole number from ${REVIEW_SCALE.min} to ${REVIEW_SCALE.max}.`)
            } else {
                categories[key] = rating
            }
        }
    }

    const text = typeof value.text === "string" ? value.text.trim() : ""
    if (!text) {
        errors.push("Write a short review before publishing.")
    }
    if (text.length > MAX_REVIEW_TEXT_LENGTH) {
        errors.push(`Review text must be ${MAX_REVIEW_TEXT_LENGTH} characters or fewer.`)
    }

    if (Number.isInteger(gameId) && typeof personId === "string") {
        if (!isEligibleReviewAuthor(personId, gameId as number, socialPeople, savedIds)) {
            errors.push("Only someone who owns or wishlists this game can review it.")
        }
    }

    if (errors.length) return { ok: false, errors }

    return {
        ok: true,
        draft: {
            gameId: gameId as number,
            personId: personId as string,
            overall: overall as number,
            categories,
            text,
        },
    }
}

/** Create a locally authored review with an explicit reviewer-supplied overall. */
export function createReviewRecord(
    id: string,
    draft: ReviewDraft,
    options: CreateReviewOptions = {},
): ReviewRecordResult {
    const result = normalizeReviewDraft(
        draft,
        options.games ?? gameCatalog,
        options.savedIds ?? [],
    )
    if (result.ok === false) return { ok: false, errors: result.errors }

    if (typeof id !== "string" || !id.trim()) {
        return { ok: false, errors: ["A review needs a stable ID."] }
    }

    const now = options.now ?? new Date().toISOString()
    return {
        ok: true,
        review: {
            id,
            ...result.draft,
            categories: { ...result.draft.categories },
            createdAt: now,
            ...(options.revisionOf ? { revisionOf: options.revisionOf } : {}),
            ...(options.revisionOf ? { updatedAt: now } : {}),
            source: "local",
        },
    }
}

/** Validate a persisted record without changing its values. */
export function normalizeReviewRecord(
    value: unknown,
    games: GameRecord[] = gameCatalog,
    savedIds: number[] = [],
): ReviewRecord | null {
    if (!isRecord(value)) return null
    if (typeof value.id !== "string" || !value.id.trim()) return null
    if (value.source !== "prototype" && value.source !== "local") return null
    if (typeof value.createdAt !== "string" || !value.createdAt) return null
    if (value.updatedAt !== undefined && typeof value.updatedAt !== "string") return null
    if (value.revisionOf !== undefined && typeof value.revisionOf !== "string") return null

    const draft = normalizeReviewDraft(value, games, savedIds)
    if (draft.ok === false) return null

    return {
        ...draft.draft,
        id: value.id,
        createdAt: value.createdAt,
        ...(value.updatedAt ? { updatedAt: value.updatedAt } : {}),
        ...(value.revisionOf ? { revisionOf: value.revisionOf } : {}),
        source: value.source,
    }
}

/**
 * Explicit prototype reviews from the canonical friends. Each author owns or
 * wishlists the game in `socialData.ts`, and no score is inferred from that
 * relationship. These form the friend-first review list.
 */
const friendPrototypeReviews: ReviewRecord[] = [
    {
        id: "sample-alex-stardew",
        gameId: 413150,
        personId: "alex",
        overall: 9,
        categories: {
            Story: 8,
            Gameplay: 9,
            Visuals: 8,
            Audio: 8,
            Replayability: 10,
            Performance: 9,
        },
        text: "Our farm is open tonight. There’s room for one more, and absolutely no pressure to be productive.",
        createdAt: "2026-02-05T21:10:00.000Z",
        source: "prototype",
    },
    {
        id: "sample-jamie-stardew",
        gameId: 413150,
        personId: "jamie",
        overall: 8,
        categories: {
            Story: 8,
            Gameplay: 7,
            Visuals: 9,
            Audio: 8,
            Replayability: 8,
            Performance: 9,
        },
        text: "The gentle farm loop is exactly the kind of shared world I keep coming back to with a friend.",
        createdAt: "2026-02-08T15:40:00.000Z",
        source: "prototype",
    },
    {
        id: "sample-jamie-short-hike",
        gameId: 1055540,
        personId: "jamie",
        overall: 8,
        categories: {
            Story: 7,
            Gameplay: 8,
            Visuals: 9,
            Audio: 8,
            Replayability: 7,
        },
        text: "If you have an hour, take the scenic route. The climb is lovely, but the little conversations along the way are the real treasure.",
        createdAt: "2026-01-19T11:30:00.000Z",
        source: "prototype",
    },
    {
        id: "sample-morgan-spiritfarer",
        gameId: 972660,
        personId: "morgan",
        overall: 9,
        categories: {
            Story: 10,
            Gameplay: 8,
            Visuals: 9,
            Audio: 9,
            Replayability: 7,
            Performance: 9,
        },
        text: "A beautifully gentle game about a very difficult thing. Come for the boat-building; stay for the people you meet. Story: 5/5. Best played slowly.",
        createdAt: "2026-01-28T16:45:00.000Z",
        source: "prototype",
    },
    {
        id: "sample-morgan-firewatch",
        gameId: 383870,
        personId: "morgan",
        overall: 9,
        categories: {
            Story: 9,
            Gameplay: 7,
            Visuals: 8,
            Audio: 9,
            Replayability: 6,
            Performance: 9,
        },
        text: "Those quiet walks and that voice on the radio. I wish I could experience the beginning all over again.",
        createdAt: "2026-02-12T09:05:00.000Z",
        source: "prototype",
    },
]

type CommunityReviewSeed = {
    gameId: number
    personId: "jamie" | "alex" | "morgan" | "casey" | "riley" | "sam" | "devon"
    overall: number
    /** Story, Gameplay, Visuals, Audio, Replayability, Performance. */
    scores: [number, number, number, number, number, number]
    text: string
}

/**
 * Curated community content. Every author is a canonical friend, and each
 * reviews genres that match their declared interests. Every author owns or
 * wishlists the game, and the scores are deliberately varied so category
 * patterns stay honest.
 */
const communityReviewSeeds: CommunityReviewSeed[] = [
    { gameId: 1055540, personId: "morgan", overall: 9, scores: [9, 8, 10, 9, 7, 9], text: "A tiny walk with a big heart. I keep thinking about the conversations I almost skipped." },
    { gameId: 972660, personId: "jamie", overall: 8, scores: [9, 7, 9, 8, 7, 8], text: "Beautiful and generous, though I wanted a little more to do between the quiet moments." },
    { gameId: 383870, personId: "jamie", overall: 8, scores: [9, 7, 8, 8, 6, 8], text: "The walkie-talkie conversations carried the whole evening for me. I would replay the dialogue before the mechanics." },
    { gameId: 1145360, personId: "riley", overall: 8, scores: [6, 10, 8, 9, 9, 8], text: "Every run found a new build. The combat is the reason I keep coming back." },
    { gameId: 323190, personId: "casey", overall: 8, scores: [8, 9, 8, 7, 8, 8], text: "The city grew convincingly, but I felt the weight of every decision a little too much." },
    { gameId: 1172620, personId: "alex", overall: 8, scores: [6, 9, 8, 8, 9, 7], text: "Chaotic crew nights are the best use of this game. The pirate antics matter more than any story." },
    { gameId: 1172620, personId: "devon", overall: 7, scores: [6, 8, 7, 8, 8, 7], text: "Funny with a full crew, less convincing when I am playing alone." },
    { gameId: 1030300, personId: "riley", overall: 8, scores: [7, 9, 10, 9, 7, 8], text: "The movement is superb and every new area looks like it was painted just for this game." },
    { gameId: 504230, personId: "riley", overall: 9, scores: [8, 10, 8, 9, 8, 9], text: "Hard in the best way. The audio cues and precise jumps make each retry feel fair." },
    { gameId: 261550, personId: "casey", overall: 7, scores: [6, 9, 7, 6, 9, 7], text: "The campaign systems gave our group a reason to keep planning. Presentation is functional rather than flashy." },
    { gameId: 646570, personId: "casey", overall: 9, scores: [6, 10, 7, 7, 10, 8], text: "One more run became twenty. The deck-building loop is the whole reason this stays in my rotation." },
    { gameId: 105600, personId: "alex", overall: 8, scores: [6, 9, 7, 7, 10, 8], text: "The sheer amount of things to build and discover keeps winning me over." },
    { gameId: 105600, personId: "sam", overall: 8, scores: [6, 8, 8, 7, 9, 8], text: "A comfort game with endless little projects. I wish the world had a little more personality." },
    { gameId: 219760, personId: "morgan", overall: 8, scores: [10, 7, 8, 8, 7, 8], text: "The old-school questing and strong writing gave me more time with the companions than I expected." },
    { gameId: 219760, personId: "casey", overall: 8, scores: [9, 8, 7, 7, 8, 8], text: "The party dynamics carry it. I kept thinking about the companions long after the credits." },
    { gameId: 1200, personId: "morgan", overall: 9, scores: [10, 8, 10, 9, 7, 8], text: "The Eastern Front combat feels tense and unforgiving. One match had me coordinating with strangers for an hour." },
    { gameId: 1200, personId: "devon", overall: 8, scores: [9, 8, 9, 8, 7, 8], text: "Authentic, loud, and genuinely tactical. The learning curve is steep, but squad play makes it click." },
    { gameId: 747200, personId: "sam", overall: 7, scores: [7, 7, 10, 8, 7, 8], text: "The planet keeps throwing new systems at me. Building a base between expeditions has become my odd little comfort loop." },
    { gameId: 600480, personId: "sam", overall: 8, scores: [7, 7, 9, 9, 7, 8], text: "Designing exhibits is more satisfying than I expected. Watching the fish and the guests settle in is the whole appeal." },
    { gameId: 1092790, personId: "morgan", overall: 9, scores: [10, 8, 9, 8, 7, 9], text: "The card table hides a much stranger story. Every reveal made me want to unpack one more layer." },
    { gameId: 1092790, personId: "jamie", overall: 8, scores: [9, 7, 9, 8, 7, 8], text: "Creepy, clever, and unusually generous with its secrets. The puzzles serve the mood instead of interrupting it." },
    { gameId: 650700, personId: "morgan", overall: 7, scores: [9, 6, 7, 7, 6, 8], text: "Dream logic in its purest form. There is no hand-holding, but wandering the donjons stayed with me." },
    { gameId: 1091500, personId: "morgan", overall: 8, scores: [9, 7, 9, 8, 7, 7], text: "The city and its characters are unforgettable. The performance wobbles did not ruin the story for me." },
    { gameId: 1091500, personId: "devon", overall: 7, scores: [8, 7, 8, 8, 6, 6], text: "Great atmosphere and side stories, but the technical rough edges are hard to ignore." },
    { gameId: 864050, personId: "jamie", overall: 9, scores: [7, 8, 10, 8, 7, 9], text: "The reimagined tracks give the original score a new personality. I put it on whenever I want to focus." },
    { gameId: 864050, personId: "sam", overall: 7, scores: [6, 7, 9, 7, 7, 8], text: "A lovely soundtrack to have on in the background. There is not much here beyond the music, and that is fine." },
    { gameId: 1605220, personId: "alex", overall: 8, scores: [6, 7, 7, 7, 9, 9], text: "Arrakis finally feels like a place you have to scheme your way through. Faction asymmetry keeps matches fresh." },
    { gameId: 1605220, personId: "sam", overall: 7, scores: [5, 7, 7, 7, 8, 9], text: "The real-time strategy layer has real bite. I wish the diplomacy were a little clearer, but I keep coming back." },
    { gameId: 275850, personId: "riley", overall: 6, scores: [6, 8, 8, 7, 7, 6], text: "There is a lot of universe to wander, but the survival loop felt repetitive before the exploration won me over." },
    { gameId: 257510, personId: "sam", overall: 7, scores: [6, 7, 7, 6, 9, 7], text: "The puzzles respect your intelligence. I liked that the philosophy was in the questions, not in long cutscenes." },
    { gameId: 1057090, personId: "morgan", overall: 8, scores: [8, 7, 9, 9, 7, 8], text: "Every screen looks like a painting and every hidden path feels worth finding." },
    { gameId: 1057090, personId: "riley", overall: 8, scores: [7, 9, 9, 8, 7, 8], text: "A beautiful, gentle platformer with enough challenge to keep me honest." },
    { gameId: 200710, personId: "riley", overall: 7, scores: [6, 8, 6, 7, 8, 7], text: "Reliable hack-and-slash comfort food. The visuals have not aged as well as the loops." },
    { gameId: 1129580, personId: "riley", overall: 6, scores: [5, 7, 6, 6, 7, 7], text: "The survival grind is honest work. Building a village that survives a winter is more satisfying than it sounds." },
    { gameId: 322330, personId: "alex", overall: 8, scores: [6, 9, 7, 8, 9, 8], text: "Survival is much easier with a friend. The replay loop is built for shared evenings." },
    { gameId: 488790, personId: "morgan", overall: 7, scores: [9, 7, 8, 8, 6, 8], text: "The satire lands and the turn-based combat has more bite than I expected. The jokes are better when you know the town." },
    { gameId: 381210, personId: "riley", overall: 8, scores: [5, 10, 7, 8, 9, 9], text: "Every match feels like a tense little horror story. Learning the killer's patterns is half the fun." },
    { gameId: 39210, personId: "alex", overall: 8, scores: [8, 7, 9, 9, 7, 7], text: "The world is enormous and the music is gorgeous. The pace asks for patience." },
    { gameId: 39210, personId: "devon", overall: 8, scores: [8, 7, 8, 9, 8, 7], text: "Great for a slow evening with friends. The story hooks are better than the combat." },
    { gameId: 1086940, personId: "morgan", overall: 9, scores: [10, 8, 9, 9, 8, 8], text: "The choices and companions made this feel personal. I would replay it just to see different goodbyes." },
    { gameId: 1086940, personId: "casey", overall: 9, scores: [9, 9, 8, 8, 9, 8], text: "Deep systems and great writing. Every act gave us something to dissect and debate." },
]

const communityPrototypeReviews: ReviewRecord[] = communityReviewSeeds.map((seed, index) => ({
    id: `sample-${seed.personId}-${seed.gameId}`,
    gameId: seed.gameId,
    personId: seed.personId,
    overall: seed.overall,
    categories: Object.fromEntries(
        REVIEW_CATEGORIES.map((category, categoryIndex) => [category, seed.scores[categoryIndex]]),
    ) as ReviewCategoryRatings,
    text: seed.text,
    createdAt: new Date(Date.UTC(2026, 2, 1, index)).toISOString(),
    source: "prototype",
}))

export const prototypeReviews: ReviewRecord[] = [
    ...friendPrototypeReviews,
    ...communityPrototypeReviews,
]

/** One review per person and game; a resubmission is handled as a revision. */
export const reviewKey = (gameId: number, personId: string) => `${gameId}:${personId}`

export const findReviewForPersonGame = (
    reviews: ReviewRecord[],
    gameId: number,
    personId: string
): ReviewRecord | undefined =>
    reviews.find((review) => review.gameId === gameId && review.personId === personId)

/** Direct friends come from the existing friendship graph, not from all people. */
export const getDirectFriendIds = (
    friendships: SocialFriendship[] = initialFriendships,
): string[] => [
    ...new Set(
        friendships
            .filter((friendship) => friendship.members.includes("you"))
            .flatMap((friendship) => friendship.members)
            .filter((id) => id !== "you"),
    ),
]

export const isDirectFriend = (
    personId: string,
    friendships: SocialFriendship[] = initialFriendships,
): boolean => getDirectFriendIds(friendships).includes(personId)

/**
 * Friend reviews are a separate, independently accessible view. The full list
 * remains the community set; no review is duplicated into another model.
 */
export function partitionReviews(
    reviews: ReviewRecord[],
    friendships: SocialFriendship[] = initialFriendships,
): { friendReviews: ReviewRecord[]; communityReviews: ReviewRecord[] } {
    return {
        friendReviews: reviews.filter((review) => isDirectFriend(review.personId, friendships)),
        communityReviews: reviews,
    }
}

const roundedAverage = (scores: number[]): number | null =>
    scores.length
        ? Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1))
        : null

export function buildReviewBreakdown(
    reviews: ReviewRecord[],
    gameId?: number,
): ReviewBreakdown {
    const selected = gameId === undefined ? reviews : reviews.filter((review) => review.gameId === gameId)
    const overallScores = selected
        .map((review) => review.overall)
        .filter(isRating)

    return {
        gameId: gameId ?? null,
        reviewCount: selected.length,
        overallAverage: roundedAverage(overallScores),
        categories: REVIEW_CATEGORIES.map((category) => {
            const scores = selected.flatMap((review) => {
                const score = review.categories[category]
                return isRating(score) ? [score] : []
            })
            const stat: ReviewCategoryStat = {
                category,
                count: scores.length,
                average: roundedAverage(scores),
            }
            return stat
        }),
    }
}

/**
 * Insights are derived only from stored reviews. Ties are reported together
 * rather than arbitrarily choosing one category.
 */
export function buildReviewInsights(
    reviews: ReviewRecord[],
    gameId?: number,
): ReviewInsights {
    const selected =
        gameId === undefined
            ? reviews
            : reviews.filter((review) => review.gameId === gameId)
    const breakdown = buildReviewBreakdown(selected)
    const rated = breakdown.categories.filter(
        (stat): stat is ReviewCategoryStat & { average: number } => stat.average !== null,
    )

    let strongest: ReviewCategoryStat[] = []
    let weakest: ReviewCategoryStat[] = []
    if (rated.length) {
        const highest = Math.max(...rated.map((stat) => stat.average))
        const lowest = Math.min(...rated.map((stat) => stat.average))
        strongest = rated.filter((stat) => stat.average === highest)
        weakest = rated.filter((stat) => stat.average === lowest)
    }

    const scores = selected.map((review) => review.overall).filter(isRating)
    const overallSpread = scores.length
        ? Math.max(...scores) - Math.min(...scores)
        : null
    let agreement = "No reviewer-supplied overall scores yet."
    if (scores.length === 1) {
        agreement = "Only one review, so there is no agreement to compare."
    } else if (overallSpread !== null && overallSpread <= 1) {
        agreement = "Reviewers broadly agree on the overall score."
    } else if (overallSpread !== null && overallSpread <= 3) {
        agreement = "Reviewers mostly agree, with some variation."
    } else if (overallSpread !== null) {
        agreement = "Overall opinions differ widely."
    }

    return {
        reviewCount: selected.length,
        prototypeCount: selected.filter((review) => review.source === "prototype").length,
        localCount: selected.filter((review) => review.source === "local").length,
        strongest,
        weakest,
        overallSpread,
        agreement,
    }
}

/** Data-integrity check for prototype review content. */
export function validatePrototypeReviews(
    reviews: ReviewRecord[] = prototypeReviews,
    games: GameRecord[] = gameCatalog,
    people: SocialPerson[] = socialPeople,
): string[] {
    const issues: string[] = []
    const ids = new Set<string>()

    for (const review of reviews) {
        if (ids.has(review.id)) issues.push(`Duplicate review ID: ${review.id}`)
        ids.add(review.id)

        if (!getGameById(review.gameId, games)) {
            issues.push(`Review ${review.id} references missing game ${review.gameId}`)
        }
        if (!people.some((person) => person.id === review.personId)) {
            issues.push(`Review ${review.id} references missing person ${review.personId}`)
        }
        if (!isRating(review.overall)) {
            issues.push(`Review ${review.id} has an invalid overall score`)
        }
        if (!review.text.trim()) {
            issues.push(`Review ${review.id} has no review text`)
        }
        if (review.source !== "prototype") {
            issues.push(`Review ${review.id} is not marked as explicit prototype content`)
        }
        if (!isEligibleReviewAuthor(review.personId, review.gameId, people)) {
            issues.push(`Review ${review.id} author does not own or wishlist the game`)
        }
        for (const category of REVIEW_CATEGORIES) {
            const score = review.categories[category]
            if (score !== undefined && !isRating(score)) {
                issues.push(`Review ${review.id} has an invalid ${category} score`)
            }
        }
    }

    return issues
}

const reviewTime = (review: ReviewRecord) =>
    Date.parse(review.updatedAt ?? review.createdAt) || 0

export const getGameReviews = (reviews: ReviewRecord[], gameId: number): ReviewRecord[] =>
    reviews
        .filter((review) => review.gameId === gameId)
        .sort((a, b) => reviewTime(b) - reviewTime(a))

export const getPersonReviews = (reviews: ReviewRecord[], personId: string): ReviewRecord[] =>
    reviews
        .filter((review) => review.personId === personId)
        .sort((a, b) => reviewTime(b) - reviewTime(a))

/** Direct-friend reviews for one game, kept separate from community summaries. */
export const getFriendGameReviews = (
    reviews: ReviewRecord[],
    gameId: number,
    friendships: SocialFriendship[] = initialFriendships,
): ReviewRecord[] =>
    getGameReviews(reviews, gameId).filter((review) => isDirectFriend(review.personId, friendships))

/**
 * Review-aware discovery uses actual reviews only. Games without authored
 * reviews are never ranked by ownership, wishlist status, or category means.
 */
export function filterGamesByReviews(
    games: GameRecord[],
    reviews: ReviewRecord[],
    filter: "all" | "friend-reviewed" | "community-reviewed" | "high-rated",
    minimumOverall = 8,
): GameRecord[] {
    if (filter === "all") return games

    return games.filter((game) => {
        if (filter === "friend-reviewed") {
            return getFriendGameReviews(reviews, game.id).length > 0
        }
        if (filter === "community-reviewed") {
            return getGameReviews(reviews, game.id).length > 0
        }
        const breakdown = buildReviewBreakdown(getGameReviews(reviews, game.id), game.id)
        return breakdown.overallAverage !== null && breakdown.overallAverage >= minimumOverall
    })
}

/** Drop records whose game no longer resolves in the canonical catalog. */
export const resolveReviews = (
    reviews: ReviewRecord[],
    games: GameRecord[] = gameCatalog
): ReviewRecord[] => reviews.filter((review) => Boolean(getGameById(review.gameId, games)))
