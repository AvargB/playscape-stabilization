/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import {
    buildComparisonSummary,
    getGamesByIds,
    resolveGameRecord,
    steam,
    type GameRecord,
} from "../../data/games"
import { socialPeople } from "../../socialData"
import ReviewForm from "../reviews/ReviewForm"
import ReviewBreakdown from "../reviews/ReviewBreakdown"
import FriendReviews from "../reviews/FriendReviews"
import ReviewInsights from "../reviews/ReviewInsights"
import {
    buildReviewBreakdown,
    buildReviewInsights,
    findReviewForPersonGame,
    getGameReviews,
    isEligibleReviewAuthor,
    type ReviewDraft,
    type ReviewRecord,
    type ReviewRecordResult,
} from "../reviews"

export interface GameDetailsProps {
    games: GameRecord[]
    saved: number[]
    toggle: (id: number) => void
    openGame: (game: GameRecord | number | null | undefined) => void
    go: (destination: string, id?: string) => void
    setDialog: (dialog: any) => void
    activity: any[]
    compareIds: number[]
    toggleCompare: (id: number) => void
    detail: number | null
    setDetail: (detail: number | null) => void
    reviews: ReviewRecord[]
    onSubmitReview: (draft: ReviewDraft, revisionOf?: string) => ReviewRecordResult
}

