/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { steam, type GameRecord } from "../../data/games"
import { type GameInfoHandlers } from "./types"
import { MAX_COMPARISON_GAMES } from "./types"
import { searchComparisonGames } from "./utils"

export interface GamePickerProps extends GameInfoHandlers {
    games: GameRecord[]
    selectedGameIds: number[]
    onAdd: (id: number) => void
    onRemove: (id: number) => void
    onOpenGame?: (game: GameRecord | number) => void
}

export default function GamePicker({
    games,
    selectedGameIds,
    onAdd,
    onRemove,
    onOpenGame,
    onGameHover,
    onGameLeave,
    onGameInfoToggle,
    infoGameId,
}: GamePickerProps) {
    const [query, setQuery] = React.useState("")
    const results = React.useMemo(
        () => searchComparisonGames(query, selectedGameIds, games),
        [query, selectedGameIds, games]
    )
    const full = selectedGameIds.length >= MAX_COMPARISON_GAMES
    const visible = results.slice(0, 8)

    return (
        <section className="cmp-panel cmp-picker" aria-labelledby="cmp-picker-heading">
            <div className="cmp-panel-head">
                <div>
                    <div className="kicker">Catalog picker</div>
                    <h2 id="cmp-picker-heading">Add games to compare</h2>
                </div>
                <p className="cmp-muted">
                    {selectedGameIds.length}/{MAX_COMPARISON_GAMES} selected
                </p>
            </div>
            {full && (
                <p className="cmp-notice" id="cmp-capacity" role="status">
                    Comparison is full ({MAX_COMPARISON_GAMES} games). Remove a
                    game before adding another.
                </p>
            )}
            <label className="cmp-search">
                <Icon name="search" size={16} />
                <span className="sr-only">Search games to compare by title</span>
                <input
                    type="search"
                    value={query}
                    placeholder="Search the catalog by title…"
                    aria-label="Search games to compare by title"
                    aria-describedby={full ? "cmp-capacity" : undefined}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </label>
            <p className="cmp-muted cmp-results-count" aria-live="polite">
                {results.length === 0
                    ? "No catalog games match this search."
                    : `Showing ${visible.length} of ${results.length} catalog games.`}
            </p>
            {results.length > 0 && (
                <ul className="cmp-results">
                    {visible.map(({ game, selected }) => {
                        const describedBy = infoGameId === game.id ? "cmp-game-info" : undefined
                        return (
                            <li className="cmp-result" key={game.id}>
                                <button
                                    type="button"
                                    className="cmp-result-art"
                                    aria-label={`View ${game.title} product details`}
                                    onClick={() => onOpenGame?.(game)}
                                >
                                    <img src={steam(game.steamAppId || game.id)} alt="" loading="lazy" />
                                </button>
                                <div
                                    className="cmp-result-body"
                                    tabIndex={0}
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
                                    onBlur={(event) => {
                                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                            onGameLeave()
                                        }
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="cmp-result-title"
                                        aria-label={`View ${game.title} product details`}
                                        onClick={() => onOpenGame?.(game)}
                                    >
                                        <strong>{game.title}</strong>
                                    </button>
                                    <span className="cmp-muted">{game.genre}</span>
                                    <span className="cmp-muted">
                                        ${game.price.toFixed(2)} · {game.platforms.join(", ")}
                                    </span>
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
                                </div>
                                {selected ? (
                                    <span className="cmp-selected-tag">
                                        <Icon name="check" size={13} /> Selected
                                    </span>
                                ) : null}
                                <button
                                    type="button"
                                    className={selected ? "web-secondary" : "primary"}
                                    disabled={!selected && full}
                                    aria-label={
                                        selected
                                            ? `Remove ${game.title} from comparison`
                                            : `Add ${game.title} to comparison`
                                    }
                                    aria-pressed={selected}
                                    onClick={() =>
                                        selected ? onRemove(game.id) : onAdd(game.id)
                                    }
                                >
                                    {selected ? "Remove" : "Add"}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
