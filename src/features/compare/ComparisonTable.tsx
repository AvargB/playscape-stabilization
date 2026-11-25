/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { steam, type GameRecord } from "../../data/games"
import { type GameInfoHandlers } from "./types"
import {
    type ComparisonFilter,
    type ComparisonRow,
    type PriceComparison,
} from "./utils"

export interface ComparisonTableProps extends GameInfoHandlers {
    games: GameRecord[]
    rows: ComparisonRow[]
    filter: ComparisonFilter
    onFilterChange: (filter: ComparisonFilter) => void
    priceComparison: PriceComparison
    saved: number[]
    onRemove: (id: number) => void
    onToggleSaved: (id: number) => void
    onOpenGame: (game: GameRecord | number) => void
}

const FILTERS: Array<{ id: ComparisonFilter; label: string }> = [
    { id: "all", label: "All categories" },
    { id: "differences", label: "Differences only" },
    { id: "shared", label: "Same values" },
]

const isUnavailable = (value: string) => /^not listed$/i.test(value.trim())

export default function ComparisonTable({
    games,
    rows,
    filter,
    onFilterChange,
    priceComparison,
    saved,
    onRemove,
    onToggleSaved,
    onOpenGame,
    onGameHover,
    onGameLeave,
    onGameInfoToggle,
    infoGameId,
}: ComparisonTableProps) {
    return (
        <section className="cmp-panel cmp-table-panel" aria-labelledby="cmp-table-heading">
            <div className="cmp-panel-head">
                <div>
                    <div className="kicker">Side by side</div>
                    <h2 id="cmp-table-heading">Comparison workspace</h2>
                </div>
                <div className="cmp-filters" role="group" aria-label="Comparison categories">
                    {FILTERS.map(({ id, label }) => (
                        <button
                            type="button"
                            key={id}
                            className={filter === id ? "cmp-filter current" : "cmp-filter"}
                            aria-pressed={filter === id}
                            onClick={() => onFilterChange(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {games.length === 1 && (
                <p className="cmp-notice" role="status">
                    Add one more game to see shared and differing characteristics.
                </p>
            )}
            <p className="cmp-muted">
                Prices are sample catalog values, not live store prices.
            </p>
            <div
                className="cmp-scroll"
                role="region"
                aria-label="Side-by-side game comparison, scroll horizontally on small screens"
                tabIndex={0}
            >
                <table className="cmp-table">
                    <caption className="sr-only">
                        Comparison of {games.map((game) => game.title).join(", ")}
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col" className="cmp-label-col">
                                Category
                            </th>
                            {games.map((game) => {
                                const describedBy = infoGameId === game.id ? "cmp-game-info" : undefined
                                return (
                                    <th scope="col" key={game.id} className="cmp-game-col">
                                        <div className="cmp-game-head">
                                            <button
                                                type="button"
                                                className="cmp-game-art"
                                                aria-label={`View ${game.title} product details`}
                                                onClick={() => onOpenGame(game)}
                                            >
                                                <img
                                                    src={steam(game.steamAppId || game.id)}
                                                    alt={`${game.title} cover art`}
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                className="cmp-game-title"
                                                aria-label={`View ${game.title} product details`}
                                                aria-describedby={describedBy}
                                                onPointerEnter={(event) => {
                                                    if (event.pointerType !== "touch") {
                                                        onGameHover(game, event.currentTarget)
                                                    }
                                                }}
                                                onPointerLeave={(event) => {
                                                    if (event.pointerType !== "touch") onGameLeave()
                                                }}
                                                onFocus={(event) => onGameHover(game, event.currentTarget)}
                                                onBlur={onGameLeave}
                                                onClick={() => onOpenGame(game.id)}
                                            >
                                                {game.title}
                                            </button>
                                            <span className="cmp-meta">{game.genre}</span>
                                        </div>
                                        <div className="cmp-head-actions">
                                            <button
                                                type="button"
                                                className="cmp-info-button"
                                                aria-label={`About ${game.title}`}
                                                aria-expanded={describedBy !== undefined}
                                                aria-describedby={describedBy}
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    onGameInfoToggle(game, event.currentTarget)
                                                }}
                                            >
                                                <Icon name="spark" size={12} /> Info
                                            </button>
                                            <button
                                                type="button"
                                                className="cmp-head-action"
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
                                                {saved.includes(game.id) ? "Wishlisted" : "Wishlist"}
                                            </button>
                                            <button
                                                type="button"
                                                className="cmp-head-action"
                                                aria-label={`Remove ${game.title} from comparison`}
                                                onClick={() => onRemove(game.id)}
                                            >
                                                <Icon name="close" size={13} /> Remove
                                            </button>
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={games.length + 1} className="cmp-empty-row">
                                    No categories match this view. Try another filter.
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => {
                            const isPrice = row.id === "price"
                            const unavailable = row.values.some(isUnavailable)
                            return (
                                <tr
                                    key={row.id}
                                    data-status={row.status}
                                    data-unavailable={unavailable ? "true" : undefined}
                                >
                                    <th scope="row" className="cmp-label-col">
                                        <span>{row.label}</span>
                                        {row.status === "shared" && (
                                            <span className="cmp-tag cmp-tag-shared">Same</span>
                                        )}
                                        {row.status === "different" && (
                                            <span className="cmp-tag cmp-tag-different">
                                                Differs
                                            </span>
                                        )}
                                        {row.status === "unavailable" && (
                                            <span className="cmp-tag cmp-tag-unavailable">
                                                Unavailable
                                            </span>
                                        )}
                                        {row.sharedValues.length > 0 && (
                                            <span className="cmp-overlap">
                                                Shared: {row.sharedValues.join(", ")}
                                            </span>
                                        )}
                                        <span className="sr-only">{row.description}</span>
                                    </th>
                                    {games.map((game, index) => {
                                        const lowest = isPrice && priceComparison.lowestPriceIds.includes(game.id)
                                        return (
                                            <td
                                                key={game.id}
                                                className={lowest ? "cmp-lowest" : undefined}
                                            >
                                                <span>{row.values[index]}</span>
                                                {lowest && priceComparison.hasDifference && (
                                                    <span className="cmp-tag cmp-tag-price">
                                                        <Icon name="check" size={11} /> Lowest listed
                                                    </span>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