export default function GameDetails({
    games,
    saved,
    toggle,
    openGame,
    go,
    setDialog,
    activity,
    compareIds,
    toggleCompare,
    detail,
    setDetail,
    reviews,
    onSubmitReview,
}: GameDetailsProps) {
    const data = games?.length ? games : []
    const detailGame =
        detail === null ? null : resolveGameRecord(detail, data) ?? null
    const existingReview = detailGame
        ? findReviewForPersonGame(reviews, detailGame.id, "you")
        : undefined
    const canReview = detailGame
        ? isEligibleReviewAuthor("you", detailGame.id, socialPeople, saved)
        : false
    const gameReviews = detailGame ? getGameReviews(reviews, detailGame.id) : []
    const reviewBreakdown = React.useMemo(
        () => buildReviewBreakdown(gameReviews, detailGame?.id),
        [gameReviews, detailGame?.id],
    )
    const reviewInsights = React.useMemo(
        () => buildReviewInsights(gameReviews, detailGame?.id),
        [gameReviews, detailGame?.id],
    )
    const compareGames = getGamesByIds(compareIds, data)
    const compareSummary = React.useMemo(
        () => buildComparisonSummary(compareGames, data),
        [compareGames, data],
    )

    function Avatar({ id, size = 25 }: { id: string; size?: number }) {
        const p = socialPeople.find((p) => p.id === id) || socialPeople[0]
        return (
            <span
                className={"social-avatar av-" + id}
                style={{ width: size, height: size }}
                role="img"
                aria-label={p.name + " avatar"}
            >
                {p.initials}
            </span>
        )
    }

    function PersonLink({ id }: { id: string }) {
        const p = socialPeople.find((p) => p.id === id) || socialPeople[0]
        return (
            <button
                className="person-link"
                onClick={() => {
                    openGame(null)
                    go("Profile", p.id)
                }}
            >
                {p.name}
            </button>
        )
    }

    function GameSocial({ id }: { id: number }) {
        const owners = socialPeople.filter(
            (p) => p.id !== "you" && p.owned.includes(id),
        )
        const wishers = socialPeople.filter(
            (p) => p.id !== "you" && p.wishlist.includes(id),
        )
        const recs = activity.filter((a: any) => a.game === id)
        return (
            <section className="game-social">
                <div className="kicker">Through your friends</div>
                <h2>A little more confidence.</h2>
                <p className="social-muted">
                    {owners.length} friends own this · {wishers.length} friends have
                    wishlisted it
                </p>
                <div className="social-owner-row">
                    {owners.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => {
                                openGame(null)
                                go("Profile", p.id)
                            }}
                        >
                            <Avatar id={p.id} size={25} />
                            {p.name}
                        </button>
                    ))}
                </div>
                {recs.slice(0, 2).map((a: any) => (
                    <div key={a.id} className="game-social-quote">
                        <PersonLink id={a.person} />
                        <p>“{a.quote}”</p>
                    </div>
                ))}
                <div className="row-actions">
                    <button
                        className="web-secondary"
                        onClick={() => setDialog({ type: "recommend", game: id })}
                    >
                        Recommend to someone
                    </button>
                    <button
                        className="web-secondary"
                        onClick={() =>
                            setDialog({
                                type: "circleGame",
                                game: id,
                                circle: "afterhours",
                            })
                        }
                    >
                        Add to circle wishlist
                    </button>
                </div>
            </section>
        )
    }

    if (!detailGame) return null

    return (
        <>
            {compareGames.length > 0 && (
                <section className="summary compare-tray" style={{ marginBottom: 18 }}>
                    <strong>Comparison tray</strong>
                    <br />
                    {compareGames.map((game) => (
                        <span
                            key={game.id}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                marginRight: 12,
                            }}
                        >
                            <button
                                className="text-button"
                                onClick={() => openGame(game.id)}
                            >
                                {game.title}
                            </button>
                            <button
                                className="icon-button"
                                aria-label={
                                    "Remove " + game.title + " from comparison"
                                }
                                onClick={() => toggleCompare(game.id)}
                            >
                                <Icon name="close" size={12} />
                            </button>
                        </span>
                    ))}
                    <div className="social-muted" style={{ marginTop: 8 }}>
                        {compareSummary.gameCount > 1
                            ? `Best value: ${compareSummary.bestValue?.title ?? "—"} • Budget range: $${compareSummary.lowestPrice.toFixed(2)}–$${compareSummary.highestPrice.toFixed(2)} • Avg. session: ${compareSummary.averageSessionMinutes} min`
                            : `Selected game: ${compareGames[0]?.title ?? "—"} • Price: $${compareGames[0]?.price.toFixed(2) ?? "0.00"}`}
                        {compareSummary.platforms.length > 0 && (
                            <span> • Platforms: {compareSummary.platforms.join(" · ")}</span>
                        )}
                        {compareSummary.tagSummary.length > 0 && (
                            <span> • Mood tags: {compareSummary.tagSummary.join(" · ")}</span>
                        )}
                    </div>
                </section>
            )}
            <div className="veil" onClick={() => setDetail(null)}>
                <section
                    className="modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={detailGame.title}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setDetail(null)
                    }}
                >
                    <div className="modal-head">
                        <h2>{detailGame.title}</h2>
                        <button
                            className="icon-button"
                            aria-label="Close game details"
                            autoFocus
                            onClick={() => setDetail(null)}
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                    <img
                        className="detail-img"
                        src={steam(detailGame.id)}
                        alt={detailGame.title + " artwork"}
                    />
                    <div className="detail-meta">
                        <span className="pill">{detailGame.genre}</span>
                        <span className="pill">{detailGame.players}</span>
                        <span className="pill">
                            {detailGame.difficulty}
                        </span>
                    </div>
                    {(detailGame.developer ||
                        detailGame.publisher ||
                        detailGame.releaseDate ||
                        detailGame.officialWebsite) && (
                            <div className="detail-meta" style={{ marginTop: 0 }}>
                                {detailGame.developer && (
                                    <span className="pill">Developer: {detailGame.developer}</span>
                                )}
                                {detailGame.publisher && (
                                    <span className="pill">Publisher: {detailGame.publisher}</span>
                                )}
                                {detailGame.releaseDate && (
                                    <span className="pill">Release: {detailGame.releaseDate}</span>
                                )}
                                {detailGame.officialWebsite && (
                                    <span className="pill">
                                        <a
                                            href={detailGame.officialWebsite}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: "inherit", textDecoration: "underline" }}
                                        >
                                            Official site
                                        </a>
                                    </span>
                                )}
                            </div>
                    )}
                    <p>{detailGame.desc}</p>
                    <div className="summary">
                        <strong>Why you might love it</strong>
                        <br />
                        {detailGame.moods.split(" ").join(" · ")} experiences, with sessions you can enjoy {detailGame.session === 15 ? "in short bursts" : "at your own pace"}.
                        <br />
                        <br />
                        Platforms: {detailGame.platform}
                        <br />
                        Sample base-game price: ${detailGame.price.toFixed(2)} USD. No purchase is made in this prototype.
                    </div>
                    <div className="detail-actions">
                        <button
                            className="primary"
                            aria-pressed={saved.includes(detailGame.id)}
                            aria-label={
                                saved.includes(detailGame.id)
                                    ? `Remove ${detailGame.title} from wishlist`
                                    : `Add ${detailGame.title} to wishlist`
                            }
                            onClick={() => toggle(detailGame.id)}
                        >
                            <Icon
                                name={
                                    saved.includes(detailGame.id)
                                        ? "heart-filled"
                                        : "heart"
                                }
                                size={16}
                            />
                            {saved.includes(detailGame.id)
                                ? "Saved to wishlist"
                                : "Add to wishlist"}
                        </button>
                        <button
                            className="web-secondary"
                            onClick={() => toggleCompare(detailGame.id)}
                        >
                            {compareIds.includes(detailGame.id)
                                ? "Remove from compare"
                                : "Compare this game"}
                        </button>
                        <a
                            href={
                                "https://store.steampowered.com/app/" +
                                detailGame.id
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12 }}
                        >
                            View on Steam
                        </a>
                    </div>
                    {compareGames.length > 0 && (
                        <div className="summary" style={{ marginTop: 18 }}>
                            <strong>Comparison snapshot</strong>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `110px repeat(${Math.min(compareGames.length, 3)}, minmax(0, 1fr))`,
                                    gap: "8px 10px",
                                    marginTop: 12,
                                    fontSize: 11,
                                }}
                            >
                                {[
                                    ["Genre", ...compareGames.map((game) => game.genre)],
                                    ["Players", ...compareGames.map((game) => game.players)],
                                    ["Session", ...compareGames.map((game) => `${game.sessionMinutes || game.session} min`)],
                                    ["Price", ...compareGames.map((game) => `$${game.price.toFixed(2)}`)],
                                    ["Difficulty", ...compareGames.map((game) => game.difficulty)],
                                ].map(([label, ...values]) => (
                                    <React.Fragment key={label as string}>
                                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label as string}</span>
                                        {values.map((value, index) => (
                                            <span key={`${label}-${index}`}>
                                                {value as string}
                                            </span>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                    <FriendReviews
                        gameId={detailGame.id}
                        reviews={gameReviews}
                        onOpenProfile={(personId) => {
                            openGame(null)
                            go("Profile", personId)
                        }}
                    />
                    <ReviewBreakdown breakdown={reviewBreakdown} />
                    <ReviewInsights gameId={detailGame.id} insights={reviewInsights} />
                    <ReviewForm
                        key={`review-form-${detailGame.id}`}
                        gameId={detailGame.id}
                        canReview={canReview}
                        saved={saved.includes(detailGame.id)}
                        existingReview={existingReview}
                        onSubmit={onSubmitReview}
                    />
                    <GameSocial id={detailGame.id} />
                </section>
            </div>
        </>
    )
}
