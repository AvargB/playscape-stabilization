/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import {
    filterGames,
    searchGames,
    sortGames,
    steam,
    type GameRecord,
} from "../../data/games"
import { socialPeople } from "../../socialData"
import {
    buildReviewBreakdown,
    filterGamesByReviews,
    getFriendGameReviews,
    getGameReviews,
    REVIEW_DISCOVERY_FILTERS,
    type ReviewDiscoveryFilter,
    type ReviewRecord,
} from "../reviews"

export type Season = {
    name: string
    line: string
    tags: string
    id: number
    color: string
    symbol: string
    mood: string
    images: number[]
    description: string
}

export interface DiscoverProps {
    games: GameRecord[]
    saved: number[]
    toggle: (id: number) => void
    openGame: (game: GameRecord | number | null | undefined) => void
    changeView: (v: string, id?: string) => void
    mood: string
    setMood: (mood: string) => void
    prefs: Record<string, string>
    setPrefs: React.Dispatch<React.SetStateAction<Record<string, string>>>
    active: boolean
    setActive: (active: boolean) => void
    query: string
    setQuery: (query: string) => void
    socialDiscovery: boolean
    setSocialDiscovery: (discovery: boolean) => void
    panel: string
    setPanel: (panel: string) => void
    find: () => void
    title: string
    seasons: Season[]
    resultRef: React.RefObject<HTMLDivElement>
    compareIds?: number[]
    toggleCompare?: (id: number) => void
    reviews: ReviewRecord[]
}

const seasonalHighlights: Record<string, string> = {
    Summer: "Bright, social, and energizing",
    Spring: "Relaxing, exploratory, and low-pressure",
    Autumn: "Thoughtful, atmospheric, and immersive",
    Winter: "Focused, challenging, and moody",
}

