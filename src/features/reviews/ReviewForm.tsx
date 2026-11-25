/** @jsxRuntime classic */
import * as React from "react"
import {
    MAX_REVIEW_TEXT_LENGTH,
    REVIEW_CATEGORIES,
    REVIEW_SCALE,
    type ReviewCategory,
    type ReviewCategoryRatings,
    type ReviewDraft,
    type ReviewRecord,
    type ReviewRecordResult,
} from "./types"

export interface ReviewFormProps {
    gameId: number
    canReview: boolean
    saved: boolean
    existingReview?: ReviewRecord
    onSubmit: (draft: ReviewDraft, revisionOf?: string) => ReviewRecordResult
}

const emptyCategories = (): Record<ReviewCategory, string> =>
    Object.fromEntries(REVIEW_CATEGORIES.map((category) => [category, ""])) as Record<ReviewCategory, string>

export default function ReviewForm({
    gameId,
    canReview,
    saved,
    existingReview,
    onSubmit,
}: ReviewFormProps) {
    const [overall, setOverall] = React.useState(
        existingReview ? String(existingReview.overall) : "",
    )
    const [categories, setCategories] = React.useState<Record<ReviewCategory, string>>(() => {
        const next = emptyCategories()
        if (existingReview) {
            for (const category of REVIEW_CATEGORIES) {
                const score = existingReview.categories[category]
                if (score !== undefined) next[category] = String(score)
            }
        }
        return next
    })
    const [text, setText] = React.useState(existingReview?.text ?? "")
    const [errors, setErrors] = React.useState<string[]>([])
    const [success, setSuccess] = React.useState("")

    if (!canReview) {
        return (
            <section className="rvw-panel" aria-labelledby={`rvw-heading-${gameId}`}>
                <div className="kicker">Your review</div>
                <h3 id={`rvw-heading-${gameId}`}>Reviews come from real players</h3>
                <p className="social-muted">
                    {saved
                        ? "This game is on your list, but a review still needs to be authored."
                        : "Save this game to your wishlist before reviewing it."}
                </p>
            </section>
        )
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const selectedCategories: ReviewCategoryRatings = {}
        for (const category of REVIEW_CATEGORIES) {
            const value = categories[category].trim()
            if (value) selectedCategories[category] = Number(value)
        }

        const result = onSubmit(
            {
                gameId,
                personId: "you",
                overall: Number(overall),
                categories: selectedCategories,
                text,
            },
            existingReview?.id,
        )

        if (result.ok === false) {
            setErrors(result.errors)
            setSuccess("")
            return
        }
        setErrors([])
        setSuccess(
            existingReview
                ? "Your revision has been saved in this prototype."
                : "Your review has been saved in this prototype.",
        )
    }

    return (
        <form className="rvw-panel" onSubmit={submit} aria-labelledby={`rvw-heading-${gameId}`}>
            <div className="rvw-head">
                <div>
                    <div className="kicker">Your review</div>
                    <h3 id={`rvw-heading-${gameId}`}>
                        {existingReview ? "Revise your review" : "Write a review"}
                    </h3>
                </div>
                {existingReview && (
                    <span className="pill">Your overall: {existingReview.overall}/10</span>
                )}
            </div>
            <p className="social-muted">
                Only someone who owns or wishlists a game can review it. Category
                ratings are optional; your overall rating stays yours.
            </p>

            <label className="rvw-field">
                Overall rating ({REVIEW_SCALE.min}–{REVIEW_SCALE.max})
                <input
                    type="number"
                    inputMode="numeric"
                    min={REVIEW_SCALE.min}
                    max={REVIEW_SCALE.max}
                    step={1}
                    value={overall}
                    onChange={(event) => setOverall(event.target.value)}
                    aria-label="Overall rating"
                />
            </label>

            <fieldset className="rvw-categories">
                <legend>Category ratings (optional, {REVIEW_SCALE.min}–{REVIEW_SCALE.max})</legend>
                <div className="rvw-grid">
                    {REVIEW_CATEGORIES.map((category) => (
                        <label className="rvw-field" key={category}>
                            {category}
                            <input
                                type="number"
                                inputMode="numeric"
                                min={REVIEW_SCALE.min}
                                max={REVIEW_SCALE.max}
                                step={1}
                                value={categories[category]}
                                onChange={(event) =>
                                    setCategories((current) => ({
                                        ...current,
                                        [category]: event.target.value,
                                    }))
                                }
                                aria-label={`${category} rating`}
                            />
                        </label>
                    ))}
                </div>
            </fieldset>

            <label className="rvw-field">
                Your review
                <textarea
                    value={text}
                    maxLength={MAX_REVIEW_TEXT_LENGTH}
                    rows={4}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="What stood out to you?"
                    aria-label="Your review text"
                />
            </label>

            {errors.length > 0 && (
                <ul className="rvw-errors" role="alert">
                    {errors.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            )}
            {success && (
                <p className="rvw-success" role="status">
                    {success}
                </p>
            )}

            <div className="rvw-actions">
                <button type="submit" className="primary">
                    {existingReview ? "Save revision" : "Publish review"}
                </button>
            </div>
        </form>
    )
}
