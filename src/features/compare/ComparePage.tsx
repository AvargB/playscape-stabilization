/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import type { GameRecord } from "../../data/games"
import { getFriendGameReviews, type ReviewRecord } from "../reviews"
import type { PurchaseType } from "../checkout/types"
import ComparisonSummary from "./ComparisonSummary"
import ComparisonTable from "./ComparisonTable"
import { GameInfoPopover, type GameInfoTarget } from "./GameInfoPopover"
import GamePicker from "./GamePicker"
import { MAX_COMPARISON_GAMES, MIN_COMPARISON_GAMES } from "./types"
import {
    buildComparisonReviewRows,
    buildComparisonRows,
    filterComparisonRows,
    getComparisonGames,
    getPriceComparison,
    getPriceRow,
    type ComparisonFilter,
} from "./utils"

export interface ComparePageProps {
    games: GameRecord[]
    selectedGameIds: number[]
    saved: number[]
    onAdd: (id: number) => void
    onRemove: (id: number) => void
    onClear: () => void
    onToggleSaved: (id: number) => void
    onOpenGame: (game: GameRecord | number) => void
    onBrowse: () => void
    reviews?: ReviewRecord[]
    onCheckout?: (id: number, type: PurchaseType) => void
    ownedIds?: number[]
}

export default function ComparePage({
    games,
    selectedGameIds,
    saved,
    onAdd,
    onRemove,
    onClear,
    onToggleSaved,
    onOpenGame,
    onBrowse,
    reviews = [],
    onCheckout,
    ownedIds = [],
}: ComparePageProps) {
    const [filter, setFilter] = React.useState<ComparisonFilter>("all")
    const [infoTarget, setInfoTarget] = React.useState<GameInfoTarget | null>(null)
    const catalog = games?.length ? games : []
    const selectedGames = React.useMemo(
        () => getComparisonGames(selectedGameIds, catalog),
        [selectedGameIds, catalog]
    )
    const rows = React.useMemo(
        () => [
            getPriceRow(selectedGames),
            ...buildComparisonReviewRows(selectedGames, reviews),
            ...buildComparisonRows(selectedGames),
        ],
        [reviews, selectedGames]
    )
    const friendReviewedGames = React.useMemo(
        () => selectedGames.filter((game) => getFriendGameReviews(reviews, game.id).length > 0),
        [reviews, selectedGames]
    )
    const priceComparison = React.useMemo(
        () => getPriceComparison(selectedGames),
        [selectedGames]
    )
    const visibleRows = filterComparisonRows(rows, filter)
    const isFull = selectedGameIds.length >= MAX_COMPARISON_GAMES

    const closeInfo = React.useCallback(() => setInfoTarget(null), [])
    const showInfo = React.useCallback((game: GameRecord, element: HTMLElement) => {
        setInfoTarget((current) =>
            current?.pinned ? current : { game, element, pinned: false }
        )
    }, [])
    const hideInfo = React.useCallback(() => {
        setInfoTarget((current) => (current?.pinned ? current : null))
    }, [])
    const toggleInfo = React.useCallback((game: GameRecord, element: HTMLElement) => {
        setInfoTarget((current) =>
            current?.pinned && current.game.id === game.id
                ? null
                : { game, element, pinned: true }
        )
    }, [])
    const infoHandlers = {
        onGameHover: showInfo,
        onGameLeave: hideInfo,
        onGameInfoToggle: toggleInfo,
        infoGameId: infoTarget?.game.id,
    }
    const handleAdd = (id: number) => {
        closeInfo()
        onAdd(id)
    }
    const handleRemove = (id: number) => {
        closeInfo()
        onRemove(id)
    }

    return (
        <section className="cmp-page" aria-labelledby="cmp-heading">
            <header className="cmp-intro">
                <div className="eyebrow">
                    <Icon name="sliders" size={12} /> Comparison studio
                </div>
                <h1 id="cmp-heading">Compare games, decide with clarity</h1>
                <p>
                    Put up to {MAX_COMPARISON_GAMES} catalog games side by side.
                    See what they share, where they differ, and which listed
                    price is lowest — without a score telling you what to pick.
                </p>
            </header>
            <div className="cmp-toolbar">
                <p className="cmp-count" role="status" aria-live="polite">
                    <strong>
                        {selectedGameIds.length}/{MAX_COMPARISON_GAMES}
                    </strong>{" "}
                    games in comparison
                    {selectedGameIds.length < MIN_COMPARISON_GAMES && (
                        <span className="cmp-muted">
                            {" "}— add {MIN_COMPARISON_GAMES - selectedGameIds.length} more
                            for a full comparison
                        </span>
                    )}
                </p>
                <button
                    type="button"
                    className="web-secondary"
                    onClick={() => {
                        closeInfo()
                        onClear()
                    }}
                    disabled={selectedGameIds.length === 0}
                >
                    Clear comparison
                </button>
            </div>
            {isFull && (
                <p className="cmp-notice" role="status">
                    Maximum of {MAX_COMPARISON_GAMES} games reached. Remove one
                    before adding another.
                </p>
            )}
            {selectedGames.length > 0 && (
                <ul className="cmp-selection" aria-label="Games in this comparison">
                    {selectedGames.map((game) => (
                        <li key={game.id}>
                            <button
                                type="button"
                                className="cmp-selection-open"
                                aria-label={`View ${game.title} product details`}
                                onClick={() => onOpenGame(game)}
                            >
                                {game.title}
                            </button>
                            <button
                                type="button"
                                aria-label={`Remove ${game.title} from comparison`}
                                onClick={() => handleRemove(game.id)}
                            >
                                <Icon name="close" size={12} /> Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <GamePicker
                games={catalog}
                selectedGameIds={selectedGameIds}
                onAdd={handleAdd}
                onRemove={handleRemove}
                onOpenGame={onOpenGame}
                {...infoHandlers}
            />
            {selectedGames.length === 0 ? (
                <section className="cmp-panel cmp-empty" aria-labelledby="cmp-empty-heading">
                    <Icon name="spark" size={26} />
                    <h2 id="cmp-empty-heading">Your comparison workspace is empty</h2>
                    <p>
                        Search for games above, or browse the catalog to find
                        two or more worlds worth comparing.
                    </p>
                    <button type="button" className="primary" onClick={onBrowse}>
                        Find games to compare <Icon name="arrow" size={14} />
                    </button>
                </section>
            ) : (
                <>
                    {friendReviewedGames.length > 0 && (
                        <p className="cmp-notice rvw-compare-note" role="status">
                            Review facts are context, not a ranking verdict. This
                            studio still assigns no overall score. Read direct
                            friend reviews in game details:{" "}
                            {friendReviewedGames.map((game, index) => (
                                <React.Fragment key={game.id}>
                                    {index > 0 ? " · " : ""}
                                    <button
                                        type="button"
                                        className="text-button"
                                        onClick={() => onOpenGame(game.id)}
                                    >
                                        {game.title}
                                    </button>
                                </React.Fragment>
                            ))}
                        </p>
                    )}
                    <ComparisonTable
                        games={selectedGames}
                        rows={visibleRows}
                        filter={filter}
                        onFilterChange={setFilter}
                        priceComparison={priceComparison}
                        saved={saved}
                        onRemove={handleRemove}
                        onToggleSaved={onToggleSaved}
                        onOpenGame={onOpenGame}
                        ownedIds={ownedIds}
                        {...infoHandlers}
                    />
                    {selectedGames.length >= MIN_COMPARISON_GAMES && (
                        <ComparisonSummary
                            games={selectedGames}
                            catalog={catalog}
                            rows={rows}
                            priceComparison={priceComparison}
                            saved={saved}
                            onToggleSaved={onToggleSaved}
                            onOpenGame={onOpenGame}
                            onCheckout={onCheckout}
                            ownedIds={ownedIds}
                        />
                    )}
                </>
            )}
            <GameInfoPopover target={infoTarget} onClose={closeInfo} />
        </section>
    )
}
