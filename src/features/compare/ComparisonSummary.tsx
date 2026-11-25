/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import type { GameRecord } from "../../data/games"
import type { PurchaseType } from "../checkout/types"
import {
    getComparisonSummary,
    getMajorDifferences,
    getPlatformSupport,
    getSharedCharacteristics,
    type ComparisonRow,
    type PriceComparison,
} from "./utils"

export interface ComparisonSummaryProps {
    games: GameRecord[]
    catalog: GameRecord[]
    rows: ComparisonRow[]
    priceComparison: PriceComparison
    saved: number[]
    onToggleSaved: (id: number) => void
    onOpenGame: (game: GameRecord | number) => void
    onCheckout?: (id: number, type: PurchaseType) => void
    ownedIds?: number[]
}

export default function ComparisonSummary({
    games,
    catalog,
    rows,
    priceComparison,
    saved,
    onToggleSaved,
    onOpenGame,
    onCheckout,
    ownedIds = [],
}: ComparisonSummaryProps) {
    const ownedSet = new Set(ownedIds)
    const [preferredPlatform, setPreferredPlatform] = React.useState("")
    const summary = React.useMemo(
        () => getComparisonSummary(games.map((game) => game.id), catalog),
        [games, catalog]
    )
    const shared = React.useMemo(() => getSharedCharacteristics(games, rows), [games, rows])
    const differences = React.useMemo(() => getMajorDifferences(games, rows), [games, rows])
    const platformGames = getPlatformSupport(games, preferredPlatform)
    const playRows = rows.filter((row) =>
        ["localPlay", "onlinePlay", "coop", "multiplayer"].includes(row.id)
    )
    const lowestNames = games
        .filter((game) => priceComparison.lowestPriceIds.includes(game.id))
        .map((game) => game.title)
    const uniqueShared = shared
        .filter((entry, index, all) =>
            all.findIndex((item) => item.label === entry.label && item.value === entry.value) === index
        )
        .slice(0, 10)

    return (
        <section className="cmp-panel cmp-summary" aria-labelledby="cmp-summary-heading">
            <div className="cmp-panel-head">
                <div>
                    <div className="kicker">Purchase decision support</div>
                    <h2 id="cmp-summary-heading">What the comparison shows</h2>
                </div>
                <p className="cmp-muted">
                    {summary.gameCount} games · sample catalog data
                </p>
            </div>
            <p className="cmp-summary-intro">
                No overall score is assigned. Use the facts below to decide what
                matters to you.
            </p>
            <div className="cmp-summary-grid">
                <div className="cmp-fact">
                    <h3>Lowest listed price</h3>
                    {priceComparison.lowestPrice !== null ? (
                        <p>
                            <strong>${priceComparison.lowestPrice.toFixed(2)}</strong> — {lowestNames.join(", ")}
                        </p>
                    ) : (
                        <p>Not listed</p>
                    )}
                    {priceComparison.hasDifference && (
                        <p className="cmp-muted">
                            Difference across selection: $
                            {(summary.highestPrice - summary.lowestPrice).toFixed(2)}
                        </p>
                    )}
                </div>
                <div className="cmp-fact">
                    <h3>Platforms covered</h3>
                    <p>{summary.platforms.join(", ") || "Not listed"}</p>
                    <label className="cmp-platform-filter">
                        Games supporting a platform you prefer
                        <select
                            value={preferredPlatform}
                            onChange={(event) => setPreferredPlatform(event.target.value)}
                            aria-label="Preferred platform"
                        >
                            <option value="">Choose a platform</option>
                            {summary.platforms.map((platform) => (
                                <option key={platform} value={platform}>
                                    {platform}
                                </option>
                            ))}
                        </select>
                    </label>
                    {preferredPlatform && (
                        <p className="cmp-muted" aria-live="polite">
                            {platformGames.length
                                ? games
                                      .filter((game) => platformGames.includes(game.id))
                                      .map((game) => game.title)
                                      .join(", ")
                                : "None of the selected games list this platform."}
                        </p>
                    )}
                </div>
                <div className="cmp-fact">
                    <h3>Multiplayer compatibility</h3>
                    {playRows.length === 0 ? (
                        <p>Not listed in these catalog records.</p>
                    ) : (
                        <ul>
                            {playRows.map((row) => (
                                <li key={row.id}>
                                    <strong>{row.label}:</strong>{" "}
                                    {row.status === "shared" && row.values[0] === "Listed"
                                        ? "listed for all selected games"
                                        : row.values.some((value) => value === "Listed")
                                          ? "listed for some selected games"
                                          : "not listed for these games"}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="cmp-fact">
                    <h3>Shared characteristics</h3>
                    {uniqueShared.length ? (
                        <ul>
                            {uniqueShared.map((entry) => (
                                <li key={`${entry.label}-${entry.value}`}>
                                    <strong>{entry.label}:</strong> {entry.value}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No characteristics are shared by every selected game.</p>
                    )}
                </div>
                <div className="cmp-fact">
                    <h3>Major differences</h3>
                    {differences.length ? (
                        <ul>
                            {differences.slice(0, 6).map((row) => (
                                <li key={row.id}>
                                    <strong>{row.label}:</strong> {row.values.join(" vs ")}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No differing categories in this view.</p>
                    )}
                </div>
                <div className="cmp-fact">
                    <h3>Typical session</h3>
                    <p>{summary.averageSessionMinutes} minutes on average (catalog estimates)</p>
                </div>
            </div>
            <div className="cmp-actions">
                <h3>Actions for compared games</h3>
                <ul>
                    {games.map((game) => (
                        <li key={game.id}>
                            <button
                                type="button"
                                className="cmp-summary-game"
                                aria-label={`View ${game.title} product details`}
                                onClick={() => onOpenGame(game)}
                            >
                                <strong>{game.title}</strong>
                            </button>
                            {ownedSet.has(game.id) && (
                                <span className="pill chk-owned-badge" data-owned-game={game.id}>
                                    In prototype library
                                </span>
                            )}
                            <button
                                type="button"
                                className="web-secondary"
                                aria-pressed={saved.includes(game.id)}
                                aria-label={
                                    saved.includes(game.id)
                                        ? `Remove ${game.title} from wishlist`
                                        : `Add ${game.title} to wishlist`
                                }
                                onClick={() => onToggleSaved(game.id)}
                            >
                                <Icon
                                    name={
                                        saved.includes(game.id)
                                            ? "heart-filled"
                                            : "heart"
                                    }
                                    size={13}
                                />
                                {saved.includes(game.id) ? "Wishlisted" : "Add to wishlist"}
                            </button>
                            <button
                                type="button"
                                className="web-secondary"
                                onClick={() => onOpenGame(game.id)}
                            >
                                View details
                            </button>
                            {onCheckout && !ownedSet.has(game.id) && (
                                <button
                                    type="button"
                                    className="web-secondary"
                                    onClick={() => onCheckout(game.id, "personal")}
                                >
                                    Simulated checkout
                                </button>
                            )}
                            {ownedSet.has(game.id) && (
                                <button
                                    type="button"
                                    className="web-secondary"
                                    onClick={() => onOpenGame(game.id)}
                                >
                                    In prototype library
                                </button>
                            )}
                            {game.officialWebsite && (
                                <a href={game.officialWebsite} target="_blank" rel="noreferrer">
                                    Official site <Icon name="arrow" size={12} />
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
                <p className="cmp-muted">
                    Official-site links come from catalog metadata. Checkout is
                    simulated only and never uses a live storefront.
                </p>
            </div>
        </section>
    )
}
