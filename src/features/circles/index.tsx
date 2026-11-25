/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import type { GameRecord } from "../../data/games"
import {
    socialPeople,
    type SocialCircle,
    type SocialState,
} from "../../socialData"

type CircleSocial = {
    activity: any[]
    state: SocialState
    games: GameRecord[]
    saved: number[]
    initialCircleTab?: string
    go: (destination: string, id?: string) => void
    join: (id: string) => void
    setDialog: (dialog: any) => void
    shortlist: (circleId: string, gameId: number) => boolean | void
    update: (updater: (prev: SocialState) => SocialState) => void
    useFinder: (prefs: Record<string, string>) => void
}

export interface GamingCirclesProps {
    circleId: string
    social: CircleSocial
    renderSmallGame: (props: {
        id: number
        key?: React.Key
        reason?: string
    }) => React.ReactNode
    renderActivityCard: (item: any) => React.ReactNode
    renderAvatar: (props: { id: string; size?: number }) => React.ReactNode
    renderPersonLink: (props: { id: string }) => React.ReactNode
}

const CIRCLE_TABS = [
    "Overview",
    "Shared wishlist",
    "Group Finder",
    "Discussions",
    "Members",
] as const

const GROUP_FIELDS: Array<{
    key: string
    label: string
    options: string[]
}> = [
    { key: "players", label: "Group size", options: ["2", "3", "4", "6", "8"] },
    {
        key: "platform",
        label: "Shared platform",
        options: ["PC", "PlayStation", "Xbox", "Nintendo Switch"],
    },
    { key: "budget", label: "Budget per player", options: ["10", "25", "50", "100"] },
    {
        key: "mode",
        label: "Play style",
        options: ["Cooperative", "Competitive", "Any style"],
    },
    {
        key: "genre",
        label: "Genre",
        options: ["Any genre", "Adventure", "Life sim", "Management"],
    },
    {
        key: "mood",
        label: "Mood",
        options: ["Any mood", "Relaxing", "Social", "Exciting", "Creative"],
    },
]

const DEFAULT_FINDER_PREFS: Record<string, string> = {
    players: "4",
    platform: "PC",
    budget: "25",
    mode: "Cooperative",
    genre: "Any genre",
    mood: "Any mood",
}

const personById = (id: string) => socialPeople.find((person) => person.id === id)

function maxPlayers(game: GameRecord, platform: string) {
    if (game.id === 413150) return platform === "PC" ? 8 : 4
    if (game.id === 1172620) return 4
    if (game.id === 972660) return 2
    return 1
}

function finderReason(game: GameRecord) {
    if (game.id === 972660) {
        return "Local co-op only. Players share a screen; no online co-op."
    }
    if (game.id === 413150) {
        return "A shared farm with flexible goals, creative play, and room to unwind."
    }
    return "A four-person crew, shared adventures, and unpredictable stories."
}

function isJoinedCircle(circle: SocialCircle) {
    return circle.joined && circle.members.includes("you")
}

function CircleCard({
    circle,
    joined,
    invitation,
    social,
}: {
    circle: SocialCircle
    joined: boolean
    invitation: boolean
    social: CircleSocial
}) {
    return (
        <article
            className={`circle-card ${joined ? "joined" : "discover"}`}
            key={circle.id}
        >
            <div className="circle-card-top">
                <Icon name="spark" size={30} />
                <span>
                    {joined ? "Your circle · " : invitation ? "Invitation · " : ""}
                    {circle.members.length} members
                </span>
            </div>
            <div className="kicker">{circle.topic}</div>
            <h2>{circle.name}</h2>
            <p>{circle.desc}</p>
            <div className="row-actions">
                <button
                    className={joined ? "primary" : "web-secondary"}
                    onClick={() => social.go("Gaming Circles", circle.id)}
                >
                    Explore circle
                    <Icon name="arrow" size={15} />
                </button>
                <button
                    className="text-button"
                    aria-pressed={joined}
                    onClick={() => social.join(circle.id)}
                >
                    {joined ? "Leave circle" : "Join circle"}
                </button>
            </div>
        </article>
    )
}

