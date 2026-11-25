/** @jsxRuntime classic */
import * as React from "react"
import { socialPeople } from "../../socialData"
import { getFriendGameReviews, getReviewRelationship } from "./model"
import { REVIEW_CATEGORIES, REVIEW_SCALE, type ReviewRecord } from "./types"

export interface FriendReviewsProps {
    gameId: number
    reviews: ReviewRecord[]
    onOpenProfile?: (personId: string) => void
}

export default function FriendReviews({
    gameId,
    reviews,
    onOpenProfile,
}: FriendReviewsProps) {
    const friendReviews = getFriendGameReviews(reviews, gameId)
    const headingId = `rvw-friends-heading-${gameId}`

    return (
        <section
            id={`friend-reviews-${gameId}`}
            className="rvw-panel rvw-friends"
            aria-labelledby={headingId}
        >
            <div className="kicker">Friends first</div>
            <h3 id={headingId}>
                Friends’ reviews ({friendReviews.length})
            </h3>
            <p className="social-muted">
                Written by your canonical friends only. These are real authored
                reviews, shown separately from the community averages.
            </p>

            {friendReviews.length === 0 ? (
                <p className="social-muted rvw-empty">
                    No direct friend has reviewed this game yet. Their ownership
                    or wishlist alone is not treated as a review.
                </p>
            ) : (
                <div className="rvw-friend-list">
                    {friendReviews.map((review) => {
                        const person = socialPeople.find((entry) => entry.id === review.personId)
                        const relationship = person
                            ? getReviewRelationship(person, gameId)
                            : "none"
                        return (
                            <article className="rvw-friend-card" key={review.id}>
                                <div className="rvw-friend-head">
                                    <span
                                        className={"social-avatar av-" + review.personId}
                                        role="img"
                                        aria-label={(person?.name ?? "Friend") + " avatar"}
                                    >
                                        {person?.initials ?? "?"}
                                    </span>
                                    <div>
                                        {onOpenProfile ? (
                                            <button
                                                type="button"
                                                className="person-link"
                                                onClick={() => onOpenProfile(review.personId)}
                                            >
                                                {person?.name ?? review.personId}
                                            </button>
                                        ) : (
                                            <strong>{person?.name ?? review.personId}</strong>
                                        )}
                                        <span className="rvw-relationship">
                                            {relationship === "owns"
                                                ? "Owns this game"
                                                : relationship === "wishlisted"
                                                    ? "Wishlisted this game"
                                                    : "Social connection"}
                                        </span>
                                    </div>
                                    <span
                                        className="rvw-friend-score"
                                        aria-label={`Overall ${review.overall} out of ${REVIEW_SCALE.max} from ${person?.name ?? review.personId}`}
                                    >
                                        {review.overall}/{REVIEW_SCALE.max}
                                        <small>overall</small>
                                    </span>
                                </div>

                                <p className="rvw-friend-text">“{review.text}”</p>

                                <ul className="rvw-friend-categories" role="list" aria-label="Category ratings">
                                    {REVIEW_CATEGORIES.filter(
                                        (category) => review.categories[category] !== undefined,
                                    ).map((category) => (
                                        <li key={category}>
                                            <span>{category}</span>
                                            <strong>{review.categories[category]}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <p className="rvw-source-note">
                                    {review.source === "prototype"
                                        ? "Explicit prototype review"
                                        : "Locally authored review"}
                                    {review.revisionOf ? " · Revised" : ""}
                                </p>
                            </article>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
