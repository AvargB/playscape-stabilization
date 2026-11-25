/** @jsxRuntime classic */
import * as React from "react"
import { REVIEW_SCALE, type ReviewBreakdown as ReviewBreakdownData } from "./types"

export interface ReviewBreakdownProps {
    breakdown: ReviewBreakdownData
}

export default function ReviewBreakdown({ breakdown }: ReviewBreakdownProps) {
    const { gameId, reviewCount, overallAverage, categories } = breakdown
    const headingId = `rvw-community-heading-${gameId ?? "all"}`

    return (
        <section className="rvw-panel rvw-community" aria-labelledby={headingId}>
            <div className="kicker">Community review</div>
            <h3 id={headingId}>A wider view, built only from reviews</h3>

            {reviewCount === 0 ? (
                <p className="social-muted">
                    No reviews yet. Owners and wishlisters can add the first one;
                    ownership alone never becomes a rating.
                </p>
            ) : (
                <>
                    <div className="rvw-overall" aria-label={`Overall community rating ${overallAverage ?? "unavailable"} out of ${REVIEW_SCALE.max}`}>
                        <strong>{overallAverage?.toFixed(1) ?? "—"}</strong>
                        <span>
                            /{REVIEW_SCALE.max} overall · {reviewCount}{" "}
                            {reviewCount === 1 ? "review" : "reviews"}
                        </span>
                    </div>
                    <p className="social-muted rvw-note">
                        The overall score is what reviewers gave the game. Category
                        averages are shown separately and never replace it.
                    </p>

                    <ul className="rvw-category-list">
                        {categories.map((stat) => (
                            <li key={stat.category} className="rvw-category-row">
                                <span className="rvw-category-name">{stat.category}</span>
                                <span
                                    className="rvw-category-score"
                                    aria-label={
                                        stat.average === null
                                            ? `${stat.category}: not enough ratings`
                                            : `${stat.category}: ${stat.average.toFixed(1)} out of ${REVIEW_SCALE.max} from ${stat.count} ${stat.count === 1 ? "rating" : "ratings"}`
                                    }
                                >
                                    {stat.average === null
                                        ? "—"
                                        : stat.average.toFixed(1)}
                                </span>
                                <span className="rvw-category-count">
                                    {stat.count === 0
                                        ? "no ratings"
                                        : `${stat.count} ${stat.count === 1 ? "rating" : "ratings"}`}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}