function CircleDirectory({
    social,
}: {
    social: CircleSocial
}) {
    const joinedCircles = social.state.circles.filter(isJoinedCircle)
    const openCircles = social.state.circles.filter((circle) => !isJoinedCircle(circle))

    function hasInvitation(circleId: string) {
        return social.state.invites.some(
            (invite) =>
                invite.circle === circleId &&
                invite.person === "you" &&
                invite.status === "pending"
        )
    }

    return (
        <main className="social-page">
            <header className="social-heading">
                <div className="kicker">Your circles</div>
                <h1>Gaming Circles</h1>
                <p>
                    Your joined circles are listed first, followed by open circles
                    and invitations.
                </p>
                <div className="social-heading-actions">
                    <button
                        className="primary"
                        onClick={() => social.setDialog({ type: "createCircle" })}
                    >
                        Create a Gaming Circle
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
            </header>

            <section className="circle-section" aria-labelledby="your-circles-heading">
                <div className="section-head">
                    <div>
                        <div className="kicker">Joined</div>
                        <h2 id="your-circles-heading">Your circles</h2>
                        <p>Circles you are already part of.</p>
                    </div>
                    <span className="circle-count">{joinedCircles.length} joined</span>
                </div>
                <div className="circle-directory">
                    {joinedCircles.map((circle) => (
                        <CircleCard
                            key={circle.id}
                            circle={circle}
                            joined
                            invitation={false}
                            social={social}
                        />
                    ))}
                    {!joinedCircles.length && (
                        <div className="empty">
                            You have not joined a circle yet. Open ones are just below.
                        </div>
                    )}
                </div>
            </section>

            {!!openCircles.length && (
                <section
                    className="circle-section discover"
                    aria-labelledby="discover-circles-heading"
                >
                    <div className="section-head">
                        <div>
                            <div className="kicker">Available</div>
                            <h2 id="discover-circles-heading">Discover circles</h2>
                            <p>Open circles and invitations you can join.</p>
                        </div>
                        <span className="circle-count">{openCircles.length} open</span>
                    </div>
                    <div className="circle-directory">
                        {openCircles.map((circle) => (
                            <CircleCard
                                key={circle.id}
                                circle={circle}
                                joined={false}
                                invitation={hasInvitation(circle.id)}
                                social={social}
                            />
                        ))}
                    </div>
                </section>
            )}
        </main>
    )
}