function Discover({
    games,
    saved,
    toggle,
    openGame,
    changeView,
    mood,
    setMood,
    prefs,
    setPrefs,
    active,
    setActive,
    query,
    setQuery,
    socialDiscovery,
    setSocialDiscovery,
    panel,
    setPanel,
    find,
    title,
    seasons,
    resultRef,
    compareIds = [],
    toggleCompare,
    reviews,
}: DiscoverProps) {
    const [reviewFilter, setReviewFilter] = React.useState<ReviewDiscoveryFilter>("all")
    const data = games?.length ? games : []
    const selected = seasons.find((s) => s.name === mood)
    const budgetLimit = prefs.Budget && prefs.Budget !== "Any budget"
        ? Number(prefs.Budget.replace(/[^0-9]/g, ""))
        : undefined
    const sessionLimits = prefs.Playtime === "15 minutes"
        ? { maxSessionMinutes: 15 }
        : prefs.Playtime === "1 hour"
            ? { maxSessionMinutes: 60 }
            : prefs.Playtime === "Several hours"
                ? { minSessionMinutes: 61, maxSessionMinutes: 120 }
                : prefs.Playtime === "Long sessions"
                    ? { minSessionMinutes: 121 }
                    : {}
    const exactMatches = filterGames(
        {
            moods: active && prefs.Mood ? [prefs.Mood] : undefined,
            maxPrice: active ? budgetLimit : undefined,
            playerModes: active && prefs.Players ? [prefs.Players] : undefined,
            platforms: active && prefs.Platform ? [prefs.Platform] : undefined,
            difficulty: active && prefs.Difficulty ? [prefs.Difficulty] : undefined,
            ...((active ? sessionLimits : {}) as {
                minSessionMinutes?: number
                maxSessionMinutes?: number
            }),
        },
        searchGames(query, data),
    )
    let matches = exactMatches
    if (active && exactMatches.length === 0) {
        const fallbackStages = [
            {
                moods: prefs.Mood ? [prefs.Mood] : undefined,
                maxPrice: budgetLimit,
                playerModes: prefs.Players ? [prefs.Players] : undefined,
                platforms: prefs.Platform ? [prefs.Platform] : undefined,
            },
            {
                moods: prefs.Mood ? [prefs.Mood] : undefined,
                maxPrice: budgetLimit,
                playerModes: prefs.Players ? [prefs.Players] : undefined,
            },
            {
                moods: prefs.Mood ? [prefs.Mood] : undefined,
                maxPrice: budgetLimit,
            },
            {
                moods: prefs.Mood ? [prefs.Mood] : undefined,
            },
        ]
        for (const stage of fallbackStages) {
            const fallback = filterGames(stage, searchGames(query, data))
            if (fallback.length) {
                matches = fallback
                break
            }
        }
        if (!matches.length) matches = searchGames(query, data)
    }
    matches = matches.sort((a, b) => {
        const score = (g: any) =>
            (g.season === mood ? 1 : 0) +
            (socialDiscovery
                ? socialPeople.filter(
                    (p) => p.id !== "you" && p.recommends.includes(g.id),
                ).length * 2
                : 0)
        return score(b) - score(a)
    })
    const reviewMatches = filterGamesByReviews(matches, reviews, reviewFilter)
    const shown = active || query || reviewFilter !== "all"
        ? reviewMatches
        : reviewMatches.slice(0, 4)

    const randomizePreferences = () => {
        const budgets = ["Under $10", "Under $25", "Under $50", "Any budget"]
        const playtimes = [
            "15 minutes",
            "1 hour",
            "Several hours",
            "Long sessions",
        ]
        const pick = (values: string[]) =>
            values[Math.floor(Math.random() * values.length)]

        for (let attempt = 0; attempt < 3000; attempt++) {
            const candidate = {
                Mood: pick(opts.Mood),
                Playtime: pick(playtimes),
                Players: pick(opts.Players),
                Budget: pick(budgets),
                Platform: pick(opts.Platform),
                Difficulty: pick(opts.Difficulty),
            }
            const candidateBudget =
                candidate.Budget !== "Any budget"
                    ? Number(candidate.Budget.replace(/[^0-9]/g, ""))
                    : undefined
            const candidateSession =
                candidate.Playtime === "15 minutes"
                    ? { maxSessionMinutes: 15 }
                    : candidate.Playtime === "1 hour"
                        ? { maxSessionMinutes: 60 }
                        : candidate.Playtime === "Several hours"
                            ? { minSessionMinutes: 61, maxSessionMinutes: 120 }
                            : candidate.Playtime === "Long sessions"
                                ? { minSessionMinutes: 121 }
                                : {}
            const candidateMatches = filterGames(
                {
                    moods: [candidate.Mood],
                    maxPrice: candidateBudget,
                    playerModes: [candidate.Players],
                    platforms: [candidate.Platform],
                    difficulty: [candidate.Difficulty],
                    ...candidateSession,
                },
                data,
            )
            if (candidateMatches.length) {
                setPrefs(candidate)
                setActive(true)
                setQuery("")
                setTimeout(() => find(), 0)
                return
            }
        }

        setPrefs({
            Mood: "",
            Playtime: "",
            Players: "",
            Budget: "",
            Platform: "",
            Difficulty: "",
        })
        setActive(false)
        setQuery("")
    }

    const browseGenres = Array.from(
        new Set(data.flatMap((game) => game.genres)),
    ).sort()
    const browseResults = sortGames(
        filterGames(
            {},
            searchGames(query, data),
        ),
        "featured",
    )

    const opts: any = {
        Mood: [
            "Relaxing",
            "Exciting",
            "Challenging",
            "Competitive",
            "Story-driven",
            "Creative",
            "Atmospheric",
            "Social",
        ],
        Playtime: ["15 minutes", "1 hour", "Several hours", "Long sessions"],
        Players: ["Solo", "Cooperative", "Online multiplayer"],
        Budget: ["Under $10", "Under $25", "Under $50", "Any budget"],
        Platform: ["PC", "PlayStation", "Xbox", "Nintendo Switch"],
        Difficulty: ["Casual", "Moderate", "Challenging", "Very challenging"],
    }

    function choose(s: Season) {
        setMood(s.name)
        setPrefs((p: any) => ({ ...p, Mood: s.mood }))
        find()
    }

    const card = (g: any) => {
        const friendReviewCount = getFriendGameReviews(reviews, g.id).length
        const gameBreakdown = buildReviewBreakdown(getGameReviews(reviews, g.id), g.id)
        return (
        <article className="game" key={g.id}>
            <div className="game-art">
                <button
                    className="art-button"
                    onClick={() => openGame(g)}
                    aria-label={"Explore " + g.title}
                >
                    <img src={steam(g.id)} alt={g.title + " game artwork"} />
                    <span className="explore">
                        <Icon name="arrow" /> Explore game
                    </span>
                </button>
                <button
                    className={"save " + (saved.includes(g.id) ? "saved" : "")}
                    aria-label={
                        (saved.includes(g.id) ? "Remove " : "Save ") + g.title
                    }
                    aria-pressed={saved.includes(g.id)}
                    onClick={() => toggle(g.id)}
                >
                    <Icon
                        name={saved.includes(g.id) ? "heart-filled" : "heart"}
                    />
                </button>
                {toggleCompare && (
                    <button
                        className={
                            "compare-card" +
                            (compareIds.includes(g.id) ? " selected" : "")
                        }
                        aria-label={
                            compareIds.includes(g.id)
                                ? "Remove " + g.title + " from comparison"
                                : "Add " + g.title + " to comparison"
                        }
                        aria-pressed={compareIds.includes(g.id)}
                        onClick={() => toggleCompare(g.id)}
                    >
                        <Icon
                            name={compareIds.includes(g.id) ? "check" : "sliders"}
                            size={14}
                        />
                        <span>{compareIds.includes(g.id) ? "Comparing" : "Compare"}</span>
                    </button>
                )}
            </div>
            <div className="game-info">
                <div className="game-title">
                    <button onClick={() => openGame(g)}>{g.title}</button>
                    <span>${g.price.toFixed(2)}</span>
                </div>
                <p>{g.genre}</p>
                <div className="card-social-context">
                    {socialPeople
                        .filter(
                            (p) => p.id !== "you" && p.recommends.includes(g.id),
                        )
                        .map((p) => p.name.split(" ")[0])
                        .join(" & ")
                        ? "Recommended by " +
                        socialPeople
                            .filter(
                                (p) =>
                                    p.id !== "you" &&
                                    p.recommends.includes(g.id),
                            )
                            .map((p) => p.name.split(" ")[0])
                            .join(" & ")
                        : socialPeople.filter(
                            (p) => p.id !== "you" && p.owned.includes(g.id),
                        ).length + " friends own this"}
                </div>
                {(friendReviewCount > 0 || gameBreakdown.reviewCount > 0) && (
                    <div className="card-review-context">
                        {friendReviewCount > 0
                            ? `${friendReviewCount} friend ${friendReviewCount === 1 ? "review" : "reviews"}`
                            : ""}
                        {friendReviewCount > 0 && gameBreakdown.reviewCount > 0 ? " · " : ""}
                        {gameBreakdown.reviewCount > 0
                            ? `${gameBreakdown.overallAverage?.toFixed(1)}/10 community · ${gameBreakdown.reviewCount} ${gameBreakdown.reviewCount === 1 ? "review" : "reviews"}`
                            : ""}
                    </div>
                )}
                <div className="game-meta">
                    <div className="game-meta-group" role="group" aria-label="Player modes">
                        {g.playerModes.map((mode: string) => (
                            <span className="game-meta-chip" key={mode}>
                                {mode}
                            </span>
                        ))}
                    </div>
                    <div className="game-meta-group game-platforms" role="group" aria-label="Available platforms">
                        {g.platforms.map((platform: string) => (
                            <span className="game-meta-chip" key={platform}>
                                {platform}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="why">
                    <Icon name="spark" size={13} />
                    <span>
                        {active && prefs.Mood
                            ? prefs.Mood + " pick"
                            : g.season + " discovery"}{" "}
                        ·{" "}
                        {g.session === 15
                            ? "Easy to dip into"
                            : "A world to get lost in"}
                    </span>
                </div>
            </div>
        </article>
        )
    }

    return (
        <section id="discover-content">
            <section className="intro">
                <div className="eyebrow">
                    <Icon name="spark" size={12} /> Don't search.
                    Discover.
                </div>
                <h1>{title}</h1>
                <p>
                    Find a game based on the
                    feeling you’re looking for.
                </p>
            </section>
            <section className="finder" aria-label="Experience finder">
                <div className="finder-head">
                    <h2>
                        <Icon name="sliders" size={18} /> Your next
                        great game
                    </h2>
                    <p>Put in details to find a better match.</p>
                </div>
                <div className="finder-fields">
                    {["Mood", "Playtime", "Players", "Budget"].map(
                        (k, i) => (
                            <label key={k}>
                                {
                                    [
                                        "I’m feeling",
                                        "I have",
                                        "I’m playing",
                                        "My budget",
                                    ][i]
                                }
                                <select
                                    aria-label={k}
                                    value={prefs[k]}
                                    onChange={(e) =>
                                        setPrefs({
                                            ...prefs,
                                            [k]: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">
                                        {
                                            [
                                                "Any mood",
                                                "Any amount of time",
                                                "Any player count",
                                                "Any budget",
                                            ][i]
                                        }
                                    </option>
                                    {opts[k].map((x: string) => (
                                        <option key={x}>{x}</option>
                                    ))}
                                </select>
                            </label>
                        )
                    )}
                    <div className="finder-actions">
                        <button className="primary" onClick={find}>
                            Find my experience
                            <Icon name="arrow" size={17} />
                        </button>
                        <button
                            className="randomize-button"
                            type="button"
                            onClick={randomizePreferences}
                        >
                            <Icon name="spark" size={15} />
                            Randomize
                        </button>
                    </div>
                </div>
                <div className="finder-social">
                    <span>Discover through</span>
                    <button
                        aria-pressed={!socialDiscovery}
                        onClick={() => setSocialDiscovery(false)}
                    >
                        My preferences
                    </button>
                    <button
                        aria-pressed={socialDiscovery}
                        onClick={() => setSocialDiscovery(true)}
                    >
                        My preferences + my friends
                    </button>
                </div>
                <div
                    className="finder-social rvw-discover-filter"
                    role="group"
                    aria-label="Review filter"
                >
                    <span>By reviews</span>
                    {REVIEW_DISCOVERY_FILTERS.map((option) => (
                        <button
                            type="button"
                            key={option.id}
                            aria-pressed={reviewFilter === option.id}
                            onClick={() => setReviewFilter(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="finder-foot">
                    <button
                        className="advanced"
                        onClick={() =>
                            setPanel(panel === "advanced" ? "" : "advanced")
                        }
                        aria-expanded={panel === "advanced"}
                    >
                        <Icon name="sliders" size={12} /> Fine-tune
                        platform & difficulty
                    </button>
                    <button
                        className="reset"
                        onClick={() => {
                            setPrefs({
                                Mood: "",
                                Playtime: "",
                                Players: "",
                                Budget: "",
                                Platform: "",
                                Difficulty: "",
                            })
                            setActive(false)
                            setQuery("")
                            setReviewFilter("all")
                        }}
                    >
                        Reset preferences
                    </button>
                </div>
                {panel === "advanced" && (
                    <div className="advanced-fields">
                        {["Platform", "Difficulty"].map((k) => (
                            <label key={k}>
                                {k}
                                <select
                                    aria-label={k}
                                    value={prefs[k]}
                                    onChange={(e) =>
                                        setPrefs({
                                            ...prefs,
                                            [k]: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Any {k.toLowerCase()}</option>
                                    {opts[k].map((x: string) => (
                                        <option key={x}>{x}</option>
                                    ))}
                                </select>
                            </label>
                        ))}
                    </div>
                )}
            </section>
            <section
                className="section"
                ref={resultRef}
                style={{ scrollMarginTop: 24 }}
                aria-live="polite"
            >
                <div className="section-head">
                    <div>
                        <div className="kicker">
                            {active
                                ? "Our suggestion for this moment"
                                : "More for you"}
                        </div>
                        <h2>
                            {query
                                ? "Your search results"
                                : active
                                    ? "Your next possibilities"
                                    : "Picked for your kind of play"}
                        </h2>
                        <p>
                            {active || query
                                ? shown.length +
                                " matches · Sample prices in USD"
                                : "Calm adventures. Surprising favorites. A good place to start."}
                        </p>
                    </div>
                    <button
                        className="text-button"
                        onClick={() => changeView("Browse")}
                    >
                        Browse full catalog
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
                <div className="games">
                    {shown.length ? (
                        shown.map(card)
                    ) : (
                        <div className="empty">
                            <p>
                                No exact matches this time.
                            </p>
                            <button
                                className="primary"
                                style={{ marginTop: 18 }}
                                onClick={() => {
                                    setPrefs({
                                        Mood: "",
                                        Playtime: "",
                                        Players: "",
                                        Budget: "",
                                        Platform: "",
                                        Difficulty: "",
                                    })
                                    setQuery("")
                                    setActive(false)
                                    setReviewFilter("all")
                                }}
                            >
                                Show curated picks
                            </button>
                        </div>
                    )}
                </div>
            </section>
            <div className="section-head" style={{ marginTop: 72 }}>
                <div>
                    <div className="kicker">Browse by category</div>
                    <h2>Browse seasonal collections</h2>
                </div>
            </div>
            <section aria-label="Choose your discovery mood" className="season-grid">
                {seasons.map((s) => (
                    <button
                        key={s.name}
                        className={
                            "season " +
                            (mood === s.name ? "selected" : "")
                        }
                        onClick={() => choose(s)}
                        aria-pressed={mood === s.name}
                    >
                        <span className="season-images" aria-hidden="true">
                            {(s.images || [s.id]).map((id, index) => (
                                <img
                                    key={id}
                                    src={steam(id)}
                                    alt=""
                                    loading="eager"
                                    className={"season-image-" + (index + 1)}
                                />
                            ))}
                        </span>
                        <div className="season-top">
                            <Icon name={s.symbol} size={25} />
                            {mood === s.name && (
                                <span>YOUR DISCOVERY</span>
                            )}
                        </div>
                        <p className="season-description">{s.description}</p>
                        <div className="season-bottom">
                            <span>
                                {mood === s.name ? (
                                    <>
                                        <Icon name="check" size={12} />
                                        Selected mood
                                    </>
                                ) : (
                                    "View collection"
                                )}
                            </span>
                            <Icon name="arrow" size={17} />
                        </div>
                    </button>
                ))}
            </section>
        </section>
    )
}

export default Discover
