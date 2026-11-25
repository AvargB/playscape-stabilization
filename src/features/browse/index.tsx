/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import {
    filterGames,
    searchGames,
    sortGames,
    type GameRecord,
} from "../../data/games"

export interface BrowseProps {
    games: GameRecord[]
    query: string
    setQuery: (query: string) => void
    changeView: (v: string, id?: string) => void
    setActive: (active: boolean) => void
    renderCard: (g: any) => React.ReactNode
}

export default function Browse({
    games,
    query,
    setQuery,
    changeView,
    setActive,
    renderCard,
}: BrowseProps) {
    const data = games?.length ? games : []
    const [browseGenre, setBrowseGenre] = React.useState("")
    const [browsePlatform, setBrowsePlatform] = React.useState("")
    const [browseSort, setBrowseSort] = React.useState("featured")

    const browseGenres = Array.from(
        new Set(data.flatMap((game) => game.genres)),
    ).sort()
    const browseResults = sortGames(
        filterGames(
            {
                genres: browseGenre ? [browseGenre] : undefined,
                platforms: browsePlatform ? [browsePlatform] : undefined,
            },
            searchGames(query, data),
        ),
        browseSort as "featured" | "title" | "price-low" | "price-high",
    )

    return (
        <section className="browse-page">
            <section className="intro">
                <div className="eyebrow">
                    <Icon name="search" size={12} /> Game catalog
                </div>
                <h1>Discover games</h1>
                <p>
                    Explore the catalog by genre, platform, or simply search for
                    something that catches your eye.
                </p>
            </section>
            <section className="finder browse-controls" aria-label="Browse catalog filters">
                <div className="finder-head">
                    <h2>
                        <Icon name="sliders" size={18} /> Browse the collection
                    </h2>
                    <p>
                        {browseResults.length} {browseResults.length === 1 ? "game" : "games"} in this view
                    </p>
                </div>
                <div className="finder-fields browse-fields">
                    <label>
                        Search games
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search titles, stories, genres…"
                            aria-label="Search catalog"
                        />
                    </label>
                    <label>
                        Genre
                        <select
                            value={browseGenre}
                            onChange={(event) =>
                                setBrowseGenre(event.target.value)
                            }
                            aria-label="Filter by genre"
                        >
                            <option value="">All genres</option>
                            {browseGenres.map((genre) => (
                                <option key={genre} value={genre}>
                                    {genre}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Platform
                        <select
                            value={browsePlatform}
                            onChange={(event) =>
                                setBrowsePlatform(event.target.value)
                            }
                            aria-label="Filter by platform"
                        >
                            <option value="">All platforms</option>
                            {Array.from(
                                new Set(data.flatMap((game) => game.platforms)),
                            )
                                .sort()
                                .map((platform) => (
                                    <option key={platform} value={platform}>
                                        {platform}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label>
                        Sort by
                        <select
                            value={browseSort}
                            onChange={(event) =>
                                setBrowseSort(event.target.value)
                            }
                            aria-label="Sort games"
                        >
                            <option value="featured">Featured order</option>
                            <option value="title">Title A–Z</option>
                            <option value="price-low">Price: low to high</option>
                            <option value="price-high">Price: high to low</option>
                        </select>
                    </label>
                </div>
                <div className="finder-foot">
                    <span className="summary">
                        Filters and search are applied to the shared game catalog.
                    </span>
                    <div className="finder-foot-actions">
                        <button
                            className="text-button"
                            onClick={() => {
                                setActive(
                                    Boolean(query || browseGenre || browsePlatform),
                                )
                                changeView("Discover")
                            }}
                        >
                            Use in Discover
                            <Icon name="arrow" size={15} />
                        </button>
                        <button
                            className="text-button"
                            onClick={() => changeView("Compare")}
                        >
                            Compare games
                            <Icon name="sliders" size={15} />
                        </button>
                        <button
                            className="reset"
                            onClick={() => {
                                setQuery("")
                                setBrowseGenre("")
                                setBrowsePlatform("")
                                setBrowseSort("featured")
                            }}
                        >
                            Clear browse filters
                        </button>
                    </div>
                </div>
            </section>
            <section className="section" aria-live="polite">
                <div className="section-head">
                    <div>
                        <div className="kicker">The PLAYSCAPE catalog</div>
                        <h2>
                            {query
                                ? `Results for “${query}”`
                                : browseGenre || "Every possibility"}
                        </h2>
                        <p>
                            {browseResults.length} matches · Sample prices in USD
                        </p>
                    </div>
                </div>
                <div className="games">
                    {browseResults.length ? (
                        browseResults.map(renderCard)
                    ) : (
                        <div className="empty">
                            <p>
                                No games match those filters. Try another genre
                                or platform.
                            </p>
                            <button
                                className="primary"
                                style={{ marginTop: 18 }}
                                onClick={() => {
                                    setQuery("")
                                    setBrowseGenre("")
                                    setBrowsePlatform("")
                                }}
                            >
                                Show all games
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </section>
    )
}
