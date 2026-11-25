/** @jsxRuntime classic */
import * as React from "react"
import type { ReviewCategoryStat, ReviewInsights as ReviewInsightsData } from "./types"

export interface ReviewInsightsProps {
    gameId: number
    insights: ReviewInsightsData
}

const formatStats = (stats: ReviewCategoryStat[]): string =>
    stats.length
        ? stats
              .map((stat) => `${stat.category} ${stat.average?.toFixed(1)} (${stat.count} ratings)`)
              .join(", ")
        : "Not enough category ratings"

export default function ReviewInsights({ gameId, insights }: ReviewInsightsProps) {
    const headingId = `rvw-insights-heading-${gameId}`
    const sourceLabel = [
        insights.prototypeCount
            ? `${insights.prototypeCount} explicit prototype ${insights.prototypeCount === 1 ? "review" : "reviews"}`
            : "",
        insights.localCount
            ? `${insights.localCount} locally authored ${insights.localCount === 1 ? "review" : "reviews"}`
            : "",
    ]
        .filter(Boolean)
        .join(" and ")

    return (
        <section className="rvw-panel rvw-insights" aria-labelledby={headingId}>
            <div className="kicker">Review insights</div>
            <h3 id={headingId}>Patterns in the ratings</h3>

            {insights.reviewCount === 0 ? (
                <p className="social-muted rvw-empty">
                    No insights yet. Notes appear only after owners or
                    wishlisters author reviews.
                </p>
            ) : (
                <>
                    <p className="social-muted rvw-source-note">
                        Based on {sourceLabel || `${insights.reviewCount} stored reviews`}.
                    </p>
                    <dl className="rvw-insight-list">
                        <div>
                            <dt>Strongest category</dt>
                            <dd>{formatStats(insights.strongest)}</dd>
                        </div>
                        <div>
                            <dt>Lowest-rated category</dt>
                            <dd>{formatStats(insights.weakest)}</dd>
                        </div>
                        <div>
                            <dt>Overall agreement</dt>
                            <dd>
                                {insights.agreement}
                                {insights.overallSpread !== null &&
                                    ` Spread: ${insights.overallSpread} point${insights.overallSpread === 1 ? "" : "s"}.`}
                            </dd>
                        </div>
                    </dl>
                    <p className="social-muted rvw-note">
                        These notes describe stored reviews only; they do not
                        turn an overall score into a category average.
                    </p>
                </>
            )}
        </section>
    )
}