function GroupFinder({
    circle,
    social,
    renderSmallGame,
}: {
    circle: SocialCircle
    social: CircleSocial
    renderSmallGame: GamingCirclesProps["renderSmallGame"]
}) {
    const [prefs, setPrefs] = React.useState<Record<string, string>>({
        ...DEFAULT_FINDER_PREFS,
    })
    const [generated, setGenerated] = React.useState(true)

    const requestedPlayers = Number(prefs.players)
    const found = social.games.filter((game) =>
        maxPlayers(game, prefs.platform) >= requestedPlayers &&
        requestedPlayers <= circle.members.length &&
        game.platform.includes(prefs.platform) &&
        game.price <= Number(prefs.budget) &&
        (prefs.mode === "Any style" ||
            (prefs.mode === "Cooperative" &&
                game.playerModes.includes("co-op")) ||
            (prefs.mode === "Competitive" &&
                game.moods.includes("Competitive"))) &&
        (prefs.genre === "Any genre" ||
            game.genre.toLowerCase().includes(prefs.genre.toLowerCase())) &&
        (prefs.mood === "Any mood" || game.moods.includes(prefs.mood))
    )

    return (
        <section className="group-finder">
            <div className="kicker">Find a game</div>
            <h2>Find a game for this circle</h2>
            <p className="social-muted">
                Filter by play style, genre, mood, and player count. Results use
                this circle’s current members.
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault()
                    setGenerated(true)
                }}
            >
                <div className="group-fields">
                    {GROUP_FIELDS.map((field) => (
                        <label key={field.key}>
                            {field.label}
                            <select
                                value={prefs[field.key]}
                                onChange={(event) => {
                                    setPrefs({
                                        ...prefs,
                                        [field.key]: event.target.value,
                                    })
                                    setGenerated(false)
                                }}
                            >
                                {field.options.map((value) => (
                                    <option value={value} key={value}>
                                        {field.key === "budget"
                                            ? `Under $${value}`
                                            : field.key === "players"
                                                ? `${value} players`
                                                : value}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                </div>
                <button className="primary" type="submit">
                    Find our next game
                    <Icon name="arrow" size={16} />
                </button>
            </form>
            {generated && (
                <div className="group-results" aria-live="polite">
                    <p className="kicker">
                        {found.length} group {found.length === 1 ? "match" : "matches"} · Sample
                        base-game prices
                    </p>
                    {found.map((game) => {
                        const candidates = circle.members.slice(0, requestedPlayers)
                        const own = candidates.filter((id) =>
                            personById(id)?.owned.includes(game.id)
                        )
                        const buy = candidates.filter((id) => !own.includes(id))
                        const peopleNames = (ids: string[]) =>
                            ids
                                .map((id) => personById(id)?.name || "A friend")
                                .join(", ") || "Nobody yet"
                        return (
                            <article className="group-result" key={game.id}>
                                {renderSmallGame({
                                    id: game.id,
                                    key: game.id,
                                    reason: `Supports ${prefs.players} players on ${prefs.platform}`,
                                })}
                                <p>{finderReason(game)}</p>
                                <div className="ownership">
                                    <span>
                                        <strong>Already own it</strong>
                                        {peopleNames(own)}
                                    </span>
                                    <span>
                                        <strong>Would need a copy</strong>
                                        {peopleNames(buy)}
                                    </span>
                                </div>
                                <div className="row-actions">
                                    <button
                                        className="text-button"
                                        onClick={() =>
                                            social.shortlist(circle.id, game.id)
                                        }
                                    >
                                        {circle.wishlist.includes(game.id)
                                            ? "Remove from shared wishlist"
                                            : "Add to shared wishlist"}
                                    </button>
                                    <button
                                        className="text-button"
                                        onClick={() =>
                                            social.useFinder({
                                                Mood:
                                                    prefs.mood === "Any mood"
                                                        ? ""
                                                        : prefs.mood,
                                                Players:
                                                    prefs.mode === "Cooperative"
                                                        ? "Cooperative"
                                                        : "Online multiplayer",
                                                Platform: prefs.platform,
                                                Budget: `Under $${prefs.budget}`,
                                            })
                                        }
                                    >
                                        Explore in Experience Finder
                                        <Icon name="arrow" size={14} />
                                    </button>
                                </div>
                            </article>
                        )
                    })}
                    {!found.length && (
                        <div className="empty">
                            No exact match in this sample collection for this
                            circle and group size.
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}

function CirclePage({
    circle,
    social,
    renderSmallGame,
    renderActivityCard,
    renderAvatar,
    renderPersonLink,
}: {
    circle: SocialCircle
    social: CircleSocial
    renderSmallGame: GamingCirclesProps["renderSmallGame"]
    renderActivityCard: GamingCirclesProps["renderActivityCard"]
    renderAvatar: GamingCirclesProps["renderAvatar"]
    renderPersonLink: GamingCirclesProps["renderPersonLink"]
}) {
    const requestedTab = social.initialCircleTab || "Overview"
    const [tab, setTab] = React.useState<string>(
        (CIRCLE_TABS as readonly string[]).includes(requestedTab)
            ? requestedTab
            : "Overview",
    )
    const [draft, setDraft] = React.useState("")
    const activity = social.activity.filter((item) => item.circle === circle.id)
    const messages = social.state.discussions?.[circle.id] || []

    function postDiscussion(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const text = draft.trim()
        if (!text) return
        social.update((prev) => ({
            ...prev,
            discussions: {
                ...prev.discussions,
                [circle.id]: [
                    ...(prev.discussions?.[circle.id] || []),
                    { person: "you", text },
                ],
            },
        }))
        setDraft("")
    }

    return (
        <main className="social-page">
            <button
                className="text-button back-link"
                onClick={() => social.go("Gaming Circles")}
            >
                Gaming Circles / {circle.name}
            </button>
            <header className="circle-cover">
                <div className="kicker">
                    {circle.topic} · {circle.members.length} members
                </div>
                <h1>{circle.name}</h1>
                <p>{circle.desc}</p>
                <div className="row-actions">
                    <button
                        className="primary"
                        onClick={() =>
                            circle.joined
                                ? setTab("Group Finder")
                                : social.join(circle.id)
                        }
                    >
                        {circle.joined
                            ? "Find a game for everyone"
                            : "Join this circle"}
                        <Icon name="arrow" size={15} />
                    </button>
                    {circle.joined && (
                        <button
                            className="web-secondary"
                            onClick={() =>
                                social.setDialog({ type: "invite", circle: circle.id })
                            }
                        >
                            Invite friends
                        </button>
                    )}
                </div>
            </header>
            <div
                className="social-tabs"
                role="group"
                aria-label="Gaming Circle sections"
            >
                {CIRCLE_TABS.map((name) => (
                    <button
                        key={name}
                        aria-pressed={tab === name}
                        onClick={() => setTab(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <div className="community-layout">
                <div>
                    {tab === "Group Finder" ? (
                        <GroupFinder
                            circle={circle}
                            social={social}
                            renderSmallGame={renderSmallGame}
                        />
                    ) : tab === "Shared wishlist" ? (
                        <>
                            <div className="section-head">
                                <div>
                                    <h2>Shared wishlist</h2>
                                    <p>Games saved by this circle.</p>
                                </div>
                                <button
                                    className="text-button"
                                    onClick={() =>
                                        social.setDialog({
                                            type: "circleGame",
                                            circle: circle.id,
                                        })
                                    }
                                >
                                    Add a game
                                    <Icon name="arrow" size={14} />
                                </button>
                            </div>
                            {circle.wishlist.map((gameId) => (
                                <div className="shared-wishlist-row" key={gameId}>
                                    {renderSmallGame({
                                        id: gameId,
                                        key: gameId,
                                        reason: "Saved by this circle",
                                    })}
                                    <button
                                        className="text-button"
                                        onClick={() => social.shortlist(circle.id, gameId)}
                                    >
                                        {circle.wishlist.includes(gameId)
                                            ? "Remove from circle"
                                            : "Add to circle"}
                                    </button>
                                </div>
                            ))}
                            {!circle.wishlist.length && (
                                <div className="empty">
                                    Start a shared wishlist by adding a game.
                                </div>
                            )}
                        </>
                    ) : tab === "Discussions" ? (
                        <section className="circle-discussion">
                            <h2>Discussions</h2>
                            <p className="social-muted">
                                Talk about games and plans with this circle.
                            </p>
                            {messages.map((message, index) => (
                                <div className="comment" key={`${message.person}-${index}`}>
                                    {renderAvatar({ id: message.person })}
                                    <div>
                                        {renderPersonLink({ id: message.person })}
                                        <p>{message.text}</p>
                                        <button
                                            onClick={() =>
                                                setDraft(
                                                    `@${personById(message.person)?.name || "friend"} `,
                                                )
                                            }
                                        >
                                            Reply
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <form className="circle-compose" onSubmit={postDiscussion}>
                                <label>
                                    Join the conversation
                                    <textarea
                                        required
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                        placeholder="A game suggestion, a time to play, a little hello…"
                                        maxLength={700}
                                    />
                                </label>
                                <button type="submit" className="primary">
                                    Post to circle
                                </button>
                            </form>
                        </section>
                    ) : tab === "Members" ? (
                        <div className="member-grid">
                            {circle.members.map((personId) => {
                                const person = personById(personId)
                                return (
                                    <button
                                        className="member-card"
                                        key={personId}
                                        onClick={() => social.go("Profile", personId)}
                                    >
                                        {renderAvatar({ id: personId, size: 54 })}
                                        <strong>{person?.name || "A friend"}</strong>
                                        <span>{person?.handle || "@friend"}</span>
                                        <span>Explore profile</span>
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <>
                            <div className="section-head">
                                <div>
                                    <div className="kicker">Recent</div>
                                    <h2>Circle activity</h2>
                                </div>
                            </div>
                            <div className="activity-feed">
                                {activity.map((item) => (
                                    <React.Fragment key={item.id}>
                                        {renderActivityCard(item)}
                                    </React.Fragment>
                                ))}
                                {!activity.length && (
                                    <div className="empty">
                                        Your circle is ready. Start with a game
                                        recommendation or a discussion.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <aside className="community-sidebar">
                    <div className="side-card">
                        <h2>Playing together</h2>
                        {circle.playing.map((gameId) => (
                            <React.Fragment key={gameId}>
                                {renderSmallGame({
                                    id: gameId,
                                    key: gameId,
                                    reason: "A world your circle shares",
                                })}
                            </React.Fragment>
                        ))}
                        {!circle.playing.length && (
                            <p className="social-muted">
                                Use Group Finder to find a shared game.
                            </p>
                        )}
                    </div>
                    <div className="side-card">
                        <h2>Members</h2>
                        {circle.members.map((personId) => {
                            const person = personById(personId)
                            return (
                                <button
                                    className="circle-mini"
                                    key={personId}
                                    onClick={() => social.go("Profile", personId)}
                                >
                                    {renderAvatar({ id: personId, size: 30 })}
                                    <span>
                                        <strong>{person?.name || "A friend"}</strong>
                                        <small>View profile</small>
                                    </span>
                                    <Icon name="arrow" size={13} />
                                </button>
                            )
                        })}
                    </div>
                    <div className="side-card">
                        <h2>Shared recommendations</h2>
                        {circle.wishlist.slice(0, 2).map((gameId) => (
                            <React.Fragment key={gameId}>
                                {renderSmallGame({ id: gameId, key: gameId })}
                            </React.Fragment>
                        ))}
                        {!circle.wishlist.length && (
                            <p className="social-muted">
                                No shared picks yet. Recommend one to the circle.
                            </p>
                        )}
                        <button
                            className="web-secondary full"
                            onClick={() =>
                                social.setDialog({
                                    type: "circleGame",
                                    circle: circle.id,
                                })
                            }
                        >
                            Recommend to the circle
                        </button>
                    </div>
                </aside>
            </div>
        </main>
    )
}

export default function GamingCircles({
    circleId,
    social,
    renderSmallGame,
    renderActivityCard,
    renderAvatar,
    renderPersonLink,
}: GamingCirclesProps) {
    const circle = social.state.circles.find((entry) => entry.id === circleId)
    if (!circle) return <CircleDirectory social={social} />

    return (
        <CirclePage
            key={circle.id}
            circle={circle}
            social={social}
            renderSmallGame={renderSmallGame}
            renderActivityCard={renderActivityCard}
            renderAvatar={renderAvatar}
            renderPersonLink={renderPersonLink}
        />
    )
}
