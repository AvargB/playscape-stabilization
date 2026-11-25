import * as React from "react"
import {
    buildComparisonSummary,
    buildFriendGameSignals,
    buildWishlistRecommendations,
    buildWishlistSummary,
    filterGames,
    gameCatalog,
    getGameById,
    getGamesByIds,
    resolveGameRecord,
    searchGames,
    sortGames,
    type GameRecord,
} from "./data/games"
import {
    applyInviteDecision,
    buildInviteSuggestions,
    getPendingInviteSummary,
} from "./socialState"
import {
    buildSocialGraph,
    initialActivity,
    initialCircles,
    socialPeople,
} from "./socialData"

const steam = (id: number) =>
    "https://cdn.akamai.steamstatic.com/steam/apps/" + id + "/header.jpg"
const seasons = [
    {
        name: "Summer",
        line: "High spirits!",
        tags: "Energetic · Social · Playful",
        id: 1172620,
        color: "#f4c267",
        symbol: "sun",
        mood: "Exciting",
    },
    {
        name: "Spring",
        line: "Gentle & new.",
        tags: "Cozy · Creative · Curious",
        id: 413150,
        color: "#b8d8a1",
        symbol: "leaf",
        mood: "Relaxing",
    },
    {
        name: "Autumn",
        line: "Get lost in a good story.",
        tags: "Immersive · Thoughtful · Nostalgic",
        id: 383870,
        color: "#dda879",
        symbol: "leaf",
        mood: "Story-driven",
    },
    {
        name: "Winter",
        line: "Find your next challenge.",
        tags: "Focused · Strategic · Atmospheric",
        id: 323190,
        color: "#b7d7e7",
        symbol: "snow",
        mood: "Challenging",
    },
]
const CommunityContext = React.createContext<any>(null)
const useSocial = () => React.useContext(CommunityContext)
function useCommunityState(
    games: any[],
    saved: number[],
    toggle: any,
    openGame: any,
    go: any,
    useFinder: any
) {
    const [state, setState] = React.useState<any>({
        circles: initialCircles,
        reactions: [],
        comments: {
            a1: [
                {
                    person: "alex",
                    text: "The fishing detour got me too. Highly recommend it.",
                },
            ],
        },
        savedRecs: [],
        privacy: {
            profile: "Friends only",
            wishlist: "Friends only",
            activity: "Friends only",
        },
        sent: [],
        shares: [],
        activity: [],
        discussions: {
            afterhours: [
                {
                    person: "alex",
                    text: "A farm night or a pirate crew this weekend?",
                },
            ],
        },
        invites: [],
    })
    const [loaded, setLoaded] = React.useState(false),
        [dialog, setDialog] = React.useState<any>(null),
        [message, setMessage] = React.useState("")
    React.useEffect(() => {
        try {
            const p = JSON.parse(
                localStorage.getItem("playscape-community-v2") || "null"
            )
            if (p) setState((v: any) => ({ ...v, ...p }))
        } catch {}
        setLoaded(true)
    }, [])
    React.useEffect(() => {
        if (loaded)
            try {
                localStorage.setItem(
                    "playscape-community-v2",
                    JSON.stringify(state)
                )
            } catch {}
    }, [state, loaded])
    React.useEffect(() => {
        if (!message) return
        const t = setTimeout(() => setMessage(""), 3500)
        return () => clearTimeout(t)
    }, [message])
    function update(fn: any) {
        setState((p: any) => fn(p))
    }
    function react(id: string) {
        update((p: any) => ({
            ...p,
            reactions: p.reactions.includes(id)
                ? p.reactions.filter((x: string) => x !== id)
                : [...p.reactions, id],
        }))
    }
    function comment(id: string, text: string) {
        if (!text.trim()) return
        update((p: any) => ({
            ...p,
            comments: {
                ...p.comments,
                [id]: [
                    ...(p.comments[id] || []),
                    { person: "you", text: text.trim() },
                ],
            },
        }))
    }
    function shortlist(circleId: string, gameId: number) {
        if (!state.circles.find((x: any) => x.id === circleId)?.joined) {
            setMessage("Join this Gaming Circle to add to its wishlist.")
            return
        }
        update((p: any) => ({
            ...p,
            circles: p.circles.map((c: any) =>
                c.id === circleId
                    ? {
                          ...c,
                          wishlist: c.wishlist.includes(gameId)
                              ? c.wishlist.filter((id: number) => id !== gameId)
                              : [...c.wishlist, gameId],
                      }
                    : c
            ),
        }))
    }
    function join(id: string) {
        update((p: any) => ({
            ...p,
            circles: p.circles.map((c: any) =>
                c.id === id
                    ? {
                          ...c,
                          joined: !c.joined,
                          members: c.joined
                              ? c.members.filter((x: string) => x !== "you")
                              : [...new Set([...c.members, "you"])],
                      }
                    : c
            ),
        }))
    }
    function respondToInvite(inviteId: string, decision: "accepted" | "declined") {
        if (!inviteId) return
        const result = applyInviteDecision(
            state.invites,
            state.circles,
            inviteId,
            decision
        )

        update((p: any) => ({
            ...p,
            invites: result.invites,
            circles: result.circles,
        }))

        setMessage(
            decision === "accepted"
                ? "Invitation accepted. The friend is now part of the circle."
                : "Invitation declined. The circle stays unchanged."
        )
    }
    return {
        games,
        saved,
        toggle,
        openGame,
        go,
        useFinder,
        state,
        update,
        dialog,
        setDialog,
        message,
        setMessage,
        react,
        comment,
        shortlist,
        join,
        respondToInvite,
        people: socialPeople,
        activity: [...state.activity, ...initialActivity],
    }
}
function Avatar({ id, size = 38 }: { id: string; size?: number }) {
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
    const c = useSocial(),
        p = socialPeople.find((p) => p.id === id) || socialPeople[0]
    return (
        <button
            className="person-link"
            onClick={() => {
                c.openGame(null)
                c.go("Profile", id)
            }}
        >
            {p.name}
        </button>
    )
}
function SmallGame({ id, reason = "" }: { id: number; reason?: string }) {
    const c = useSocial(),
        g = c.games.find((g: any) => g.id === id),
        match = g ? buildFriendGameSignals(g.id, socialPeople, c.saved) : null
    if (!g) return null
    return (
        <article className="small-game">
            <button className="small-game-art" onClick={() => c.openGame(g)}>
                <img src={steam(g.id)} alt={g.title} />
            </button>
            <div>
                <button className="person-link" onClick={() => c.openGame(g)}>
                    {g.title}
                </button>
                <p>{reason || g.genre}</p>
                <span>$ {g.price.toFixed(2)}</span>
                {match && match.friends.length > 0 && (
                    <small className="social-muted" style={{ display: "block", marginTop: 4 }}>
                        {match.reason}
                    </small>
                )}
            </div>
            <button
                className="icon-button"
                aria-label={
                    (c.saved.includes(id) ? "Remove " : "Save ") + g.title
                }
                aria-pressed={c.saved.includes(id)}
                onClick={() => c.toggle(id)}
            >
                <Icon
                    name={c.saved.includes(id) ? "check" : "heart"}
                    size={15}
                />
            </button>
        </article>
    )
}
function ActivityCard({
    item,
    compact = false,
}: {
    item: any
    compact?: boolean
}) {
    const c = useSocial(),
        g = c.games.find((g: any) => g.id === item.game),
        p = socialPeople.find((p) => p.id === item.person) || socialPeople[0]
    const [comments, setComments] = React.useState(false),
        [draft, setDraft] = React.useState("")
    if (!g) return null
    const reacted = c.state.reactions.includes(item.id),
        savedRec = c.state.savedRecs.includes(item.id),
        thread = c.state.comments[item.id] || []
    return (
        <article className={"activity-card " + (compact ? "compact" : "")}>
            <header className="activity-person">
                <button
                    className="avatar-button"
                    onClick={() => c.go("Profile", p.id)}
                    aria-label={"Visit " + p.name}
                >
                    <Avatar id={p.id} />
                </button>
                <div>
                    <PersonLink id={p.id} />
                    <p>{item.action}</p>
                </div>
                <span className="activity-time">{item.time}</span>
            </header>
            <div className="activity-game">
                <button
                    className="activity-art"
                    onClick={() => c.openGame(g)}
                    aria-label={"Explore " + g.title}
                >
                    <img src={steam(g.id)} alt={g.title + " artwork"} />
                </button>
                <div>
                    <div className="kicker">{item.category}</div>
                    <button
                        className="activity-game-name"
                        onClick={() => c.openGame(g)}
                    >
                        {g.title}
                    </button>
                    <p>{g.genre}</p>
                    <span>
                        $ {g.price.toFixed(2)} · {g.players}
                    </span>
                </div>
            </div>
            <blockquote>“{item.quote}”</blockquote>
            <div className="social-reason">
                <Icon name="spark" size={13} />
                <span>{item.why}</span>
            </div>
            <div className="activity-actions">
                <button aria-pressed={reacted} onClick={() => c.react(item.id)}>
                    <Icon name="heart" size={14} />
                    {(item.likes || 0) + (reacted ? 1 : 0)}
                    <span className="action-word"> appreciate</span>
                </button>
                <button
                    aria-expanded={comments}
                    onClick={() => setComments(!comments)}
                >
                    Discuss{thread.length ? " · " + thread.length : ""}
                </button>
                <button
                    aria-pressed={savedRec}
                    onClick={() =>
                        c.update((p: any) => ({
                            ...p,
                            savedRecs: savedRec
                                ? p.savedRecs.filter(
                                      (x: string) => x !== item.id
                                  )
                                : [...p.savedRecs, item.id],
                        }))
                    }
                >
                    {savedRec ? "Saved" : "Save pick"}
                </button>
                <button
                    onClick={() =>
                        c.setDialog({ type: "recommend", game: g.id })
                    }
                >
                    Share
                </button>
                <button
                    className="activity-save"
                    aria-label={
                        (c.saved.includes(g.id) ? "Remove from" : "Add to") +
                        " wishlist"
                    }
                    onClick={() => c.toggle(g.id)}
                >
                    <Icon
                        name={c.saved.includes(g.id) ? "check" : "heart"}
                        size={14}
                    />
                    <span>
                        {c.saved.includes(g.id) ? "Wishlisted" : "Wishlist"}
                    </span>
                </button>
            </div>
            {comments && (
                <section
                    className="comment-thread"
                    aria-label={"Discussion about " + g.title}
                >
                    {thread.map((x: any, i: number) => (
                        <div key={i} className="comment">
                            <Avatar id={x.person} size={25} />
                            <div>
                                <PersonLink id={x.person} />
                                <p>{x.text}</p>
                                <button
                                    onClick={() =>
                                        setDraft(
                                            "@" +
                                                (socialPeople.find(
                                                    (p) => p.id === x.person
                                                )?.name || "Sarah Chen") +
                                                " "
                                        )
                                    }
                                >
                                    Reply
                                </button>
                            </div>
                        </div>
                    ))}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            c.comment(item.id, draft)
                            setDraft("")
                        }}
                    >
                        <label>
                            <span className="sr-only">Add a comment</span>
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder="Add a thoughtful reply…"
                                required
                                maxLength={500}
                            />
                        </label>
                        <button className="primary" type="submit">
                            Post
                        </button>
                    </form>
                </section>
            )}
            {!compact && (
                <button
                    className="activity-circle"
                    onClick={() => c.go("Gaming Circles", item.circle)}
                >
                    {c.state.circles.find((x: any) => x.id === item.circle)
                        ?.name || "Your circle"}
                    <Icon name="arrow" size={13} />
                </button>
            )}
        </article>
    )
}
function CommunityPreview() {
    const c = useSocial()
    return (
        <section className="social-preview">
            <div className="section-head">
                <div>
                    <div className="kicker">
                        A little inspiration from your people
                    </div>
                    <h2>Good games. Better together.</h2>
                    <p>
                        The best discoveries sometimes start with someone else.
                    </p>
                </div>
                <button
                    className="text-button"
                    onClick={() => c.go("Community")}
                >
                    Your community
                    <Icon name="arrow" size={15} />
                </button>
            </div>
            <div className="preview-grid">
                {c.activity.slice(0, 3).map((a: any) => (
                    <ActivityCard key={a.id} item={a} compact />
                ))}
            </div>
            <div className="social-preview-foot">
                <span>
                    <Avatar id="jamie" size={25} />
                    <Avatar id="alex" size={25} /> Jamie and Alex are playing
                    Stardew Valley together.
                </span>
                <button
                    className="text-button"
                    onClick={() => c.go("Gaming Circles", "afterhours")}
                >
                    Find your next group game
                    <Icon name="arrow" size={14} />
                </button>
            </div>
        </section>
    )
}
function CommunityPage() {
    const c = useSocial(),
        [filter, setFilter] = React.useState("For you"),
        [count, setCount] = React.useState(4)
    const items = c.activity.filter(
        (a: any) =>
            filter === "For you" ||
            (filter === "Saved picks" && c.state.savedRecs.includes(a.id)) ||
            a.category === filter
    )
    const pendingInvites = (c.state.invites || []).filter(
        (invite: any) => invite.status === "pending"
    )
    const inviteSummary = getPendingInviteSummary(
        c.state.invites || [],
        c.state.circles || []
    )
    return (
        <main className="social-page">
            <header className="social-heading">
                <div className="kicker">
                    Your people. Your next possibility.
                </div>
                <h1>Good taste is better shared.</h1>
                <p>
                    Follow a recommendation. Join a conversation. Find your next
                    favorite.
                </p>
                <div className="social-heading-actions">
                    <button
                        className="primary"
                        onClick={() =>
                            c.setDialog({ type: "recommend", game: 1055540 })
                        }
                    >
                        Recommend a game
                        <Icon name="arrow" size={16} />
                    </button>
                    <button
                        className="text-button"
                        onClick={() => c.go("The Web")}
                    >
                        Explore your Web
                        <Icon name="arrow" size={15} />
                    </button>
                </div>
            </header>
            <div className="community-layout">
                <div>
                    <div
                        className="social-tabs"
                        role="group"
                        aria-label="Activity filters"
                    >
                        {[
                            "For you",
                            "Friends are playing",
                            "Recommendations",
                            "Reviews",
                            "Recently discovered",
                            "Multiplayer",
                            "Completed games",
                            "Circle activity",
                            "Saved picks",
                        ].map((x) => (
                            <button
                                aria-pressed={filter === x}
                                key={x}
                                onClick={() => {
                                    setFilter(x)
                                    setCount(4)
                                }}
                            >
                                {x}
                            </button>
                        ))}
                    </div>
                    <div className="activity-feed">
                        {items.slice(0, count).map((a: any) => (
                            <ActivityCard key={a.id} item={a} />
                        ))}
                        {!items.length && (
                            <div className="empty">
                                No saved picks yet. Save a friend’s
                                recommendation to find it here.
                            </div>
                        )}
                    </div>
                    {items.length > count && (
                        <button
                            className="web-secondary full"
                            onClick={() => setCount(count + 4)}
                        >
                            Discover more from your circle
                        </button>
                    )}
                </div>
                <aside className="community-sidebar">
                    <div className="side-card">
                        <div className="kicker">A good place to belong</div>
                        <h2>Your Gaming Circles</h2>
                        {c.state.circles.map((circle: any) => (
                            <button
                                className="circle-mini"
                                key={circle.id}
                                onClick={() =>
                                    c.go("Gaming Circles", circle.id)
                                }
                            >
                                <span className="circle-glyph">
                                    <Icon name="spark" size={18} />
                                </span>
                                <span>
                                    <strong>{circle.name}</strong>
                                    <small>
                                        {circle.members.length} members ·{" "}
                                        {circle.joined
                                            ? "Your circle"
                                            : "Explore"}
                                    </small>
                                </span>
                                <Icon name="arrow" size={13} />
                            </button>
                        ))}
                        <button
                            className="web-secondary full"
                            onClick={() =>
                                c.setDialog({ type: "createCircle" })
                            }
                        >
                            Create a circle
                        </button>
                    </div>
                    <div className="side-card">
                        <div className="kicker">Pending invites</div>
                        <h2>Circle requests</h2>
                        {pendingInvites.length ? (
                            pendingInvites.map((invite: any) => {
                                const circle = c.state.circles.find(
                                    (entry: any) => entry.id === invite.circle
                                )
                                const person = socialPeople.find(
                                    (entry) => entry.id === invite.person
                                )
                                return (
                                    <div key={invite.id} className="invite-row">
                                        <div>
                                            <strong>{person?.name || "A friend"}</strong>
                                            <small>
                                                {circle?.name || "A gaming circle"}
                                            </small>
                                        </div>
                                        <div className="row-actions compact">
                                            <button
                                                className="primary"
                                                onClick={() =>
                                                    c.respondToInvite(
                                                        invite.id,
                                                        "accepted"
                                                    )
                                                }
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="text-button"
                                                onClick={() =>
                                                    c.respondToInvite(
                                                        invite.id,
                                                        "declined"
                                                    )
                                                }
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="social-muted">
                                No pending invites right now.
                            </p>
                        )}
                        {inviteSummary.total > 0 && (
                            <small className="social-muted">
                                {inviteSummary.total} pending invite
                                {inviteSummary.total === 1 ? "" : "s"}
                                {inviteSummary.accepted > 0 || inviteSummary.declined > 0
                                    ? ` · ${inviteSummary.accepted} accepted · ${inviteSummary.declined} declined`
                                    : ""}
                            </small>
                        )}
                        {inviteSummary.total === 0 && (
                            <small className="social-muted">
                                {inviteSummary.accepted > 0 || inviteSummary.declined > 0
                                    ? `${inviteSummary.accepted} accepted · ${inviteSummary.declined} declined`
                                    : "No action needed right now."}
                            </small>
                        )}
                    </div>
                    <div className="side-card">
                        <div className="kicker">Overlapping wishlists</div>
                        <h2>On everyone’s mind</h2>
                        <SmallGame
                            id={972660}
                            reason="Jamie and Alex want to play"
                        />
                        <SmallGame
                            id={1172620}
                            reason="Jamie wants in. Alex & Morgan own it."
                        />
                    </div>
                    <div className="side-note">
                        <Icon name="leaf" size={20} />
                        <p>
                            Less noise.
                            <br />
                            More “you’d love this.”
                        </p>
                        <span>
                            Sample people. Real possibilities.
                            <br />
                            Your interactions stay in this browser.
                        </span>
                    </div>
                </aside>
            </div>
        </main>
    )
}
function PlayerProfile({ id }: { id: string }) {
    const c = useSocial(),
        p = socialPeople.find((p) => p.id === id) || socialPeople[0],
        [tab, setTab] = React.useState("Overview"),
        [audience, setAudience] = React.useState("Myself"),
        own = p.id === "you",
        circles = c.state.circles.filter((x: any) => x.members.includes(p.id)),
        publicWishlist = own
            ? audience === "Myself" ||
              c.state.privacy.wishlist === "Public" ||
              (audience === "Friend" &&
                  c.state.privacy.wishlist === "Friends only")
            : p.privacy !== "Private"
    const wishlist = own ? c.saved : p.wishlist
    const profileAllowed =
        !own ||
        audience === "Myself" ||
        c.state.privacy.profile === "Public" ||
        (audience === "Friend" && c.state.privacy.profile === "Friends only")
    const activityAllowed =
        !own ||
        audience === "Myself" ||
        c.state.privacy.activity === "Public" ||
        (audience === "Friend" && c.state.privacy.activity === "Friends only")
    return (
        <main className="social-page">
            <button
                className="text-button back-link"
                onClick={() => c.go("Community")}
            >
                Community / Player profile
            </button>
            <header className="profile-cover">
                <div className="profile-identity">
                    <Avatar id={p.id} size={84} />
                    <div>
                        <div className="kicker">
                            {own
                                ? "Your gaming identity"
                                : "A player in your circle"}
                        </div>
                        <h1>{p.name}</h1>
                        <span>
                            {p.handle} ·{" "}
                            {own ? c.state.privacy.profile : p.privacy}
                        </span>
                    </div>
                </div>
                <p>{p.bio}</p>
                <div className="profile-shared">
                    {p.interests.map((i) => (
                        <span className="pill" key={i}>
                            {i}
                        </span>
                    ))}
                </div>
                <div className="profile-cover-actions">
                    <button
                        className="primary"
                        onClick={() => c.go("The Web", p.id)}
                    >
                        Find them in The Web
                        <Icon name="arrow" size={15} />
                    </button>
                    <button
                        className="web-secondary"
                        onClick={() =>
                            c.setDialog(
                                own
                                    ? { type: "privacy" }
                                    : {
                                          type: "recommend",
                                          game: 1055540,
                                          recipient: p.id,
                                      }
                            )
                        }
                    >
                        {own ? "Privacy settings" : "Recommend a game"}
                    </button>
                </div>
            </header>
            {own && (
                <div className="privacy-preview">
                    <label>
                        Preview your profile as
                        <select
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                        >
                            {["Myself", "Friend", "Public visitor"].map((v) => (
                                <option key={v}>{v}</option>
                            ))}
                        </select>
                    </label>
                    <span>Visibility choices are simulated locally.</span>
                </div>
            )}
            {!profileAllowed ? (
                <div className="empty">
                    This profile is {c.state.privacy.profile.toLowerCase()}. Its
                    gaming details are hidden from this visitor.
                </div>
            ) : (
                <>
                    <div className="social-tabs">
                        {[
                            "Overview",
                            "Recommendations",
                            "Reviews",
                            "Wishlist",
                            "Collections",
                        ].map((t) => (
                            <button
                                key={t}
                                aria-pressed={tab === t}
                                onClick={() => setTab(t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="community-layout">
                        <div>
                            {tab === "Overview" ? (
                                <>
                                    <section className="profile-section">
                                        <div className="section-head">
                                            <h2>Currently in their world</h2>
                                        </div>
                                        <div className="social-game-grid">
                                            {p.playing.map((id) => (
                                                <SmallGame
                                                    key={id}
                                                    id={id}
                                                    reason="Currently playing"
                                                />
                                            ))}
                                        </div>
                                    </section>
                                    <section className="profile-section">
                                        <div className="section-head">
                                            <h2>The all-time favorites</h2>
                                        </div>
                                        <div className="social-game-grid">
                                            {p.favorites.map((id) => (
                                                <SmallGame key={id} id={id} />
                                            ))}
                                        </div>
                                    </section>
                                    <section className="profile-section">
                                        <div className="section-head">
                                            <h2>
                                                Recently explored & completed
                                            </h2>
                                        </div>
                                        {p.recent.map((id) => (
                                            <SmallGame
                                                key={id}
                                                id={id}
                                                reason={
                                                    p.completed.includes(id)
                                                        ? "Completed · A story to talk about"
                                                        : "Recently played"
                                                }
                                            />
                                        ))}
                                    </section>
                                </>
                            ) : tab === "Recommendations" ? (
                                <div className="activity-feed">
                                    {c.activity
                                        .filter(
                                            (a: any) =>
                                                activityAllowed &&
                                                a.person === p.id &&
                                                a.category === "Recommendations"
                                        )
                                        .map((a: any) => (
                                            <ActivityCard key={a.id} item={a} />
                                        ))}
                                    {p.recommends.map((id) => (
                                        <SmallGame
                                            key={id}
                                            id={id}
                                            reason={"Recommended by " + p.name}
                                        />
                                    ))}
                                </div>
                            ) : tab === "Reviews" ? (
                                <div className="activity-feed">
                                    {c.activity
                                        .filter(
                                            (a: any) =>
                                                activityAllowed &&
                                                a.person === p.id &&
                                                [
                                                    "Reviews",
                                                    "Completed games",
                                                ].includes(a.category)
                                        )
                                        .map((a: any) => (
                                            <ActivityCard key={a.id} item={a} />
                                        ))}
                                    {!c.activity.some(
                                        (a: any) =>
                                            a.person === p.id &&
                                            [
                                                "Reviews",
                                                "Completed games",
                                            ].includes(a.category)
                                    ) && (
                                        <div className="empty">
                                            No published reviews yet. Explore
                                            their recommendations instead.
                                        </div>
                                    )}
                                </div>
                            ) : tab === "Wishlist" ? (
                                <>
                                    <div className="summary">
                                        {own
                                            ? "Choose who can see your wishlist in Privacy settings. Share a game directly with a friend or a Gaming Circle."
                                            : p.privacy === "Friends only"
                                              ? "Visible to you as a friend. This wishlist isn’t public."
                                              : "A public collection of worlds they’d like to explore."}
                                    </div>
                                    {publicWishlist ? (
                                        wishlist.map((id: number) => (
                                            <SmallGame
                                                key={id}
                                                id={id}
                                                reason={
                                                    c.saved.includes(id) && !own
                                                        ? "On both your wishlists"
                                                        : "On the wishlist"
                                                }
                                            />
                                        ))
                                    ) : (
                                        <div className="empty">
                                            This wishlist is private.
                                        </div>
                                    )}
                                    {own && (
                                        <button
                                            className="web-secondary full"
                                            onClick={() =>
                                                c.setDialog({
                                                    type: "recommend",
                                                    game: c.saved[0] || 413150,
                                                })
                                            }
                                        >
                                            Share a wishlist game
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <section className="profile-section">
                                        <h2>Worlds worth wandering</h2>
                                        <p className="social-muted">
                                            A personal collection of favorites,
                                            not a ranked list.
                                        </p>
                                        {p.favorites.map((id) => (
                                            <SmallGame id={id} key={id} />
                                        ))}
                                    </section>
                                    <section className="profile-section">
                                        <h2>Finished, but not forgotten</h2>
                                        {p.completed.map((id) => (
                                            <SmallGame id={id} key={id} />
                                        ))}
                                    </section>
                                </>
                            )}
                        </div>
                        <aside className="community-sidebar">
                            <div className="side-card">
                                <div className="kicker">
                                    The beautiful overlap
                                </div>
                                <h2>
                                    {own ? "Your interests" : "What you share"}
                                </h2>
                                <div className="profile-shared">
                                    {p.interests
                                        .filter((i) =>
                                            socialPeople[0].interests.includes(
                                                i
                                            )
                                        )
                                        .map((i) => (
                                            <span className="pill" key={i}>
                                                {i}
                                            </span>
                                        ))}
                                </div>
                                <p className="social-muted">
                                    {own
                                        ? "Three friends, a few familiar worlds, and plenty left to discover."
                                        : "A shared interest is a good reason to follow an unfamiliar recommendation."}
                                </p>
                            </div>
                            <div className="side-card">
                                <h2>Gaming Circles</h2>
                                {circles.map((x: any) => (
                                    <button
                                        className="circle-mini"
                                        key={x.id}
                                        onClick={() =>
                                            c.go("Gaming Circles", x.id)
                                        }
                                    >
                                        <Icon name="spark" />
                                        <span>
                                            <strong>{x.name}</strong>
                                            <small>
                                                {x.members.includes("you")
                                                    ? "A shared circle"
                                                    : x.members.length +
                                                      " members"}
                                            </small>
                                        </span>
                                        <Icon name="arrow" size={13} />
                                    </button>
                                ))}
                            </div>
                            <div className="side-card">
                                <h2>{own ? "Friends" : "Mutual friends"}</h2>
                                {socialPeople
                                    .filter(
                                        (x) => x.id !== p.id && x.id !== "you"
                                    )
                                    .map((x) => (
                                        <button
                                            className="circle-mini"
                                            onClick={() =>
                                                c.go("Profile", x.id)
                                            }
                                            key={x.id}
                                        >
                                            <Avatar id={x.id} size={30} />
                                            <span>
                                                <strong>{x.name}</strong>
                                                <small>{x.handle}</small>
                                            </span>
                                            <Icon name="arrow" size={13} />
                                        </button>
                                    ))}
                            </div>
                        </aside>
                    </div>
                </>
            )}
        </main>
    )
}
function GroupFinder({ circle }: { circle: any }) {
    const c = useSocial(),
        [prefs, setPrefs] = React.useState<Record<string, string>>({
            players: "4",
            platform: "PC",
            budget: "25",
            mode: "Cooperative",
            genre: "Any genre",
            mood: "Any mood",
        }),
        [generated, setGenerated] = React.useState(true)
    const maxPlayers = (g: any) =>
        g.id === 413150
            ? prefs.platform === "PC"
                ? 8
                : 4
            : g.id === 1172620
              ? 4
              : g.id === 972660
                ? 2
                : 1
    const found = c.games.filter(
        (g: any) =>
            maxPlayers(g) >= Number(prefs.players) &&
            Number(prefs.players) <= circle.members.length &&
            g.platform.includes(prefs.platform) &&
            g.price <= Number(prefs.budget) &&
            (prefs.mode === "Any style" ||
                (prefs.mode === "Cooperative" && g.players.includes("co-op")) ||
                (prefs.mode === "Competitive" &&
                    g.moods.includes("Competitive"))) &&
            (prefs.genre === "Any genre" ||
                g.genre.toLowerCase().includes(prefs.genre.toLowerCase())) &&
            (prefs.mood === "Any mood" || g.moods.includes(prefs.mood))
    )
    return (
        <section className="group-finder">
            <div className="kicker">Experience Finder / together</div>
            <h2>One game. Everyone included.</h2>
            <p className="social-muted">
                Find a shared world that fits your people, platforms, and
                pockets. Group size is checked against this circle’s current members.
            </p>
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    setGenerated(true)
                }}
            >
                <div className="group-fields">
                    {Object.entries({
                        players: ["2", "3", "4", "6", "8"],
                        platform: [
                            "PC",
                            "PlayStation",
                            "Xbox",
                            "Nintendo Switch",
                        ],
                        budget: ["10", "25", "50", "100"],
                        mode: ["Cooperative", "Competitive", "Any style"],
                        genre: [
                            "Any genre",
                            "Adventure",
                            "Life sim",
                            "Management",
                        ],
                        mood: [
                            "Any mood",
                            "Relaxing",
                            "Social",
                            "Exciting",
                            "Creative",
                        ],
                    }).map(([k, options]) => (
                        <label key={k}>
                            {
                                {
                                    players: "Group size",
                                    platform: "Shared platform",
                                    budget: "Budget per player",
                                    mode: "Play style",
                                    genre: "Genre",
                                    mood: "Mood",
                                }[k]
                            }
                            <select
                                value={prefs[k]}
                                onChange={(e) => {
                                    setPrefs({ ...prefs, [k]: e.target.value })
                                    setGenerated(false)
                                }}
                            >
                                {options.map((v) => (
                                    <option value={v} key={v}>
                                        {k === "budget"
                                            ? "Under $" + v
                                            : k === "players"
                                              ? v + " players"
                                              : v}
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
                        {found.length} group{" "}
                        {found.length === 1 ? "match" : "matches"} · Sample
                        base-game prices
                    </p>
                    {found.map((g: any) => {
                        const own = circle.members
                                .slice(0, Number(prefs.players))
                                .filter((id: string) =>
                                    socialPeople
                                        .find((p) => p.id === id)
                                        ?.owned.includes(g.id)
                                ),
                            buy = circle.members
                                .slice(0, Number(prefs.players))
                                .filter((id: string) => !own.includes(id))
                        return (
                            <article className="group-result" key={g.id}>
                                <SmallGame
                                    id={g.id}
                                    reason={
                                        "Supports " +
                                        prefs.players +
                                        " players on " +
                                        prefs.platform
                                    }
                                />
                                <p>
                                    {g.id === 972660
                                        ? "Local co-op only. Players share a screen; no online co-op."
                                        : g.id === 413150
                                          ? "A shared farm with flexible goals, creative play, and room to unwind."
                                          : "A four-person crew, shared adventures, and unpredictable stories."}
                                </p>
                                <div className="ownership">
                                    <span>
                                        <strong>Already own it</strong>
                                        {own.length
                                            ? own
                                                  .map(
                                                      (id: string) =>
                                                          socialPeople.find(
                                                              (p) => p.id === id
                                                          )?.name
                                                  )
                                                  .join(", ")
                                            : "Nobody yet"}
                                    </span>
                                    <span>
                                        <strong>Would need a copy</strong>
                                        {buy.length
                                            ? buy
                                                  .map(
                                                      (id: string) =>
                                                          socialPeople.find(
                                                              (p) => p.id === id
                                                          )?.name
                                                  )
                                                  .join(", ")
                                            : "Everyone is ready"}
                                    </span>
                                </div>
                                <p className="social-muted">
                                    {buy.length} copies × $ {g.price.toFixed(2)}{" "}
                                    = $ {(buy.length * g.price).toFixed(2)} for
                                    the selected circle members.
                                    Platform-specific ownership is simulated;
                                    confirm editions and cross-play before
                                    buying.
                                </p>
                                <div className="row-actions">
                                    <button
                                        className="primary"
                                        onClick={() =>
                                            c.shortlist(circle.id, g.id)
                                        }
                                    >
                                        {circle.wishlist.includes(g.id)
                                            ? "Remove from shared wishlist"
                                            : "Add to shared wishlist"}
                                    </button>
                                    <button
                                        className="text-button"
                                        onClick={() =>
                                            c.useFinder({
                                                Mood:
                                                    prefs.mood === "Any mood"
                                                        ? ""
                                                        : prefs.mood,
                                                Players:
                                                    prefs.mode === "Cooperative"
                                                        ? "Cooperative"
                                                        : "Online multiplayer",
                                                Platform: prefs.platform,
                                                Budget:
                                                    "Under $" + prefs.budget,
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
                            No exact match in this sample collection. Try four
                            players, PC, cooperative, and a budget under $25.
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
function CirclePage({ id }: { id: string }) {
    const c = useSocial(),
        circle = c.state.circles.find((x: any) => x.id === id),
        [tab, setTab] = React.useState(c.initialCircleTab || "Overview"),
        [draft, setDraft] = React.useState("")
    if (!circle)
        return (
            <main className="social-page">
                <header className="social-heading">
                    <div className="kicker">Small circles. Shared worlds.</div>
                    <h1>Find your kind of company.</h1>
                    <p>
                        A few good people can change the way you discover games.
                    </p>
                    <button
                        className="primary"
                        onClick={() => c.setDialog({ type: "createCircle" })}
                    >
                        Create a Gaming Circle
                    </button>
                </header>
                <div className="circle-directory">
                    {c.state.circles.map((x: any) => (
                        <article className="circle-card" key={x.id}>
                            <div className="circle-card-top">
                                <Icon name="spark" size={30} />
                                <span>{x.members.length} members</span>
                            </div>
                            <div className="kicker">{x.topic}</div>
                            <h2>{x.name}</h2>
                            <p>{x.desc}</p>
                            <div className="row-actions">
                                <button
                                    className="primary"
                                    onClick={() => c.go("Gaming Circles", x.id)}
                                >
                                    Explore circle
                                    <Icon name="arrow" size={15} />
                                </button>
                                <button
                                    className="text-button"
                                    onClick={() => c.join(x.id)}
                                >
                                    {x.joined ? "Leave circle" : "Join circle"}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </main>
        )
    const activity = c.activity.filter((a: any) => a.circle === id)
    return (
        <main className="social-page">
            <button
                className="text-button back-link"
                onClick={() => c.go("Gaming Circles")}
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
                            circle.joined ? setTab("Group Finder") : c.join(id)
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
                                c.setDialog({ type: "invite", circle: id })
                            }
                        >
                            Invite friends
                        </button>
                    )}
                </div>
            </header>
            <div className="social-tabs">
                {[
                    "Overview",
                    "Shared wishlist",
                    "Group Finder",
                    "Discussions",
                    "Members",
                ].map((t) => (
                    <button
                        key={t}
                        aria-pressed={tab === t}
                        onClick={() => setTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="community-layout">
                <div>
                    {tab === "Group Finder" ? (
                        <GroupFinder circle={circle} />
                    ) : tab === "Shared wishlist" ? (
                        <>
                            <div className="section-head">
                                <div>
                                    <h2>Our next possibilities</h2>
                                    <p>Saved together. Decided together.</p>
                                </div>
                                <button
                                    className="text-button"
                                    onClick={() =>
                                        c.setDialog({
                                            type: "circleGame",
                                            circle: id,
                                        })
                                    }
                                >
                                    Add a game
                                    <Icon name="arrow" size={14} />
                                </button>
                            </div>
                            {circle.wishlist.map((gid: number) => (
                                <div key={gid} className="shared-wishlist-row">
                                    <SmallGame id={gid} />
                                    <button
                                        className="text-button"
                                        onClick={() => c.shortlist(id, gid)}
                                    >
                                        Remove from circle
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
                            <h2>What should we play next?</h2>
                            <p className="social-muted">
                                A small conversation, not a noisy channel.
                            </p>
                            {(c.state.discussions[id] || []).map(
                                (m: any, i: number) => (
                                    <div className="comment" key={i}>
                                        <Avatar id={m.person} />
                                        <div>
                                            <PersonLink id={m.person} />
                                            <p>{m.text}</p>
                                            <button
                                                onClick={() =>
                                                    setDraft(
                                                        "@" +
                                                            (socialPeople.find(
                                                                (p) =>
                                                                    p.id ===
                                                                    m.person
                                                            )?.name || "Sarah Chen") +
                                                            " "
                                                    )
                                                }
                                            >
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                            <form
                                className="circle-compose"
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    if (!draft.trim()) return
                                    c.update((p: any) => ({
                                        ...p,
                                        discussions: {
                                            ...p.discussions,
                                            [id]: [
                                                ...(p.discussions[id] || []),
                                                {
                                                    person: "you",
                                                    text: draft.trim(),
                                                },
                                            ],
                                        },
                                    }))
                                    setDraft("")
                                }}
                            >
                                <label>
                                    Join the conversation
                                    <textarea
                                        required
                                        value={draft}
                                        onChange={(e) =>
                                            setDraft(e.target.value)
                                        }
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
                            {circle.members.map((pid: string) => (
                                <button
                                    className="member-card"
                                    onClick={() => c.go("Profile", pid)}
                                    key={pid}
                                >
                                    <Avatar id={pid} size={54} />
                                    <strong>
                                        {
                                            socialPeople.find(
                                                (p) => p.id === pid
                                            )?.name
                                        }
                                    </strong>
                                    <span>
                                        {
                                            socialPeople.find(
                                                (p) => p.id === pid
                                            )?.handle
                                        }
                                    </span>
                                    <span>Explore profile</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="section-head">
                                <div>
                                    <div className="kicker">
                                        In our shared world
                                    </div>
                                    <h2>A little circle activity</h2>
                                </div>
                            </div>
                            <div className="activity-feed">
                                {activity.map((a: any) => (
                                    <ActivityCard key={a.id} item={a} />
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
                        {circle.playing.map((gid: number) => (
                            <SmallGame
                                id={gid}
                                key={gid}
                                reason="A world your circle shares"
                            />
                        ))}
                        {!circle.playing.length && (
                            <p className="social-muted">
                                Find your first shared world with Group Finder.
                            </p>
                        )}
                    </div>
                    <div className="side-card">
                        <h2>The people in it</h2>
                        {circle.members.map((pid: string) => (
                            <button
                                className="circle-mini"
                                key={pid}
                                onClick={() => c.go("Profile", pid)}
                            >
                                <Avatar id={pid} size={30} />
                                <span>
                                    <strong>
                                        {
                                            socialPeople.find(
                                                (p) => p.id === pid
                                            )?.name
                                        }
                                    </strong>
                                    <small>View gaming identity</small>
                                </span>
                                <Icon name="arrow" size={13} />
                            </button>
                        ))}
                    </div>
                    <div className="side-card">
                        <h2>Shared recommendations</h2>
                        {circle.wishlist.slice(0, 2).map((gid: number) => (
                            <SmallGame id={gid} key={gid} />
                        ))}
                        <button
                            className="web-secondary full"
                            onClick={() =>
                                c.setDialog({ type: "circleGame", circle: id })
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
function SocialDialog() {
    const c = useSocial(),
        d = c.dialog,
        [text, setText] = React.useState(""),
        [game, setGame] = React.useState(String(d?.game || 413150)),
        [recipient, setRecipient] = React.useState(d?.recipient || "jamie"),
        [friend, setFriend] = React.useState("jamie"),
        [privacy, setPrivacy] = React.useState(c.state.privacy)
    const circle = c.state.circles.find((x: any) => x.id === d?.circle)
    const inviteSuggestions = d?.type === "invite" && circle
        ? buildInviteSuggestions(
              c.state.circles,
              c.people,
              circle.id,
              c.state.invites || []
          )
        : []
    React.useEffect(() => {
        if (d?.type === "invite" && inviteSuggestions.length) {
            const preferred = inviteSuggestions[0].personId
            if (!inviteSuggestions.some((entry) => entry.personId === friend)) {
                setFriend(preferred)
            }
        }
    }, [d?.type, inviteSuggestions, friend])
    const titles: any = {
        createCircle: "A little circle of your own.",
        recommend: "Pass a good game along.",
        invite: "Make room for a friend.",
        privacy: "Your space. Your boundaries.",
        circleGame: "Our next shared world.",
        shareWishlist: "A wishlist worth sharing.",
    }
    function submit(e: any) {
        e.preventDefault()
        if (d.type === "createCircle") {
            const id = "circle-" + Date.now()
            c.update((p: any) => ({
                ...p,
                circles: [
                    ...p.circles,
                    {
                        id,
                        name: text.trim(),
                        tag: "A shared world starts here.",
                        desc: "A new circle for your people and your next discoveries.",
                        members: ["you"],
                        wishlist: [],
                        playing: [],
                        topic: "Your interests · Your people",
                        joined: true,
                    },
                ],
            }))
            c.go("Gaming Circles", id)
            c.setMessage(
                "Your circle is ready. Invite a friend to get started."
            )
        }
        if (d.type === "invite") {
            if (circle?.members.includes(friend)) {
                c.setMessage("They’re already in this circle.")
                return
            }
            c.update((p: any) => ({
                ...p,
                invites: [
                    ...p.invites,
                    { id: "invite-" + Date.now(), circle: d.circle, person: friend, status: "pending" },
                ],
            }))
            c.setMessage(
                "Invitation saved as pending. No notification was sent, and your friend has not joined yet."
            )
        }
        if (d.type === "circleGame") {
            if (!circle?.joined) {
                c.setMessage("Join this Gaming Circle before adding a game.")
                return
            }
            if (!circle?.wishlist.includes(Number(game)))
                c.shortlist(d.circle, Number(game))
            c.setMessage("Added to the circle’s shared wishlist.")
        }
        if (d.type === "privacy") {
            c.update((p: any) => ({ ...p, privacy }))
            c.setMessage("Your privacy choices have been saved.")
        }
        if (d.type === "shareWishlist") {
            if (!c.saved.length) {
                c.setMessage("Save a game before sharing your wishlist.")
                return
            }
            const titles = c.saved
                .map(
                    (id: number) => c.games.find((g: any) => g.id === id)?.title
                )
                .filter(Boolean)
            c.update((p: any) => ({
                ...p,
                shares: [
                    ...p.shares,
                    {
                        id: "shared-" + Date.now(),
                        recipient,
                        games: [...c.saved],
                    },
                ],
                activity: [
                    {
                        id: "wishlist-" + Date.now(),
                        person: "you",
                        game: c.saved[0],
                        category: "Recommendations",
                        action:
                            "shared a wishlist with " +
                            (socialPeople.find((p) => p.id === recipient)
                                ?.name || "a circle"),
                        time: "Just now",
                        quote:
                            "A few worlds I’d like to explore together: " +
                            titles.join(", ") +
                            ".",
                        why: "A shared wishlist from you. Keep the conversation going.",
                        circle: recipient.startsWith("circle:")
                            ? recipient.slice(7)
                            : null,
                        likes: 0,
                    },
                    ...p.activity,
                ],
                circles: recipient.startsWith("circle:")
                    ? p.circles.map((x: any) =>
                          x.id === recipient.slice(7)
                              ? {
                                    ...x,
                                    wishlist: [
                                        ...new Set([...x.wishlist, ...c.saved]),
                                    ],
                                }
                              : x
                      )
                    : p.circles,
            }))
            c.setMessage("Your wishlist was shared within this prototype.")
        }
        if (d.type === "recommend") {
            const g = c.games.find((x: any) => x.id === Number(game))
            c.update((p: any) => ({
                ...p,
                sent: [...p.sent, { game: Number(game), recipient, text }],
                activity: [
                    {
                        id: "rec-" + Date.now(),
                        person: "you",
                        game: Number(game),
                        category: "Recommendations",
                        action:
                            "recommended a game to " +
                            (socialPeople.find((x) => x.id === recipient)
                                ?.name || "the circle"),
                        time: "Just now",
                        quote:
                            text.trim() ||
                            "I thought this could be your next favorite.",
                        why: "A personal recommendation from you.",
                        circle: recipient.startsWith("circle:")
                            ? recipient.slice(7)
                            : null,
                        likes: 0,
                    },
                    ...p.activity,
                ],
                circles: recipient.startsWith("circle:")
                    ? p.circles.map((x: any) =>
                          x.id === recipient.slice(7)
                              ? {
                                    ...x,
                                    wishlist: [
                                        ...new Set([
                                            ...x.wishlist,
                                            Number(game),
                                        ]),
                                    ],
                                }
                              : x
                      )
                    : p.circles,
            }))
            c.setMessage("Recommendation shared in this prototype.")
        }
        c.setDialog(null)
    }
    if (!d) return null

    return (
        <div className="veil" onClick={() => c.setDialog(null)}>
            <section
                className="modal social-modal"
                role="dialog"
                aria-modal="true"
                aria-label={titles[d.type]}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    if (e.key === "Escape") c.setDialog(null)
                }}
            >
                <div className="modal-head">
                    <h2>{titles[d.type]}</h2>
                    <button
                        className="icon-button"
                        autoFocus
                        aria-label="Close"
                        onClick={() => c.setDialog(null)}
                    >
                        <Icon name="close" />
                    </button>
                </div>
                <form onSubmit={submit}>
                    {d.type === "createCircle" ? (
                        <label>
                            Circle name
                            <input
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="The Sunday Evening Club"
                                required
                                maxLength={45}
                            />
                        </label>
                    ) : d.type === "privacy" ? (
                        <>
                            <p className="social-muted">
                                These choices govern how your profile is
                                presented to visitors in this local prototype.
                                They are not a server-side security boundary.
                            </p>
                            {["profile", "wishlist", "activity"].map((k) => (
                                <label key={k}>
                                    {k.charAt(0).toUpperCase() + k.slice(1)}{" "}
                                    visibility
                                    <select
                                        value={privacy[k]}
                                        onChange={(e) =>
                                            setPrivacy({
                                                ...privacy,
                                                [k]: e.target.value,
                                            })
                                        }
                                    >
                                        {[
                                            "Public",
                                            "Friends only",
                                            "Private",
                                        ].map((x) => (
                                            <option key={x}>{x}</option>
                                        ))}
                                    </select>
                                </label>
                            ))}
                        </>
                    ) : d.type === "invite" ? (
                        <>
                            <p className="social-muted">
                                Invite a sample friend to {circle?.name}.
                                This creates a pending sample invitation. It does not notify the friend or add them to the circle.
                            </p>
                            {circle && (
                                <div className="summary" style={{ marginBottom: 18 }}>
                                    <strong>Best fits</strong>
                                    {buildInviteSuggestions(
                                        c.state.circles,
                                        socialPeople,
                                        circle.id
                                    )
                                        .slice(0, 3)
                                        .map((entry) => (
                                            <span
                                                key={entry.personId}
                                                style={{
                                                    display: "block",
                                                    marginTop: 8,
                                                    color: "var(--text)",
                                                }}
                                            >
                                                {socialPeople.find(
                                                    (person) =>
                                                        person.id ===
                                                        entry.personId
                                                )?.name}: {entry.reason}
                                            </span>
                                        ))}
                                </div>
                            )}
                            <label>
                                Friend
                                <select
                                    value={friend}
                                    onChange={(e) => setFriend(e.target.value)}
                                >
                                    {socialPeople
                                        .filter(
                                            (p) =>
                                                p.id !== "you" &&
                                                !circle?.members.includes(p.id) &&
                                                !(c.state.invites || []).some(
                                                    (invite: any) =>
                                                        invite.circle ===
                                                            circle?.id &&
                                                        invite.person === p.id &&
                                                        invite.status === "pending"
                                                )
                                        )
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                </select>
                            </label>
                        </>
                    ) : (
                        <>
                            {d.type !== "shareWishlist" && (
                                <label>
                                    Game
                                    <select
                                        value={game}
                                        onChange={(e) =>
                                            setGame(e.target.value)
                                        }
                                    >
                                        {c.games.map((g: any) => (
                                            <option key={g.id} value={g.id}>
                                                {g.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            {["recommend", "shareWishlist"].includes(
                                d.type
                            ) && (
                                <>
                                    <label>
                                        Send to
                                        <select
                                            value={recipient}
                                            onChange={(e) =>
                                                setRecipient(e.target.value)
                                            }
                                        >
                                            {socialPeople
                                                .filter((p) => p.id !== "you")
                                                .map((p) => (
                                                    <option
                                                        key={p.id}
                                                        value={p.id}
                                                    >
                                                        {p.name}
                                                    </option>
                                                ))}
                                            {c.state.circles.map((x: any) => (
                                                <option
                                                    key={x.id}
                                                    value={"circle:" + x.id}
                                                >
                                                    {x.name} · Circle
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Why they might love it
                                        <textarea
                                            value={text}
                                            onChange={(e) =>
                                                setText(e.target.value)
                                            }
                                            placeholder="This made me think of you because…"
                                            maxLength={500}
                                        />
                                    </label>
                                </>
                            )}
                        </>
                    )}
                    <button className="primary" type="submit">
                        {d.type === "privacy"
                            ? "Save privacy choices"
                            : d.type === "createCircle"
                              ? "Create circle"
                              : d.type === "invite"
                                ? "Invite friend"
                                : d.type === "circleGame"
                                  ? "Add to shared wishlist"
                                  : d.type === "shareWishlist"
                                    ? "Share wishlist"
                                    : "Send recommendation"}
                        <Icon name="arrow" size={15} />
                    </button>
                </form>
            </section>
        </div>
    )
}
function WishlistSocial() {
    const c = useSocial()
    const highlighted = React.useMemo(
        () => 
            buildWishlistRecommendations(
                c.saved,
                socialPeople,
                c.games
            ).slice(0, 3),
        [c.saved, c.games]
    )
    return (
        <section className="wishlist-social">
            <div className="row-actions">
                <button
                    className="primary"
                    disabled={!c.saved.length}
                    onClick={() => c.setDialog({ type: "shareWishlist" })}
                >
                    Share your wishlist
                    <Icon name="arrow" size={14} />
                </button>
                <button
                    className="text-button"
                    onClick={() => {
                        c.go("Gaming Circles")
                    }}
                >
                    Your circles’ shared wishlists
                    <Icon name="arrow" size={14} />
                </button>
            </div>
            <p className="social-muted">
                Shared directly with a sample friend or circle. Nothing is sent
                outside this prototype.
            </p>
            {highlighted.length > 0 && (
                <div className="summary" style={{ marginBottom: 12 }}>
                    <strong>Next best saves</strong>
                    {highlighted.map((entry) => (
                        <div key={entry.game.id} style={{ marginTop: 8 }}>
                            <button
                                className="text-button"
                                onClick={() => c.openGame(entry.game.id)}
                            >
                                {entry.game.title}
                            </button>
                            <span className="social-muted"> · {entry.why}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="wishlist-overlap">
                {socialPeople
                    .filter(
                        (p) =>
                            p.id !== "you" &&
                            p.wishlist.some((id) => c.saved.includes(id))
                    )
                    .map((p) => (
                        <button
                            key={p.id}
                            onClick={() => c.go("Profile", p.id)}
                        >
                            <Avatar id={p.id} size={24} />
                            {p.name} shares{" "}
                            {
                                p.wishlist.filter((id) => c.saved.includes(id))
                                    .length
                            }{" "}
                            saved games
                        </button>
                    ))}
            </div>
        </section>
    )
}
function GameSocial({ id }: { id: number }) {
    const c = useSocial(),
        owners = socialPeople.filter(
            (p) => p.id !== "you" && p.owned.includes(id)
        ),
        wishers = socialPeople.filter(
            (p) => p.id !== "you" && p.wishlist.includes(id)
        ),
        recs = c.activity.filter((a: any) => a.game === id)
    return (
        <section className="game-social">
            <div className="kicker">Through your people</div>
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
                            c.openGame(null)
                            c.go("Profile", p.id)
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
                    onClick={() => c.setDialog({ type: "recommend", game: id })}
                >
                    Recommend to someone
                </button>
                <button
                    className="web-secondary"
                    onClick={() =>
                        c.setDialog({
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

type WebNode = {
    id: string
    name: string
    type: string
    x: number
    y: number
    game?: number
    initials?: string
    note?: string
    extra?: boolean
}
function SocialWeb({
    games,
    saved,
    toggle,
    openGame,
}: {
    games: GameRecord[]
    saved: number[]
    toggle: (id: number) => void
    openGame: (game: any) => void
}) {
    const community = useSocial()
    const [selected, setSelected] = React.useState("jamie"),
        [expanded, setExpanded] = React.useState<string[]>([]),
        [zoom, setZoom] = React.useState(1),
        [pan, setPan] = React.useState({ x: 0, y: 0 }),
        [filter, setFilter] = React.useState("All connections"),
        [search, setSearch] = React.useState(""),
        [focus, setFocus] = React.useState(false),
        [width, setWidth] = React.useState(800)
    const canvas = React.useRef<HTMLDivElement>(null),
        drag = React.useRef<any>(null)
    React.useEffect(() => {
        if (!canvas.current) return
        const obs = new ResizeObserver((e) => setWidth(e[0].contentRect.width))
        obs.observe(canvas.current)
        return () => obs.disconnect()
    }, [])
    const interestSlug = (value: string) =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
    const friends = socialPeople.filter((p) => p.id !== "you")
    const interestItems = Array.from(
        new Set(socialPeople.flatMap((person) => person.interests))
    )
    const interestNodeCount = Math.max(1, interestItems.length)
    const interestNodes = interestItems.map((interest, index) => {
        const angle = (Math.PI * 2 * index) / interestNodeCount
        const x =
            Math.cos(angle - Math.PI / 2) * 180 +
            (index % 2 === 0 ? -80 : 70)
        const y = Math.sin(angle - Math.PI / 2) * 150 + (index % 3 === 0 ? 80 : 0)
        return {
            id: interestSlug(interest),
            name: interest,
            type: index % 2 === 0 ? "Interest" : "Genre",
            x,
            y,
            note: `${interest} is a shared thread in your network.`,
        } as WebNode
    })
    const featuredGameIds = Array.from(
        new Set(
            socialPeople.flatMap((person) => [
                ...person.favorites,
                ...person.owned,
                ...person.playing,
                ...person.recent,
                ...person.wishlist,
            ])
        )
    )
        .filter((id) => games.some((game) => game.id === id))
        .slice(0, 10)
    const positions = [
        {
            id: "you",
            name: "You",
            type: "You",
            x: 0,
            y: 0,
            initials: "SC",
            note: "Your discovery thread. Follow what you like, what your friends love, and what your circles keep recommending.",
        },
        ...friends.map((person, index) => {
            const radius = 220
            const angle = (Math.PI * 2 * index) / Math.max(1, friends.length)
            return {
                id: person.id,
                name: person.name,
                type: "Friend",
                x: Math.cos(angle - Math.PI / 2) * radius,
                y: Math.sin(angle - Math.PI / 2) * radius,
                initials: person.initials,
                note: person.bio,
            } as WebNode
        }),
        ...interestNodes,
        ...featuredGameIds.map((gameId, index) => {
            const game = games.find((entry) => entry.id === gameId)!
            const radius = 280
            const angle = (Math.PI * 2 * index) / Math.max(1, featuredGameIds.length)
            return {
                id: String(gameId),
                name: game.title,
                type: "Game",
                x:
                    Math.cos(angle - Math.PI / 2) * radius +
                    (index % 2 === 0 ? 60 : -60),
                y:
                    Math.sin(angle - Math.PI / 2) * radius +
                    (index % 2 === 0 ? -40 : 30),
                game: gameId,
            } as WebNode
        }),
        ...community.state.circles.map((circle: any, index: number) => ({
            id: circle.id,
            name: circle.name,
            type: "Circle",
            x: -300 + (index % 3) * 260,
            y: 170 + Math.floor(index / 3) * 180,
            initials: circle.name
                .split(" ")
                .map((part: string) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
            note: circle.desc,
        })) as WebNode[],
    ] as WebNode[]
    const relationshipTypes = [
        ...friends.map((person) => ["you", person.id, "Friends"] as const),
        ...friends.flatMap((person) => [
            ...person.interests.map((interest) => [
                person.id,
                interestSlug(interest),
                "Enjoys",
            ] as const),
            ...person.favorites.slice(0, 2).map((gameId) => [
                person.id,
                String(gameId),
                "Favorite",
            ] as const),
            ...person.playing.slice(0, 2).map((gameId) => [
                person.id,
                String(gameId),
                "Currently playing",
            ] as const),
            ...person.wishlist.slice(0, 2).map((gameId) => [
                person.id,
                String(gameId),
                "Wishlist",
            ] as const),
        ]),
    ]
    const circleIds = community.state.circles.map((circle: any) => circle.id)
    const relationships = [
        ...relationshipTypes.filter(
            (edge) =>
                !circleIds.includes(edge[0] as string) &&
                !circleIds.includes(edge[1] as string)
        ),
        ...community.state.circles.flatMap((circle: any) => [
            ...circle.members
                .filter(
                    (member: string) =>
                        member === "you" ||
                        socialPeople.some((person) => person.id === member)
                )
                .map((member: string) => [member, circle.id, "Member"] as const),
            ...circle.wishlist
                .filter((gameId: number) => games.some((game) => game.id === gameId))
                .map(
                    (gameId: number) =>
                        [circle.id, String(gameId), "Shared wishlist"] as const
                ),
        ]),
    ]
    const extras: Record<string, string[]> = Object.fromEntries(
        positions.map((node) => [
            node.id,
            relationships
                .filter((edge) => edge[0] === node.id || edge[1] === node.id)
                .map((edge) => (edge[0] === node.id ? edge[1] : edge[0]))
                .filter((candidate) => candidate !== node.id)
                .filter((candidate) =>
                    positions.some((position) => position.id === candidate)
                ),
        ])
    )
    const revealed = new Set(expanded.flatMap((id) => extras[id] || []))
    const nodes = positions.filter((n) => !n.extra || revealed.has(n.id))
    const current = positions.find((n) => n.id === selected) || positions[0]
    const connected = relationships.filter(
        (e) => e[0] === selected || e[1] === selected
    )
    const connectedIds = new Set(connected.flatMap((e) => [e[0], e[1]]))
    const game = current.game ? games.find((g) => g.id === current.game) : null
    const visibleIds = new Set(nodes.map((n) => n.id))
    const friendsSummary = relationships
        .filter((e) => e[0] === selected || e[1] === selected)
        .map((e) =>
            positions.find((n) => n.id === (e[0] === selected ? e[1] : e[0]))
        )
        .filter((n) => n?.type === "Friend")
    function isDim(n: WebNode) {
        return (
            (filter !== "All connections" &&
                n.type !== filter &&
                n.type !== "You") ||
            (search && !n.name.toLowerCase().includes(search.toLowerCase())) ||
            (focus && !connectedIds.has(n.id))
        )
    }
    function selectNode(id: string) {
        setSelected(id)
        const n = positions.find((n) => n.id === id)
        if (n)
            setPan({
                x: -n.x * scale - (width < 380 ? 90 : 0),
                y: -n.y * scale,
            })
    }
    function reset() {
        setPan({ x: 0, y: 0 })
        setZoom(1)
        setFocus(false)
        setFilter("All connections")
        setSearch("")
    }
    function expand() {
        setExpanded((p) =>
            p.includes(selected)
                ? p.filter((x) => x !== selected)
                : [...p, selected]
        )
        if (!extras[selected]?.length) setFocus((v) => !v)
    }
    const baseScale =
        width < 380 ? 0.6 : Math.max(0.4, Math.min(0.82, (width - 70) / 850))
    const scale = zoom * baseScale
    const small = width < 500
    const centerX = width / 2 + (width < 380 ? 90 : 0),
        centerY = small ? 275 : 300
    const isExpanded = expanded.includes(selected)
    const lastFocused = React.useRef("jamie")
    React.useEffect(() => {
        if (
            community.activeView === "The Web" &&
            width > 100 &&
            community.webFocus !== lastFocused.current
        ) {
            selectNode(community.webFocus)
            lastFocused.current = community.webFocus
        }
    }, [community.webFocus, width, community.activeView])
    return (
        <main className="web-page">
            <header className="web-intro">
                <div>
                    <div className="kicker">Follow your curiosity</div>
                    <h1>A world of connections.</h1>
                    <p>
                        The games you love. The people who get you. See where
                        they lead.
                    </p>
                </div>
                <div className="web-live">
                    <span className="dot" /> YOUR CIRCLE · SAMPLE NETWORK
                </div>
            </header>
            <div className="web-toolbar">
                <div
                    className="web-filters"
                    role="group"
                    aria-label="Network category"
                >
                    {[
                        "All connections",
                        "Friend",
                        "Game",
                        "Genre",
                        "Interest",
                        "Circle",
                        "Recommendation",
                    ].map((f) => (
                        <button
                            key={f}
                            aria-pressed={filter === f}
                            onClick={() => setFilter(f)}
                        >
                            {f === "All connections" ? "Everything" : f + "s"}
                        </button>
                    ))}
                </div>
                <label className="web-search">
                    <Icon name="search" size={15} />
                    <input
                        value={search}
                        placeholder="Find a connection"
                        aria-label="Find a network connection"
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </label>
            </div>
            <div className="web-shell">
                <div className="web-network">
                    <div className="network-caption">
                        <span>YOUR PLAYSCAPE</span>
                        <span>
                            {nodes.length} nodes ·{" "}
                            {
                                relationships.filter(
                                    (e) =>
                                        visibleIds.has(e[0]) &&
                                        visibleIds.has(e[1])
                                ).length
                            }{" "}
                            connections
                        </span>
                    </div>
                    <div
                        ref={canvas}
                        className="graph-stage"
                        tabIndex={0}
                        role="region"
                        aria-label="Interactive discovery graph. Drag to pan. Use arrow keys to pan and plus or minus to zoom."
                        onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return
                            if (
                                [
                                    "ArrowLeft",
                                    "ArrowRight",
                                    "ArrowUp",
                                    "ArrowDown",
                                    "+",
                                    "-",
                                ].includes(e.key)
                            )
                                e.preventDefault()
                            if (e.key === "ArrowLeft")
                                setPan((p) => ({ ...p, x: p.x + 40 }))
                            if (e.key === "ArrowRight")
                                setPan((p) => ({ ...p, x: p.x - 40 }))
                            if (e.key === "ArrowUp")
                                setPan((p) => ({ ...p, y: p.y + 40 }))
                            if (e.key === "ArrowDown")
                                setPan((p) => ({ ...p, y: p.y - 40 }))
                            if (e.key === "+")
                                setZoom((z) => Math.min(2, z + 0.15))
                            if (e.key === "-")
                                setZoom((z) => Math.max(0.45, z - 0.15))
                        }}
                        onPointerDown={(e) => {
                            if ((e.target as Element).closest("[data-webnode]"))
                                return
                            drag.current = {
                                x: e.clientX,
                                y: e.clientY,
                                px: pan.x,
                                py: pan.y,
                            }
                            e.currentTarget.setPointerCapture(e.pointerId)
                        }}
                        onPointerMove={(e) => {
                            if (drag.current)
                                setPan({
                                    x:
                                        drag.current.px +
                                        e.clientX -
                                        drag.current.x,
                                    y:
                                        drag.current.py +
                                        e.clientY -
                                        drag.current.y,
                                })
                        }}
                        onPointerUp={() => {
                            drag.current = null
                        }}
                        onPointerCancel={() => {
                            drag.current = null
                        }}
                    >
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={"0 0 " + width + " 600"}
                            aria-label="Friends, games, and shared interests"
                        >
                            <defs>
                                {nodes
                                    .filter((n) => n.type === "Game")
                                    .map((n) => (
                                        <clipPath
                                            id={"webclip-" + n.id}
                                            key={n.id}
                                        >
                                            <rect
                                                x="-48"
                                                y="-30"
                                                width="96"
                                                height="60"
                                                rx="7"
                                            />
                                        </clipPath>
                                    ))}
                            </defs>
                            <g
                                transform={
                                    "translate(" +
                                    (centerX + pan.x) +
                                    "," +
                                    (centerY + pan.y) +
                                    ") scale(" +
                                    scale +
                                    ")"
                                }
                            >
                                <circle
                                    r="115"
                                    fill="none"
                                    stroke="var(--line)"
                                    strokeDasharray="2 9"
                                    opacity=".5"
                                />
                                <circle
                                    r="240"
                                    fill="none"
                                    stroke="var(--line)"
                                    strokeDasharray="2 9"
                                    opacity=".25"
                                />
                                {relationships
                                    .filter(
                                        (e) =>
                                            visibleIds.has(e[0]) &&
                                            visibleIds.has(e[1])
                                    )
                                    .map((e, i) => {
                                        const a = positions.find(
                                                (n) => n.id === e[0]
                                            )!,
                                            b = positions.find(
                                                (n) => n.id === e[1]
                                            )!
                                        const highlighted =
                                            e[0] === selected ||
                                            e[1] === selected
                                        return (
                                            <g
                                                key={i}
                                                opacity={
                                                    isDim(a) || isDim(b)
                                                        ? 0.12
                                                        : highlighted
                                                          ? 0.9
                                                          : 0.3
                                                }
                                            >
                                                <line
                                                    x1={a.x}
                                                    y1={a.y}
                                                    x2={b.x}
                                                    y2={b.y}
                                                    stroke={
                                                        highlighted
                                                            ? "var(--accent)"
                                                            : "var(--muted)"
                                                    }
                                                    strokeWidth={
                                                        highlighted ? 1.4 : 0.8
                                                    }
                                                    strokeDasharray={
                                                        a.type === "Interest" ||
                                                        b.type === "Interest"
                                                            ? "3 5"
                                                            : undefined
                                                    }
                                                />
                                                {highlighted && (
                                                    <text
                                                        x={(a.x + b.x) / 2}
                                                        y={(a.y + b.y) / 2 - 6}
                                                        fill="var(--accent)"
                                                        fontSize="8"
                                                        textAnchor="middle"
                                                        stroke="var(--bg)"
                                                        strokeWidth="4"
                                                        paintOrder="stroke"
                                                    >
                                                        {e[2]}
                                                    </text>
                                                )}
                                            </g>
                                        )
                                    })}
                                {nodes.map((n) => (
                                    <g
                                        data-webnode="true"
                                        key={n.id}
                                        className={
                                            "web-node " +
                                            (selected === n.id ? "active" : "")
                                        }
                                        transform={
                                            "translate(" + n.x + "," + n.y + ")"
                                        }
                                        role="button"
                                        tabIndex={0}
                                        aria-label={
                                            n.name +
                                            ", " +
                                            n.type +
                                            ", select to explore"
                                        }
                                        aria-pressed={selected === n.id}
                                        onClick={() => selectNode(n.id)}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                            ) {
                                                e.preventDefault()
                                                selectNode(n.id)
                                            }
                                        }}
                                        style={{
                                            cursor: "pointer",
                                            opacity: isDim(n) ? 0.22 : 1,
                                            outline: "none",
                                        }}
                                    >
                                        {n.type === "Game" ? (
                                            <>
                                                <rect
                                                    x="-53"
                                                    y="-35"
                                                    width="106"
                                                    height="70"
                                                    rx="10"
                                                    fill="var(--surface)"
                                                    stroke={
                                                        selected === n.id
                                                            ? "var(--accent)"
                                                            : "var(--line)"
                                                    }
                                                    strokeWidth={
                                                        selected === n.id
                                                            ? 2
                                                            : 1
                                                    }
                                                />
                                                <image
                                                    href={steam(n.game!)}
                                                    x="-48"
                                                    y="-30"
                                                    width="96"
                                                    height="60"
                                                    preserveAspectRatio="xMidYMid slice"
                                                    clipPath={
                                                        "url(#webclip-" +
                                                        n.id +
                                                        ")"
                                                    }
                                                />
                                            </>
                                        ) : ["Interest", "Genre"].includes(
                                              n.type
                                          ) ? (
                                            <>
                                                <rect
                                                    x="-53"
                                                    y="-19"
                                                    width="106"
                                                    height="38"
                                                    rx="19"
                                                    fill="var(--surface)"
                                                    stroke={
                                                        selected === n.id
                                                            ? "var(--accent)"
                                                            : "var(--line)"
                                                    }
                                                />
                                                <text
                                                    textAnchor="middle"
                                                    y="4"
                                                    fontSize="11"
                                                    fill="var(--text)"
                                                >
                                                    {n.name}
                                                </text>
                                            </>
                                        ) : n.type === "Circle" ? (
                                            <>
                                                <rect
                                                    x="-27"
                                                    y="-27"
                                                    width="54"
                                                    height="54"
                                                    rx="9"
                                                    transform="rotate(45)"
                                                    fill="var(--surface)"
                                                    stroke="var(--accent)"
                                                    strokeWidth="1.5"
                                                />
                                                <text
                                                    textAnchor="middle"
                                                    y="4"
                                                    fontSize="12"
                                                    fill="var(--text)"
                                                >
                                                    {n.initials}
                                                </text>
                                            </>
                                        ) : n.type === "Recommendation" ? (
                                            <>
                                                <path
                                                    d="M0 -24L27 0 0 24 -27 0Z"
                                                    fill="var(--accent)"
                                                    stroke="var(--line)"
                                                />
                                                <text
                                                    textAnchor="middle"
                                                    y="5"
                                                    fontSize="16"
                                                    fill="var(--ink)"
                                                >
                                                    R
                                                </text>
                                            </>
                                        ) : (
                                            <>
                                                <circle
                                                    r={
                                                        n.type === "You"
                                                            ? 39
                                                            : 29
                                                    }
                                                    fill={
                                                        n.type === "You"
                                                            ? "var(--accent)"
                                                            : "var(--surface)"
                                                    }
                                                    stroke={
                                                        selected === n.id
                                                            ? "var(--accent)"
                                                            : "var(--line)"
                                                    }
                                                    strokeWidth="2"
                                                />
                                                {selected === n.id && (
                                                    <circle
                                                        r="36"
                                                        fill="none"
                                                        stroke="var(--accent)"
                                                        strokeDasharray="3 4"
                                                        opacity=".7"
                                                    />
                                                )}
                                                <text
                                                    textAnchor="middle"
                                                    y="5"
                                                    fontSize={
                                                        n.type === "You"
                                                            ? 24
                                                            : 16
                                                    }
                                                    fill={
                                                        n.type === "You"
                                                            ? "var(--ink)"
                                                            : "var(--text)"
                                                    }
                                                    fontFamily="Inter"
                                                >
                                                    {n.initials}
                                                </text>
                                            </>
                                        )}
                                        {!["Interest", "Genre"].includes(
                                            n.type
                                        ) && (
                                            <text
                                                y={
                                                    n.type === "Game"
                                                        ? 51
                                                        : n.type === "You"
                                                          ? 58
                                                          : 47
                                                }
                                                textAnchor="middle"
                                                fill="var(--text)"
                                                fontSize="11"
                                                fontWeight={
                                                    selected === n.id
                                                        ? 600
                                                        : 400
                                                }
                                                stroke="var(--bg)"
                                                strokeWidth="4"
                                                paintOrder="stroke"
                                            >
                                                {n.name}
                                            </text>
                                        )}
                                        {n.type === "Friend" && (
                                            <circle
                                                cx="21"
                                                cy="19"
                                                r="4"
                                                fill="var(--accent)"
                                                stroke="var(--bg)"
                                                strokeWidth="2"
                                            />
                                        )}
                                    </g>
                                ))}
                            </g>
                        </svg>
                    </div>
                    <div className="network-bottom">
                        <div className="web-legend">
                            <span>
                                <i className="legend-friend" />
                                Friends
                            </span>
                            <span>
                                <i className="legend-game" />
                                Games
                            </span>
                            <span>
                                <i className="legend-interest" />
                                Interests
                            </span>
                        </div>
                        <div className="zoom-controls">
                            <button
                                aria-label="Zoom out"
                                onClick={() =>
                                    setZoom((z) => Math.max(0.45, z - 0.15))
                                }
                            >
                                −
                            </button>
                            <span>{Math.round(scale * 100)}%</span>
                            <button
                                aria-label="Zoom in"
                                onClick={() =>
                                    setZoom((z) => Math.min(2, z + 0.15))
                                }
                            >
                                +
                            </button>
                            <button
                                aria-label="Reset network view"
                                onClick={reset}
                            >
                                <Icon name="sliders" size={15} />
                            </button>
                        </div>
                    </div>
                    <p className="graph-help">
                        Drag to wander · Select a connection to discover more ·
                        Keyboard: arrows to pan, + / − to zoom
                    </p>
                </div>
                <aside className="web-inspector" aria-live="polite">
                    <div className="kicker">A closer connection</div>
                    {game ? (
                        <img
                            className="inspector-art"
                            src={steam(game.id)}
                            alt={game.title + " game artwork"}
                        />
                    ) : (
                        <div
                            className={
                                "inspector-symbol " +
                                (current.type === "Interest" ? "interest" : "")
                            }
                        >
                            {current.type === "Interest" ? (
                                <Icon name="spark" size={27} />
                            ) : (
                                current.initials || (
                                    <Icon
                                        name={
                                            current.type === "Circle"
                                                ? "user"
                                                : "spark"
                                        }
                                        size={25}
                                    />
                                )
                            )}
                        </div>
                    )}
                    <div className="inspector-type">
                        {current.type === "You"
                            ? "Your profile"
                            : current.type === "Friend"
                              ? "Friend · Sample profile"
                              : current.type}
                    </div>
                    <h2>{current.name}</h2>
                    <p>
                        {game
                            ? game.desc
                            : current.note ||
                              "Your circle starts here. Follow a friend, a favorite game, or a shared interest."}
                    </p>
                    {game ? (
                        <>
                            <div className="web-game-meta">
                                <span>{game.genre}</span>
                                <span>{game.players}</span>
                                <strong>
                                    $ {game.price.toFixed(2)}{" "}
                                    <small>USD · sample price</small>
                                </strong>
                            </div>
                            <div className="connection-reason">
                                <Icon name="spark" size={15} />
                                <span>
                                    {friends.length
                                        ? friends
                                              .map((f) => f!.name.split(" ")[0])
                                              .join(" and ") +
                                          " " +
                                          (friends.length > 1
                                              ? "have"
                                              : "has") +
                                          " a connection to this game."
                                        : "Connected through your shared gaming interests."}{" "}
                                    {game.id === 1055540
                                        ? "Jamie recommends this for its peaceful exploration."
                                        : game.id === 413150
                                          ? "Alex is currently playing. Your shared love of cozy worlds makes this a natural place to start."
                                          : game.id === 383870
                                            ? "Morgan owns this narrative exploration game."
                                            : "Follow its connections to see what you have in common."}
                                </span>
                            </div>
                            <button
                                className="primary full"
                                onClick={() => openGame(game)}
                            >
                                Explore game details
                                <Icon name="arrow" size={16} />
                            </button>
                            <button
                                className="web-secondary full"
                                onClick={() => toggle(game.id)}
                            >
                                <Icon
                                    name={
                                        saved.includes(game.id)
                                            ? "check"
                                            : "heart"
                                    }
                                    size={16}
                                />
                                {saved.includes(game.id)
                                    ? "Saved to your wishlist"
                                    : "Add to wishlist"}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="connection-reason">
                                <Icon name="spark" size={15} />
                                <span>
                                    {current.id === "jamie"
                                        ? "You both enjoy exploration and cozy worlds. Jamie’s pick: A Short Hike, a peaceful adventure under $10."
                                        : current.id === "alex"
                                          ? "You both enjoy cozy worlds. Try Stardew Valley together in co-op."
                                          : current.id === "morgan"
                                            ? "You share a love of memorable stories. Follow Morgan to Spiritfarer and Firewatch."
                                            : current.type === "Interest"
                                              ? "Follow the connected games to discover experiences built around this shared interest."
                                              : "Your friends’ tastes are a new way into games you might otherwise miss."}
                                </span>
                            </div>
                            <button className="primary full" onClick={expand}>
                                {isExpanded
                                    ? "Collapse extra connections"
                                    : "Expand connections"}
                                <Icon name="arrow" size={16} />
                            </button>
                        </>
                    )}

                    {current.type === "Friend" && (
                        <>
                            <button
                                className="primary full"
                                onClick={() =>
                                    community.go("Profile", current.id)
                                }
                            >
                                Explore player profile
                                <Icon name="arrow" size={14} />
                            </button>
                            <div className="web-profile-preview">
                                <span>
                                    {
                                        socialPeople.find(
                                            (p) => p.id === current.id
                                        )?.handle
                                    }
                                </span>
                                <strong>Currently playing</strong>
                                {socialPeople
                                    .find((p) => p.id === current.id)
                                    ?.playing.map((id) => (
                                        <button
                                            key={id}
                                            onClick={() =>
                                                openGame(
                                                    games.find(
                                                        (g) => g.id === id
                                                    )
                                                )
                                            }
                                        >
                                            {
                                                games.find((g) => g.id === id)
                                                    ?.title
                                            }
                                            <Icon name="arrow" size={12} />
                                        </button>
                                    ))}
                                <strong>Recently played</strong>
                                {socialPeople
                                    .find((p) => p.id === current.id)
                                    ?.recent.map((id) => (
                                        <button
                                            key={id}
                                            onClick={() =>
                                                openGame(
                                                    games.find(
                                                        (g) => g.id === id
                                                    )
                                                )
                                            }
                                        >
                                            {
                                                games.find((g) => g.id === id)
                                                    ?.title
                                            }
                                            <Icon name="arrow" size={12} />
                                        </button>
                                    ))}
                                <strong>Favorite games</strong>
                                {socialPeople
                                    .find((p) => p.id === current.id)
                                    ?.favorites.map((id) => (
                                        <button
                                            key={id}
                                            onClick={() =>
                                                openGame(
                                                    games.find(
                                                        (g) => g.id === id
                                                    )
                                                )
                                            }
                                        >
                                            {
                                                games.find((g) => g.id === id)
                                                    ?.title
                                            }
                                            <Icon name="arrow" size={12} />
                                        </button>
                                    ))}
                                <strong>Shared circles</strong>
                                {community.state.circles
                                    .filter(
                                        (c: any) =>
                                            c.members.includes(current.id) &&
                                            c.members.includes("you")
                                    )
                                    .map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() =>
                                                community.go(
                                                    "Gaming Circles",
                                                    c.id
                                                )
                                            }
                                        >
                                            {c.name}
                                            <Icon name="arrow" size={12} />
                                        </button>
                                    ))}
                            </div>
                        </>
                    )}
                    {current.type === "Circle" && (
                        <button
                            className="primary full"
                            onClick={() =>
                                community.go("Gaming Circles", current.id)
                            }
                        >
                            Open Gaming Circle
                            <Icon name="arrow" size={14} />
                        </button>
                    )}
                    {current.type === "Recommendation" && (
                        <button
                            className="primary full"
                            onClick={() =>
                                openGame(games.find((g) => g.id === 1055540))
                            }
                        >
                            Explore Jamie’s recommendation
                        </button>
                    )}
                    {game && (
                        <div className="web-ownership">
                            <strong>In your circle</strong>
                            <p>
                                Owned by{" "}
                                {socialPeople
                                    .filter(
                                        (p) =>
                                            p.id !== "you" &&
                                            p.owned.includes(game.id)
                                    )
                                    .map((p) => p.name.split(" ")[0])
                                    .join(", ") || "no friends yet"}
                            </p>
                            <p>
                                Wishlisted by{" "}
                                {socialPeople
                                    .filter(
                                        (p) =>
                                            p.id !== "you" &&
                                            p.wishlist.includes(game.id)
                                    )
                                    .map((p) => p.name.split(" ")[0])
                                    .join(", ") || "no friends yet"}
                            </p>
                            <button
                                onClick={() =>
                                    community.setDialog({
                                        type: "recommend",
                                        game: game.id,
                                    })
                                }
                            >
                                Recommend this game
                            </button>
                        </div>
                    )}
                    <button
                        className="web-secondary full"
                        onClick={() => {
                            setFocus(!focus)
                            if (!focus) selectNode(selected)
                        }}
                        aria-pressed={focus}
                    >
                        {focus
                            ? "Show the whole network"
                            : "Focus on this connection"}
                    </button>
                    <div className="related-list">
                        <div className="kicker">Follow the thread</div>
                        {connected.map((e, i) => {
                            const id = e[0] === selected ? e[1] : e[0],
                                n = positions.find((n) => n.id === id)!
                            if (n.extra && !revealed.has(n.id)) return null
                            return (
                                <button
                                    key={i}
                                    onClick={() => selectNode(n.id)}
                                >
                                    <span>
                                        <small>{n.type}</small>
                                        {n.name}
                                    </span>
                                    <Icon name="arrow" size={14} />
                                </button>
                            )
                        })}
                    </div>
                </aside>
            </div>
            <section className="web-recommendations">
                <div className="section-head">
                    <div>
                        <div className="kicker">The beautiful overlap</div>
                        <h2>Shared interests. New possibilities.</h2>
                        <p>
                            Real connections, simulated people. Recommendations
                            with a reason.
                        </p>
                    </div>
                </div>
                <div className="web-rec-grid">
                    {[
                        {
                            id: 1055540,
                            friend: "Jamie",
                            reason: "You both enjoy exploration. Jamie recommends this peaceful little adventure.",
                        },
                        {
                            id: 413150,
                            friend: "Alex",
                            reason: "A shared love of cozy worlds. Build something together in co-op.",
                        },
                        {
                            id: 383870,
                            friend: "Morgan",
                            reason: "You both love a great story. Follow Morgan into the Wyoming wilderness.",
                        },
                    ].map((r) => {
                        const g = games.find((g) => g.id === r.id)
                        if (!g) return null
                        return (
                            <article key={r.id} className="web-rec">
                                <button
                                    className="web-rec-image"
                                    onClick={() => openGame(g)}
                                >
                                    <img src={steam(g.id)} alt={g.title} />
                                </button>
                                <div>
                                    <div className="kicker">
                                        Through {r.friend}
                                    </div>
                                    <h3>{g.title}</h3>
                                    <p>{r.reason}</p>
                                    <button
                                        className="text-button"
                                        onClick={() => {
                                            setSelected(String(r.id))
                                            canvas.current?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                            })
                                            setPan({
                                                x:
                                                    -positions.find(
                                                        (n) =>
                                                            n.id ===
                                                            String(r.id)
                                                    )!.x * scale,
                                                y:
                                                    -positions.find(
                                                        (n) =>
                                                            n.id ===
                                                            String(r.id)
                                                    )!.y * scale,
                                            })
                                        }}
                                    >
                                        Trace the connection
                                        <Icon name="arrow" size={14} />
                                    </button>
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>
        </main>
    )
}

interface Props {
    style?: React.CSSProperties
    title?: string
    games?: GameRecord[]
    initialView?: string
    initialPlayer?: string
    initialCircle?: string
    initialCircleTab?: string
    colors?: Record<string, string>
}
function Icon({ name, size = 18 }: { name: string; size?: number }) {
    const paths: any = {
        search: (
            <>
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 5 5" />
            </>
        ),
        arrow: (
            <>
                <path d="M4 12h15M13 6l6 6-6 6" />
            </>
        ),
        heart: (
            <path d="M20 5c-3-3-7-1-8 1-2-3-6-4-8-1-5 5 2 10 8 15 6-5 13-10 8-15Z" />
        ),
        sun: (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
            </>
        ),
        leaf: (
            <>
                <path d="M20 3C7 1 0 12 7 18S22 14 20 3ZM5 21 16 8" />
            </>
        ),
        snow: (
            <>
                <path d="M12 2v20M3 7l18 10M3 17 21 7M9 3l3 3 3-3M9 21l3-3 3 3" />
            </>
        ),
        close: <path d="m6 6 12 12M6 18 18 6" />,
        sliders: (
            <>
                <path d="M4 7h16M4 17h16" />
                <circle cx="9" cy="7" r="3" />
                <circle cx="16" cy="17" r="3" />
            </>
        ),
        spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />,
        check: <path d="m5 12 4 4L19 6" />,
        menu: <path d="M4 6h16M4 12h16M4 18h16" />,
        play: <path d="m8 4 12 8-12 8Z" />,
        user: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
            </>
        ),
    }
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name] || paths.spark}
        </svg>
    )
}
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function Playscape({
    style,
    title = "What are you in the mood for?",
    games = gameCatalog,
    initialView = "Discover",
    initialPlayer = "Sarah Chen",
    initialCircle = "All circles",
    initialCircleTab = "Overview",
    colors = {},
}: Props) {
    const [atmos, setAtmos] = React.useState("Autumn"),
        [mood, setMood] = React.useState("Spring"),
        [prefs, setPrefs] = React.useState<any>({
            Mood: "",
            Playtime: "",
            Players: "",
            Budget: "",
            Platform: "",
            Difficulty: "",
        }),
        [active, setActive] = React.useState(false),
        [query, setQuery] = React.useState(""),
        [panel, setPanel] = React.useState(""),
        [detail, setDetail] = React.useState<number | null>(null),
        [saved, setSaved] = React.useState<number[]>([]),
        [compareIds, setCompareIds] = React.useState<number[]>([]),
        [auto, setAuto] = React.useState(false),
        [menu, setMenu] = React.useState(false),
        [notice, setNotice] = React.useState("")
    const [browseGenre, setBrowseGenre] = React.useState("")
    const [browsePlatform, setBrowsePlatform] = React.useState("")
    const [browseSort, setBrowseSort] = React.useState("featured")
    const [view, setView] = React.useState(initialView)
    const [profileId, setProfileId] = React.useState(
            socialPeople.find((p) => p.name === initialPlayer)?.id || "you"
        ),
        [circleId, setCircleId] = React.useState(
            initialCircles.find((c) => c.name === initialCircle)?.id || ""
        ),
        [socialDiscovery, setSocialDiscovery] = React.useState(false),
        [webFocus, setWebFocus] = React.useState("jamie")

    const routeNames: Record<string, string> = {
        discover: "Discover",
        browse: "Browse",
        wishlist: "Wishlist",
        "the-web": "The Web",
        community: "Community",
        circles: "Gaming Circles",
        profile: "Profile",
    }
    React.useEffect(() => {
        const sync = () => {
            const parts = window.location.hash.slice(1).split("/")
            if (parts[0]) {
                setView(routeNames[parts[0]] || initialView)
                if (parts[0] === "profile") setProfileId(parts[1] || "you")
                if (parts[0] === "circles") setCircleId(parts[1] || "")
                if (parts[0] === "the-web" && parts[1]) setWebFocus(parts[1])
            } else setView(initialView)
        }
        sync()
        window.addEventListener("hashchange", sync)
        return () => window.removeEventListener("hashchange", sync)
    }, [initialView])
    function changeView(v: string, id?: string) {
        setView(v)
        setPanel("")
        setMenu(false)
        if (v === "Profile") setProfileId(id || "you")
        if (v === "Gaming Circles") setCircleId(id || "")
        const routes: Record<string, string> = {
            Discover: "discover",
            Browse: "browse",
            Wishlist: "wishlist",
            "The Web": "the-web",
            Community: "community",
            "Gaming Circles": "circles",
            Profile: "profile",
        }
        if (typeof window !== "undefined")
            window.location.hash =
                (routes[v] || "discover") + (id ? "/" + id : "")
    }
    const isCurrent = (n: string) =>
        n === view ||
        (n === "Community" &&
            ["Gaming Circles", "Profile"].includes(view))

    const scrollMemory = React.useRef<Record<string, number>>({}),
        lastRoute = React.useRef("")
    React.useEffect(() => {
        const key =
            view +
            (view === "Profile"
                ? "/" + profileId
                : view === "Gaming Circles"
                  ? "/" + circleId
                  : "")
        if (lastRoute.current && key !== lastRoute.current)
            scrollMemory.current[lastRoute.current] = window.scrollY
        if (key !== lastRoute.current) {
            lastRoute.current = key
            window.scrollTo(0, scrollMemory.current[key] || 0)
        }
    }, [view, profileId, circleId])
    const resultRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        try {
            const s = JSON.parse(localStorage.getItem("playscape-v1") || "null")
            if (s) {
                setAtmos(s.atmos || "Autumn")
                setSaved(s.saved || [])
                setAuto(!!s.auto)
                if (s.auto) {
                    const m = new Date().getMonth()
                    setAtmos(
                        m >= 2 && m <= 4
                            ? "Spring"
                            : m >= 5 && m <= 7
                              ? "Summer"
                              : m >= 8 && m <= 10
                                ? "Autumn"
                                : "Winter"
                    )
                }
            }
        } catch {}
    }, [])
    function persist(a: string, s: number[], v: boolean) {
        try {
            localStorage.setItem(
                "playscape-v1",
                JSON.stringify({ atmos: a, saved: s, auto: v })
            )
        } catch {}
    }
    function changeAtmos(a: string) {
        setAtmos(a)
        setAuto(false)
        persist(a, saved, false)
    }
    function toggle(id: number) {
        const n = saved.includes(id)
            ? saved.filter((x) => x !== id)
            : [...saved, id]
        setSaved(n)
        persist(atmos, n, auto)
    }
    function toggleCompare(id: number) {
        setCompareIds((current) => {
            if (current.includes(id)) return current.filter((value) => value !== id)
            if (current.length >= 3) {
                setNotice("You can compare up to three games at a time.")
                return current
            }
            return [...current, id]
        })
    }
    function openGame(game: GameRecord | number | null | undefined) {
        const nextId = resolveGameRecord(game, data)?.id ?? null
        setDetail(nextId)
    }
    const data = games?.length ? games : gameCatalog
    const detailGame = detail === null ? null : resolveGameRecord(detail, data) ?? null
    const compareGames = getGamesByIds(compareIds, data)
    const compareSummary = React.useMemo(
        () => buildComparisonSummary(compareGames, data),
        [compareGames, data],
    )
    const wishlistSummary = React.useMemo(
        () => buildWishlistSummary(saved, socialPeople, data),
        [saved, data],
    )
    React.useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(() => setNotice(""), 2800)
        return () => window.clearTimeout(timer)
    }, [notice])
    const social = useCommunityState(
        data,
        saved,
        toggle,
        openGame,
        (v: string, id?: string) => {
            if (v === "The Web" && id) setWebFocus(id)
            changeView(v, id)
        },
        (p: any) => {
            setPrefs((old: any) => ({ ...old, ...p }))
            setSocialDiscovery(true)
            find()
        }
    )
    const selected = seasons.find((s) => s.name === mood)!
    const seasonalHighlights = {
        Summer: "Bright, social, and energizing",
        Spring: "Cozy, curious, and gentle",
        Autumn: "Thoughtful, atmospheric, and immersive",
        Winter: "Focused, challenging, and moody",
    } as const
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
    const matches = filterGames(
        {
            moods: active && prefs.Mood ? [prefs.Mood] : undefined,
            maxPrice: active ? budgetLimit : undefined,
            playerModes: active && prefs.Players ? [prefs.Players] : undefined,
            platforms: active && prefs.Platform ? [prefs.Platform] : undefined,
            difficulty: active && prefs.Difficulty ? [prefs.Difficulty] : undefined,
            ...((active ? sessionLimits : {}) as { minSessionMinutes?: number; maxSessionMinutes?: number }),
        },
        searchGames(query, data),
    )
        .sort((a, b) => {
            const score = (g: any) =>
                (g.season === mood ? 1 : 0) +
                (socialDiscovery
                    ? socialPeople.filter(
                          (p) => p.id !== "you" && p.recommends.includes(g.id)
                      ).length * 2
                    : 0)
            return score(b) - score(a)
        })
    const shown = active || query ? matches : matches.slice(0, 4)
    const browseGenres = Array.from(new Set(data.flatMap((game) => game.genres))).sort()
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
    function find() {
        changeView("Discover")
        setActive(true)
        setTimeout(
            () =>
                resultRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                }),
            50
        )
    }
    function choose(s: any) {
        setMood(s.name)
        setPrefs((p: any) => ({ ...p, Mood: s.mood }))
        find()
    }
    function nav(n: string) {
        if (["The Web", "Community", "Gaming Circles", "Profile", "Discover", "Browse", "Wishlist"].includes(n)) {
            changeView(n)
            return
        }
        setMenu(false)
        setPanel(n)
    }
    const card = (g: any) => (
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
                    <Icon name={saved.includes(g.id) ? "check" : "heart"} />
                </button>
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
                            (p) => p.id !== "you" && p.recommends.includes(g.id)
                        )
                        .map((p) => p.name.split(" ")[0])
                        .join(" & ")
                        ? "Recommended by " +
                          socialPeople
                              .filter(
                                  (p) =>
                                      p.id !== "you" &&
                                      p.recommends.includes(g.id)
                              )
                              .map((p) => p.name.split(" ")[0])
                              .join(" & ")
                        : socialPeople.filter(
                              (p) => p.id !== "you" && p.owned.includes(g.id)
                          ).length + " friends own this"}
                </div>
                <div className="game-meta">
                    <span>{g.players}</span>
                    <span>{g.platform.split(" ").join(" · ")}</span>
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
    return (
        <CommunityContext.Provider
            value={{ ...social, initialCircleTab, webFocus, activeView: view }}
        >
            <div
                className={"ps " + atmos.toLowerCase()}
                style={
                    {
                        ...style,
                        ...Object.fromEntries(
                            Object.entries(colors).map(([key, value]) => [
                                "--ps-" + key,
                                value,
                            ])
                        ),
                    } as React.CSSProperties
                }
            >
                <style>{`
 @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
 .ps{--bg:#111a17;--surface:#1a2420;--text:#f2f0e7;--muted:#aab5aa;--line:#34413a;--accent:#d6e7b8;--ink:#18231b;--radius:10px;--heading:'Cormorant Garamond',Georgia,serif;color:var(--text);background:var(--bg);font-family:Inter,sans-serif;font-size:14px;line-height:1.5;width:100%;min-height:100vh;transition:background .4s,color .4s;overflow:hidden}
 .ps *{box-sizing:border-box}.ps button,.ps input,.ps select{font:inherit}.ps button{cursor:pointer}.ps button,.ps a,.ps input,.ps select{outline-offset:5px}.ps :focus-visible{outline:2px solid var(--accent)}.ps button{color:inherit}.ps button{border:0;background:none}.ps h1,.ps h2,.ps h3,.ps p{margin:0}.ps svg{flex-shrink:0}.ps a{color:inherit}.ps .wrap{width:100%;max-width:1440px;margin:auto;padding:0 52px}
 .ps.summer{--bg:#fff7e8;--surface:#ffedcf;--text:#292219;--muted:#665b48;--line:#ddc9a8;--accent:#ed653e;--ink:#fff;--radius:22px;--heading:Syne,sans-serif;background-image:radial-gradient(#d7bda8 0.7px,transparent 0.7px);background-size:16px 16px}
 .ps.spring{--bg:#f2f5e9;--surface:#e8efdd;--text:#243f34;--muted:#5a6e5a;--line:#cbd7bf;--accent:#3e674a;--ink:#fff;--radius:24px;--heading:'Cormorant Garamond',Georgia,serif;background-image:radial-gradient(ellipse at 0% 20%,#dce7ce,transparent 55%)}
 .ps.winter{--bg:#101821;--surface:#192530;--text:#e8f0f6;--muted:#a8bccb;--line:#354653;--accent:#bdd9ed;--ink:#142430;--radius:2px;--heading:Inter,sans-serif;background-image:linear-gradient(110deg,#101821,#172431)}
 .ps.autumn{background-image:repeating-linear-gradient(35deg,transparent,transparent 4px,#ffffff02 4px,#ffffff02 5px)}
 .ps .nav{height:88px;display:flex;align-items:center;gap:32px;border-bottom:1px solid var(--line)}.ps .brand{display:flex;gap:9px;align-items:center;font:800 23px Syne,sans-serif;letter-spacing:-1px;padding:0;white-space:nowrap}.ps .brand-mark{width:27px;height:28px;border:2px solid var(--accent);border-radius:50% 50% 25% 50%;transform:rotate(-25deg);position:relative}.ps .brand-mark:after{content:'';position:absolute;inset:6px;border:2px solid var(--accent);border-radius:50%}
 .ps .navlinks{display:flex;align-self:stretch;gap:25px;align-items:stretch}.ps .navlinks button{font-size:13px;white-space:nowrap;color:var(--muted);padding:0;position:relative}.ps .navlinks button.current{color:var(--text)}.ps .navlinks .current:after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent)}.ps .navtools{margin-left:auto;display:flex;align-items:center;gap:16px}.ps .search{display:flex;align-items:center;gap:9px;color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:9px 11px;width:180px}.ps .search input{background:none;border:0;color:var(--text);width:100%;min-width:0;font-size:12px;outline:none}.ps .search input::placeholder{color:var(--muted)}.ps .avatar{background:#b8c8a3;color:#20352a;border:3px solid #526b51;width:34px;height:34px;border-radius:50%;font-weight:600}.ps .mobile-menu{display:none}
 .ps .atmosbar{display:flex;justify-content:space-between;align-items:center;padding-top:24px;font-size:11px;letter-spacing:.03em;color:var(--muted)}.ps .online{display:flex;align-items:center;gap:7px}.ps .dot{background:#b7d591;width:5px;height:5px;border-radius:50%}.ps .theme-trigger{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:40px;padding:7px 13px;color:var(--text);font-size:11px;transition:transform .2s,border-color .2s,box-shadow .2s}.ps .theme-trigger:hover{transform:translateY(-1px);border-color:var(--accent);box-shadow:0 0 0 1px rgba(214,231,184,.25)}.ps .theme-trigger span{color:var(--muted)}.ps .theme-trigger strong{font-size:11px;font-weight:600;color:var(--text)}.ps .theme-trigger small{color:var(--muted);font-size:9px;white-space:nowrap}.ps .theme-trigger strong+small{margin-left:-2px}.ps .theme-trigger svg:last-child{color:var(--muted)}
 .ps .intro{text-align:center;padding:42px 0 32px}.ps .eyebrow{font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:var(--accent);font-weight:500;display:flex;gap:8px;justify-content:center;align-items:center}.ps h1{font-family:var(--heading);font-size:66px;font-weight:500;letter-spacing:-2px;line-height:1.12;margin:13px 0 14px}.ps .intro>p{font-size:14px;color:var(--muted)}
 .ps .season-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:3px}.ps .season{height:265px;position:relative;border-radius:var(--radius);overflow:hidden;text-align:left;padding:23px 20px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;isolation:isolate;transition:transform .25s;outline:1px solid #ffffff18;outline-offset:0;background:#24352e}.ps .season:hover{transform:translateY(-4px)}.ps .season.selected{outline:2px solid var(--accent);outline-offset:4px}.ps .season>img{position:absolute;inset:0;height:100%;width:100%;object-fit:cover;z-index:-2;filter:saturate(.65);transform:scale(1.02)}.ps .season:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#10231b0a,#101b1666 35%,#0c1614f2);z-index:-1}.ps .season-top{position:absolute;top:19px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:center}.ps .season-top>span{border:1px solid #ffffff80;padding:4px 8px;border-radius:20px;font-size:9px;letter-spacing:1px;background:#17281c66}.ps .season h2{font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;line-height:1.15;font-weight:500;margin-bottom:5px}.ps .season .line{font-size:12px;margin-bottom:10px}.ps .season .tags{font-size:9px;color:#d7dfd5}.ps .season-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:15px;padding-top:11px;border-top:1px solid #ffffff38;font-size:10px}.ps .season-bottom span{display:flex;gap:7px;align-items:center}
 .ps .mood-note{display:flex;justify-content:center;align-items:center;gap:6px;margin:20px 0 30px;font-size:11px;color:var(--muted)}.ps .mood-note button{text-decoration:underline;text-underline-offset:3px;padding:0;font-size:11px;color:var(--text)}
 .ps .finder{border:1px solid var(--line);border-radius:var(--radius);padding:25px 26px;background:var(--surface);position:relative}.ps .finder-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.ps .finder-head h2{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:500}.ps .finder-head p{font-size:11px;color:var(--muted)}.ps .finder-fields{display:grid;grid-template-columns:repeat(4,1fr) 1.15fr;gap:12px;align-items:end}.ps label{display:flex;flex-direction:column;gap:7px;font-size:10px;color:var(--muted)}.ps select{width:100%;min-width:0;border:1px solid var(--line);padding:12px 10px;background:var(--bg);color:var(--text);border-radius:5px;height:44px;font-size:11px}.ps .primary{display:inline-flex;align-items:center;justify-content:center;gap:12px;background:var(--accent);color:var(--ink);border-radius:5px;padding:13px 19px;font-size:12px;font-weight:600;min-height:44px}.ps .advanced{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted);margin-top:15px;padding:0}.ps .advanced-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px;max-width:550px}.ps .finder-foot{display:flex;justify-content:space-between}.ps .reset{font-size:10px;color:var(--muted);padding-top:14px}
 .ps .section{padding-top:48px}.ps .section-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:21px}.ps .kicker{text-transform:uppercase;font-size:9px;letter-spacing:1.7px;color:var(--muted);margin-bottom:6px}.ps .section-head h2{font:500 32px/1.2 var(--heading);letter-spacing:-.4px}.ps .section-head p{font-size:11px;color:var(--muted);margin-top:7px}.ps .text-button{display:flex;align-items:center;gap:8px;font-size:11px;padding:0 0 3px}.ps .games{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:19px}.ps .game{min-width:0}.ps .game-art{position:relative;border-radius:var(--radius);overflow:hidden;aspect-ratio:1.92;background:var(--surface)}.ps .art-button{padding:0;display:block;width:100%;height:100%}.ps .game-art img{width:100%;height:100%;object-fit:cover;transition:transform .4s}.ps .game-art:hover img{transform:scale(1.05)}.ps .save{position:absolute;right:9px;top:9px;background:#13211cc9;backdrop-filter:blur(5px);border:1px solid #ffffff44;border-radius:50%;width:30px;height:30px;display:grid;place-items:center;color:#fff}.ps .save.saved{background:var(--accent);color:var(--ink)}.ps .explore{position:absolute;bottom:0;left:0;right:0;padding:8px;display:flex;justify-content:center;align-items:center;gap:8px;background:#101b16db;color:#fff;opacity:0;transition:opacity .2s;font-size:11px}.ps .art-button:hover .explore,.ps .art-button:focus-visible .explore{opacity:1}.ps .game-info{padding:14px 1px 0}.ps .game-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;font-weight:500}.ps .game-title button{padding:0;text-align:left;font-weight:600;font-size:13px}.ps .game-title>span{font-size:11px;white-space:nowrap}.ps .game-info>p{font-size:10px;color:var(--muted);margin-top:5px}.ps .game-meta{display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin:12px 0}.ps .why{display:flex;align-items:start;gap:6px;border-top:1px solid var(--line);padding-top:10px;font-size:9px;color:var(--accent);line-height:1.6}
 .ps .editorial{margin-top:43px;min-height:240px;border-radius:var(--radius);overflow:hidden;position:relative;padding:34px 39px;background:#243c30;color:#fff;display:flex;align-items:center;isolation:isolate}.ps .editorial:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#14281ef5 3%,#14281edb 37%,#14281e05 100%),url('https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=1800&q=85') center 60%/cover;z-index:-1}.ps .editorial h2{font:500 39px/1.1 'Cormorant Garamond',Georgia,serif;margin:11px 0}.ps .editorial p{font-size:11px;color:#d2ddce;max-width:330px}.ps .editorial button{margin-top:21px;font-size:11px;border-bottom:1px solid #d2ddce;padding:0 0 5px;display:flex;align-items:center;gap:18px}.ps .editorial .kicker{color:#d7e9bf}
 .ps .bottom{padding:38px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);gap:20px}.ps .bottom h2{font:500 26px var(--heading)}.ps .bottom p{font-size:11px;color:var(--muted);margin-top:4px}.ps .people{display:flex;align-items:center;gap:11px}.ps .faces{display:flex;padding-left:8px}.ps .faces span{width:32px;height:32px;border-radius:50%;border:2px solid var(--bg);margin-left:-8px;display:grid;place-items:center;font-size:10px;color:#1e3428;background:#b4c6a4}.ps .faces span:nth-child(2){background:#dcc9b6}.ps .faces span:nth-child(3){background:#b4c2d6}.ps footer{display:flex;justify-content:space-between;align-items:center;padding:28px 0 32px;color:var(--muted);font-size:10px}.ps footer .brand{font-size:17px;color:var(--text)}
 .ps .veil{position:fixed;inset:0;z-index:100;background:#0009;backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:24px}.ps .modal{background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:var(--radius);padding:30px;width:760px;max-width:100%;max-height:86vh;overflow:auto;box-shadow:0 20px 100px #0007}.ps .modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:15px}.ps .modal-head h2{font:500 32px var(--heading)}.ps .icon-button{width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%}.ps .modal>p{color:var(--muted);font-size:13px;margin-bottom:20px}.ps .theme-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ps .theme-choice{padding:23px;border:1px solid var(--line);border-radius:10px;text-align:left;min-height:130px;background:var(--surface);display:flex;flex-direction:column;align-items:start;gap:9px}.ps .theme-choice strong{font-size:22px}.ps .theme-choice small{font-size:11px}.ps .theme-choice.summer{background:#ffdf9e;color:#553219;border-radius:24px 7px 24px 7px;font-family:Syne}.ps .theme-choice.spring{background:#dde9ce;color:#2a4931;border-radius:35px 35px 12px 35px;font-family:'Cormorant Garamond'}.ps .theme-choice.autumn{background:#293e30;color:#efe7d1;border:1px double #bda77b;font-family:'Cormorant Garamond'}.ps .theme-choice.winter{background:linear-gradient(120deg,#20323d,#14212a);color:#d9e8f1;border-radius:0;font-family:Inter}.ps .theme-choice[aria-pressed=true]{outline:2px solid var(--accent);outline-offset:3px}.ps .setting{display:flex;align-items:center;justify-content:space-between;margin-top:25px;padding-top:20px;border-top:1px solid var(--line);font-size:12px}.ps .setting input{accent-color:var(--accent);width:18px;height:18px}.ps .detail-img{width:100%;border-radius:var(--radius);margin-bottom:20px}.ps .detail-meta{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:19px}.ps .pill{border:1px solid var(--line);padding:6px 10px;border-radius:30px;font-size:10px;color:var(--muted)}.ps .detail-actions{display:flex;gap:15px;margin-top:22px;align-items:center}.ps .empty{padding:35px;border:1px solid var(--line);border-radius:var(--radius);text-align:center;grid-column:1/-1;color:var(--muted)}.ps .modal .games{grid-template-columns:1fr 1fr}.ps .summary{padding:17px;background:var(--surface);border:1px solid var(--line);font-size:12px;color:var(--muted);border-radius:var(--radius);margin-top:20px}.ps .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--accent);color:var(--ink);padding:13px 20px;z-index:120;border-radius:8px}
 .ps.summer h1{font-size:55px;font-weight:700;letter-spacing:-2.7px}.ps.summer .season{border-radius:24px 6px 24px 6px;box-shadow:4px 5px 0 #dfb989}.ps.summer .primary{border-radius:30px;box-shadow:3px 3px 0 #b83f20}.ps.summer .finder{border:2px solid var(--text);box-shadow:5px 5px 0 #e8c797}.ps.spring h1{font-size:72px}.ps.spring .season:nth-child(odd){border-radius:70px 70px 20px 20px}.ps.spring .finder{border-radius:28px 8px 28px 8px}.ps.spring .primary{border-radius:30px}.ps.autumn .finder{border-top:3px double #687356}.ps.autumn .season h2{font-style:italic}.ps.winter .intro{padding:55px 0 40px}.ps.winter h1{font-size:47px;letter-spacing:-2px;font-weight:400}.ps.winter .season{filter:saturate(.55)}.ps.winter .finder{background:linear-gradient(125deg,#ffffff0c,#ffffff02);backdrop-filter:blur(12px)}.ps.winter .primary{border-radius:0}.ps.winter .section-head h2{font-size:26px}
 @media(min-width:1450px){.ps .wrap{padding:0 70px}.ps .season{height:300px}.ps .intro{padding-top:55px}}
 @media(max-width:1100px){.ps .wrap{padding:0 32px}.ps .nav{gap:24px}.ps .navlinks{gap:19px}.ps .navlinks button{font-size:11px}.ps .search{width:140px}.ps .brand{font-size:21px}.ps .navtools{gap:10px}.ps .finder-fields{grid-template-columns:repeat(4,1fr)}.ps .finder-fields .primary{grid-column:1/-1}.ps .season{padding:18px 15px;height:245px}.ps .season-top{left:15px;right:15px}.ps .season .tags{font-size:8px}.ps .games{gap:14px}.ps .game-meta{font-size:8px}.ps .game-meta span:last-child{display:none}}
 @media(max-width:800px){.ps .navlinks{display:none}.ps .nav{height:74px}.ps .mobile-menu{display:block;padding:3px}.ps .mobile-links{display:flex;gap:16px;flex-wrap:wrap;padding:20px 0;border-bottom:1px solid var(--line)}.ps h1{font-size:56px}.ps .season-grid{grid-template-columns:1fr 1fr;gap:17px}.ps .season{height:230px}.ps .games{grid-template-columns:1fr 1fr;gap:27px 19px}.ps .intro{padding-top:35px}.ps .finder-head{gap:20px}.ps .finder-head p{max-width:180px;text-align:right}.ps.summer h1{font-size:43px}.ps.winter h1{font-size:40px}.ps .bottom h2{font-size:23px}}
 @media(max-width:500px){.ps .wrap{padding:0 21px}.ps .nav{gap:16px}.ps .brand{font-size:20px}.ps .brand-mark{width:22px;height:24px}.ps .search{width:35px;padding:6px;border:0}.ps .search input{position:absolute;width:1px;opacity:0}.ps .search:focus-within{position:absolute;left:21px;right:21px;width:auto;background:var(--surface);padding:12px;z-index:10}.ps .search:focus-within input{position:relative;width:100%;opacity:1}.ps .navtools{gap:10px}.ps .atmosbar{padding-top:19px}.ps .online{font-size:9px}.ps .theme-trigger{font-size:9px;padding:6px 9px}.ps .theme-trigger span{display:none}.ps .intro{padding:35px 0 28px}.ps h1{font-size:47px;letter-spacing:-1.3px;max-width:350px;margin:13px auto}.ps .intro>p{font-size:12px;max-width:270px;margin:auto;line-height:1.7}.ps .eyebrow{font-size:8px;letter-spacing:1.8px}.ps .season-grid{gap:14px}.ps .season{height:226px;padding:17px 13px}.ps .season-top{top:15px;left:13px;right:13px}.ps .season-top>span{font-size:7px;padding:4px 6px}.ps .season h2{font-size:30px}.ps .season .line{font-size:10px;line-height:1.5;max-width:120px}.ps .season .tags{font-size:8px;line-height:1.6;min-height:25px}.ps .season-bottom{font-size:9px;margin-top:11px}.ps .season-bottom svg{width:14px}.ps .mood-note{font-size:9px;flex-wrap:wrap;gap:4px;margin:20px 0 24px}.ps .mood-note button{font-size:9px}.ps .finder{padding:21px 17px}.ps .finder-head{display:block;margin-bottom:19px}.ps .finder-head h2{font-size:16px}.ps .finder-head p{max-width:none;text-align:left;font-size:10px;margin:7px 0 0 28px}.ps .finder-fields{grid-template-columns:1fr 1fr;gap:14px 11px}.ps select{font-size:11px}.ps .finder-foot{gap:8px}.ps .advanced{font-size:9px}.ps .section{padding-top:36px}.ps .section-head{gap:14px}.ps .section-head h2{font-size:28px}.ps .section-head p{font-size:10px}.ps .text-button{font-size:10px;white-space:nowrap}.ps .games{gap:24px 14px}.ps .game-title{display:block}.ps .game-title button{font-size:12px}.ps .game-title>span{display:block;margin-top:5px}.ps .game-art{aspect-ratio:1.35}.ps .game-info{padding-top:11px}.ps .game-info>p{font-size:9px}.ps .game-meta{margin:9px 0}.ps .why{font-size:8px;gap:4px}.ps .why svg{width:11px}.ps .save{width:27px;height:27px;top:6px;right:6px}.ps .editorial{padding:29px 23px;min-height:250px;margin-top:31px}.ps .editorial h2{font-size:34px}.ps .editorial p{max-width:220px;font-size:10px}.ps .bottom{display:block;padding:27px 0}.ps .people{margin-top:19px}.ps footer{gap:20px;font-size:8px}.ps footer .brand{font-size:15px}.ps .veil{padding:13px}.ps .modal{padding:21px}.ps .modal-head h2{font-size:28px}.ps .theme-choice{padding:17px;min-height:140px}.ps .theme-choice strong{font-size:20px}.ps .theme-choice small{font-size:10px}.ps.summer h1{font-size:37px}.ps.spring h1{font-size:52px}.ps.winter h1{font-size:36px;line-height:1.2}.ps.winter .intro{padding:40px 0 30px}.ps .explore{display:none}}
 @media(prefers-reduced-motion:reduce){.ps,.ps *{transition:none!important;scroll-behavior:auto!important}}
 /* ===== Clean & professional pass ===== */
 .ps{overflow-x:clip;overflow-y:visible;font-size:15px;line-height:1.6}
 .ps:is(.summer,.spring,.autumn,.winter){--radius:14px;--heading:Inter,system-ui,sans-serif;background-image:none}
 .ps .wrap{max-width:1200px}
 .ps .nav{position:sticky;top:0;z-index:50;height:72px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(14px)}
 .ps .navlinks button{font-size:14px;font-weight:500}
 .ps .navlinks button:hover{color:var(--text)}
 .ps .search{width:220px;border-radius:10px}
 .ps .nav-theme{width:36px;height:36px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;color:var(--muted)}
 .ps .nav-theme:hover{color:var(--accent);border-color:var(--accent)}
 .ps:is(.summer,.spring,.autumn,.winter) :is(.season,.finder,.activity-card,.circle-card,.profile-cover,.circle-cover,.web-shell,.web-rec,.side-card,.group-finder,.circle-discussion,.member-card,.web-filters){border:1px solid var(--line);border-radius:var(--radius);box-shadow:none;backdrop-filter:none}
 .ps:is(.summer,.spring,.autumn,.winter) :is(.finder,.activity-card,.profile-cover,.circle-cover){background:var(--surface)}
 .ps:is(.summer,.spring,.autumn,.winter) .primary{border-radius:10px;box-shadow:none}
 .ps .primary{font-size:14px;font-weight:600;min-height:44px;padding:12px 20px;transition:filter .15s,transform .15s}
 .ps .primary:hover{filter:brightness(1.07);transform:translateY(-1px)}
 .ps .web-secondary{border-radius:10px;font-size:14px}
 .ps:is(.summer,.spring,.autumn,.winter) :is(.intro h1,.social-heading h1,.web-intro h1,.circle-cover h1,.profile-cover h1){font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:clamp(34px,5vw,56px);letter-spacing:-.03em;line-height:1.1}
 .ps :is(.section-head h2,.side-card h2,.profile-section h2,.group-finder h2,.circle-discussion h2,.game-social h2,.web-inspector h2){font-family:Inter,system-ui,sans-serif;font-weight:600;letter-spacing:-.02em}
 .ps .section-head h2{font-size:28px}
 .ps .intro>p,.ps .social-heading>p{font-size:16px}
 .ps:is(.summer,.spring,.autumn,.winter) .activity-card blockquote{font:500 17px/1.6 Inter,system-ui,sans-serif;font-style:normal;color:var(--text)}
 .ps:is(.summer,.spring,.autumn,.winter) .season h2{font:600 24px/1.2 Inter,sans-serif;font-style:normal}
 .ps .kicker{font-size:11px;letter-spacing:.12em;font-weight:600}
 .ps :is(.game-info>p,.game-meta,.why,.card-social-context,.activity-time,.social-reason,.activity-actions button,.circle-mini small,.related-list small,.web-ownership,.connection-reason,.web-profile-preview,.web-profile-preview>button,.finder-head p,.section-head p,.mood-note,.mood-note button,.network-caption,.graph-help,.web-legend,footer,.reset,.advanced,.text-button,.activity-game p,.person-link,.finder-social,.finder-social>button,.web-filters button,.zoom-controls span){font-size:12.5px}
 .ps :is(.game-title button,.circle-mini strong){font-size:14px}
 .ps label{font-size:12px}
 .ps select,.ps .web-search input,.ps .search input{font-size:13px}
 .ps .game-art{border-radius:12px}
 .ps .game-info{padding-top:12px}
 .ps .game-meta{margin:8px 0}
 .ps .why{border-top:0;padding-top:0}
 .ps .activity-card,.ps .side-card,.ps .web-rec,.ps .circle-card{transition:border-color .2s}
 .ps .activity-card:hover,.ps .circle-card:hover,.ps .web-rec:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--line))}
 .ps .section{padding-top:72px}
 .ps .intro{padding:56px 0 36px}
 .ps .games{gap:28px 22px}
 .ps .finder{padding:28px}
 .ps .season{height:150px;padding:16px}
 .ps .season .tags,.ps .season .line{display:none}
 .ps .season-bottom{margin-top:8px;padding-top:8px}
 .ps .season-top{top:14px}
 .ps .compare-tray{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:90;width:min(960px,calc(100% - 32px));margin:0!important;box-shadow:0 12px 40px #0006;background:var(--surface)}
.ps.autumn{--bg:var(--ps-AutumnBackground,var(--token-pEg3QnG6_,#111a17));--surface:var(--ps-AutumnSurface,var(--token-gAC6Jk_Zd,#1a2420));--text:var(--ps-AutumnText,var(--token-qoUM4MCZW,#f2f0e7));--muted:var(--ps-AutumnMuted,var(--token-OgU5QKno6,#aab5aa));--line:var(--ps-AutumnBorder,var(--token-bBlvFUsdn,#34413a));--accent:var(--ps-AutumnAccent,var(--token-EzqfK39pf,#d6e7b8));--ink:var(--ps-AutumnOnAccent,var(--token-ppHAco4EE,#18231b));}
.ps.summer{--bg:var(--ps-SummerBackground,var(--token-pNlLshm2W,#fff7e8));--surface:var(--ps-SummerSurface,var(--token-rczGRbL0V,#ffedcf));--text:var(--ps-SummerText,var(--token-bqf3Htfos,#292219));--muted:var(--ps-SummerMuted,var(--token-hUbQef9Kp,#665b48));--line:var(--ps-SummerBorder,var(--token-hqFYESDNJ,#ddc9a8));--accent:var(--ps-SummerAccent,var(--token-eQ2jAS_1u,#ed653e));--ink:var(--ps-SummerOnAccent,var(--token-bjyznlgH9,#ffffff));}
.ps.spring{--bg:var(--ps-SpringBackground,var(--token-ZneZSJH11,#f2f5e9));--surface:var(--ps-SpringSurface,var(--token-O4cu5WWyz,#e8efdd));--text:var(--ps-SpringText,var(--token-fEwuX8Qlm,#243f34));--muted:var(--ps-SpringMuted,var(--token-U6o_jDhB7,#5a6e5a));--line:var(--ps-SpringBorder,var(--token-ZvRGbP63a,#cbd7bf));--accent:var(--ps-SpringAccent,var(--token-Ad0eP42pg,#3e674a));--ink:var(--ps-SpringOnAccent,var(--token-oQN_KdHbe,#ffffff));}
.ps.winter{--bg:var(--ps-WinterBackground,var(--token-GXBFylioX,#101821));--surface:var(--ps-WinterSurface,var(--token-VY2_Csgps,#192530));--text:var(--ps-WinterText,var(--token-vTOmfB0Pl,#e8f0f6));--muted:var(--ps-WinterMuted,var(--token-KvbE9DelC,#a8bccb));--line:var(--ps-WinterBorder,var(--token-jXJXMiOeK,#354653));--accent:var(--ps-WinterAccent,var(--token-XV21F2PDT,#bdd9ed));--ink:var(--ps-WinterOnAccent,var(--token-yiedWUFhA,#142430));}

 .ps .web-page{padding-top:38px}.ps .web-intro{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:0 0 30px}.ps .web-intro h1{font-size:57px;margin:7px 0 10px;letter-spacing:-1.6px}.ps .web-intro p{font-size:12px;color:var(--muted)}.ps .web-live{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:8px;letter-spacing:1px;white-space:nowrap}.ps .web-toolbar{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:18px}.ps .web-filters{display:flex;gap:5px;background:var(--surface);padding:5px;border:1px solid var(--line);border-radius:30px}.ps .web-filters button{font-size:10px;padding:8px 17px;border-radius:25px;color:var(--muted);min-height:35px}.ps .web-filters button[aria-pressed=true]{background:var(--accent);color:var(--ink)}.ps .web-search{display:flex;flex-direction:row;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:9px 0;width:185px}.ps .web-search input{border:0;background:none;outline:none;color:var(--text);font-size:11px;width:100%;min-width:0}.ps .web-search input::placeholder{color:var(--muted)}.ps .web-shell{display:grid;grid-template-columns:minmax(0,1fr) 284px;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--bg)}.ps .web-network{min-width:0;position:relative;background-image:radial-gradient(var(--line) .7px,transparent .7px);background-size:23px 23px;display:flex;flex-direction:column}.ps .network-caption{display:flex;justify-content:space-between;padding:22px 23px 0;font-size:8px;letter-spacing:1.3px;color:var(--muted);gap:10px}.ps .graph-stage{height:600px;width:100%;touch-action:none;cursor:grab;overflow:hidden}.ps .graph-stage:active{cursor:grabbing}.ps .web-node{transition:opacity .2s}.ps .web-node:hover>circle,.ps .web-node:focus-visible>circle,.ps .web-node:focus-visible>rect,.ps .web-node:hover>rect{stroke:var(--accent);stroke-width:3px}.ps .network-bottom{display:flex;align-items:center;justify-content:space-between;padding:0 19px;gap:10px;margin-top:auto}.ps .web-legend{display:flex;gap:13px;font-size:8px;color:var(--muted)}.ps .web-legend span{display:flex;align-items:center;gap:5px}.ps .web-legend i{display:block;border:1px solid var(--muted);width:7px;height:7px}.ps .legend-friend{border-radius:50%;background:var(--muted)}.ps .legend-game{border-radius:1px}.ps .legend-interest{transform:rotate(45deg)}.ps .zoom-controls{display:flex;align-items:center;gap:0;background:var(--surface);border:1px solid var(--line);border-radius:5px}.ps .zoom-controls button{height:34px;width:34px;display:grid;place-items:center;font-size:18px}.ps .zoom-controls span{font-size:9px;padding:0 4px;min-width:32px;text-align:center}.ps .zoom-controls button:last-child{border-left:1px solid var(--line);margin-left:3px}.ps .graph-help{font-size:8px;color:var(--muted);padding:17px 20px 20px;text-align:center}.ps .web-inspector{border-left:1px solid var(--line);padding:24px 23px;background:var(--surface)}.ps .inspector-symbol{margin:25px auto 17px;border:1px solid var(--accent);outline:1px solid var(--line);outline-offset:7px;width:65px;height:65px;border-radius:50%;display:grid;place-items:center;font-size:25px;color:var(--accent);background:var(--bg);font-family:var(--heading)}.ps .inspector-symbol.interest{border-radius:20px}.ps .inspector-type{font-size:9px;color:var(--muted);text-align:center;margin-top:13px}.ps .web-inspector h2{text-align:center;font:500 30px/1.2 var(--heading);margin:7px 0 12px}.ps .web-inspector>p{font-size:11px;color:var(--muted);line-height:1.7;text-align:center}.ps .connection-reason{display:flex;align-items:flex-start;gap:9px;padding:15px 0;margin:14px 0 5px;border-top:1px solid var(--line);font-size:10px;line-height:1.8;color:var(--muted)}.ps .connection-reason svg{color:var(--accent);margin-top:4px}.ps .full{width:100%;margin-top:9px;font-size:10px;min-height:40px}.ps .web-secondary{border:1px solid var(--line);border-radius:5px;padding:10px 12px;display:flex;align-items:center;justify-content:center;gap:8px}.ps .web-secondary[aria-pressed=true]{border-color:var(--accent)}.ps .related-list{margin-top:26px;border-top:1px solid var(--line);padding-top:18px}.ps .related-list button{padding:10px 0;display:flex;justify-content:space-between;align-items:center;text-align:left;width:100%;border-bottom:1px solid var(--line);font-size:11px}.ps .related-list small{display:block;font-size:8px;color:var(--muted);margin-bottom:2px}.ps .inspector-art{width:100%;border-radius:var(--radius);margin-top:20px}.ps .web-game-meta{font-size:10px;display:flex;flex-direction:column;gap:5px;margin-top:16px;color:var(--muted)}.ps .web-game-meta strong{font-size:19px;color:var(--text);margin-top:6px}.ps .web-game-meta small{font-weight:400;font-size:8px;color:var(--muted)}.ps .web-recommendations{padding:38px 0}.ps .web-rec-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.ps .web-rec{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--surface)}.ps .web-rec-image{padding:0;display:block;width:100%;aspect-ratio:2;overflow:hidden}.ps .web-rec-image img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.ps .web-rec-image:hover img{transform:scale(1.05)}.ps .web-rec>div{padding:18px}.ps .web-rec h3{font-size:15px;font-weight:500;margin-bottom:8px}.ps .web-rec p{font-size:10px;color:var(--muted);line-height:1.8;min-height:52px}.ps .web-rec .text-button{font-size:10px;margin-top:15px}.ps.winter .web-intro h1{font-size:44px}.ps.summer .web-intro h1{font-size:47px}.ps.spring .web-shell{border-radius:28px 8px 28px 8px}
 @media(max-width:1050px){.ps .web-shell{grid-template-columns:minmax(0,1fr) 250px}.ps .web-inspector{padding:22px 18px}.ps .web-intro{display:block}.ps .web-live{margin-top:20px}.ps .web-intro h1{font-size:51px}.ps .web-legend{gap:7px;font-size:7px}.ps .network-bottom{padding:0 12px}.ps .web-rec-grid{gap:14px}.ps .web-rec>div{padding:14px}}
 @media(max-width:750px){.ps .web-shell{grid-template-columns:1fr}.ps .web-inspector{border-left:0;border-top:1px solid var(--line);padding:25px;display:block}.ps .web-toolbar{align-items:stretch;flex-direction:column;gap:12px}.ps .web-search{width:100%;padding:11px 4px}.ps .web-filters{justify-content:space-between}.ps .web-filters button{padding:8px 12px}.ps .graph-stage{height:550px}.ps .web-inspector .related-list{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}.ps .related-list>.kicker{grid-column:1/-1}.ps .web-inspector .connection-reason{font-size:12px}.ps .web-inspector>p{font-size:12px}.ps .inspector-art{max-width:400px;display:block;margin:20px auto 0}.ps .web-rec-grid{grid-template-columns:1fr}.ps .web-rec{display:grid;grid-template-columns:130px 1fr}.ps .web-rec-image{aspect-ratio:auto;height:100%}.ps .web-rec p{min-height:0}.ps .web-rec .text-button{margin-top:10px}.ps .web-rec>div{padding:16px}.ps .web-recommendations{padding-bottom:20px}.ps .graph-help{font-size:8px;max-width:300px;margin:auto}.ps .web-intro h1{font-size:46px}.ps .web-intro p{font-size:12px;max-width:290px;line-height:1.8}.ps .web-page{padding-top:31px}.ps.summer .web-intro h1{font-size:36px}.ps.winter .web-intro h1{font-size:35px}.ps .web-inspector .full{font-size:12px;min-height:44px}}


 .ps .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
 .ps .social-page{padding:42px 0 24px}.ps .social-heading{padding:0 0 35px;border-bottom:1px solid var(--line);margin-bottom:30px}.ps .social-heading h1{font:500 62px/1.08 var(--heading);letter-spacing:-1.8px;margin:11px 0 16px;max-width:700px}.ps .social-heading>p{color:var(--muted);font-size:13px;max-width:530px;line-height:1.8}.ps .social-heading-actions{display:flex;align-items:center;gap:25px;margin-top:25px}.ps .social-heading>.primary{margin-top:23px}.ps .social-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;font:500 15px var(--heading);color:var(--accent);background:var(--surface);border:1px solid var(--line);position:relative}.ps .av-jamie{background:var(--accent);color:var(--ink)}.ps .av-alex{border:1px solid var(--accent)}.ps .av-morgan{border-radius:35% 50% 35% 50%;border:1px solid var(--accent)}.ps .avatar-button{padding:0}.ps .person-link{font-size:12px;font-weight:600;padding:0;text-align:left}.ps .person-link:hover{text-decoration:underline;text-underline-offset:3px}.ps .social-muted{font-size:12px;line-height:1.8;color:var(--muted)}.ps .community-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:30px;align-items:start}.ps .community-layout>div,.ps .community-sidebar{min-width:0}.ps .social-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 25px;padding-bottom:18px;border-bottom:1px solid var(--line)}.ps .social-tabs button{font-size:11px;color:var(--muted);border:1px solid var(--line);padding:8px 13px;border-radius:25px;min-height:36px}.ps .social-tabs button[aria-pressed=true]{background:var(--accent);color:var(--ink);border-color:var(--accent)}.ps .activity-feed{display:flex;flex-direction:column;gap:23px}.ps .activity-card{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);padding:23px;overflow:hidden}.ps .activity-person{display:flex;align-items:center;gap:11px;margin-bottom:20px}.ps .activity-person>div{min-width:0}.ps .activity-person p{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5}.ps .activity-time{margin-left:auto;align-self:start;font-size:9px;white-space:nowrap;color:var(--muted);padding-top:3px}.ps .activity-game{display:flex;gap:20px;align-items:center}.ps .activity-art{width:195px;aspect-ratio:1.9;border-radius:calc(var(--radius) * .6);padding:0;overflow:hidden;flex-shrink:0;display:block;background:var(--bg)}.ps .activity-art img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.ps .activity-art:hover img{transform:scale(1.05)}.ps .activity-game .kicker{font-size:8px;letter-spacing:1.5px}.ps .activity-game-name{font:500 26px/1.15 var(--heading);padding:0;text-align:left;margin:3px 0 7px;display:block}.ps .activity-game p{font-size:10px;color:var(--muted);margin-bottom:8px}.ps .activity-game>div>span{font-size:10px;color:var(--muted)}.ps .activity-card blockquote{font:500 23px/1.45 var(--heading);margin:22px 0 18px;letter-spacing:.05px;max-width:650px}.ps .social-reason{display:flex;align-items:flex-start;gap:8px;font-size:10px;line-height:1.8;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}.ps .social-reason svg{margin-top:3px;color:var(--accent)}.ps .activity-actions{display:flex;align-items:center;gap:16px;margin-top:18px;flex-wrap:wrap}.ps .activity-actions button{padding:3px 0;font-size:10px;color:var(--muted);display:flex;align-items:center;gap:5px;min-height:32px}.ps .activity-actions button[aria-pressed=true]{color:var(--accent)}.ps .activity-actions .activity-save{margin-left:auto;color:var(--accent)}.ps .activity-circle{border-top:1px solid var(--line);display:flex;justify-content:space-between;width:100%;margin-top:16px;padding:14px 0 0;font-size:10px;color:var(--muted);text-align:left}.ps .side-card{padding:22px;border:1px solid var(--line);background:var(--surface);border-radius:var(--radius);margin-bottom:21px;overflow:hidden}.ps .side-card h2{font:500 27px/1.15 var(--heading);margin:7px 0 20px}.ps .circle-mini{display:flex;align-items:center;gap:10px;padding:14px 0;width:100%;text-align:left;border-bottom:1px solid var(--line)}.ps .circle-mini>span:not(.social-avatar):not(.circle-glyph){flex:1;min-width:0}.ps .circle-mini strong{font-size:11px;font-weight:500;display:block;line-height:1.5}.ps .circle-mini small{font-size:9px;color:var(--muted);display:block;margin-top:3px}.ps .circle-glyph{width:33px;height:33px;display:grid;place-items:center;background:var(--bg);border:1px solid var(--line);border-radius:30%;color:var(--accent);flex-shrink:0}.ps .side-note{padding:12px 20px 25px;color:var(--accent)}.ps .side-note p{font:500 32px/1.1 var(--heading);margin:15px 0}.ps .side-note>span{color:var(--muted);font-size:10px;line-height:1.8}.ps .small-game{display:flex;align-items:center;gap:12px;padding:15px 0;border-bottom:1px solid var(--line);min-width:0}.ps .small-game-art{width:84px;height:65px;overflow:hidden;border-radius:5px;flex-shrink:0;padding:0}.ps .small-game-art img{height:100%;width:100%;object-fit:cover}.ps .small-game>div{flex:1;min-width:0}.ps .small-game p{font-size:10px;line-height:1.6;color:var(--muted);margin:4px 0}.ps .small-game>div>span{font-size:10px;color:var(--accent)}.ps .small-game .icon-button{width:29px;height:29px;flex-shrink:0}.ps .side-card .small-game{gap:9px;flex-wrap:wrap}.ps .side-card .small-game-art{width:68px;height:51px}.ps .side-card .small-game .icon-button{width:25px;height:25px}.ps .side-card .small-game .person-link{font-size:11px}.ps .social-preview{padding:43px 0 20px}.ps .preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.ps .activity-card.compact{padding:18px;display:flex;flex-direction:column}.ps .compact .activity-person{gap:9px;margin-bottom:16px}.ps .compact .activity-person .social-avatar{width:31px!important;height:31px!important}.ps .compact .activity-time{display:none}.ps .compact .activity-game{display:block}.ps .compact .activity-art{width:100%;aspect-ratio:2;margin-bottom:15px}.ps .compact .activity-game-name{font-size:26px}.ps .compact .activity-person p{font-size:10px}.ps .compact blockquote{font-size:21px;line-height:1.4;margin:16px 0;flex:1}.ps .compact .social-reason{font-size:10px}.ps .compact .activity-actions{gap:11px;flex-wrap:wrap;margin-top:12px}.ps .compact .activity-save{margin-left:0}.ps .compact .activity-save span,.ps .compact .action-word{display:none}.ps .compact .activity-actions button{font-size:9px}.ps .social-preview-foot{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:23px 0;border-bottom:1px solid var(--line)}.ps .social-preview-foot>span{display:flex;gap:7px;align-items:center;font-size:10px;color:var(--muted)}.ps .social-preview-foot .social-avatar:nth-child(2){margin-left:-14px}.ps .comment-thread{border-top:1px solid var(--line);margin-top:16px;padding-top:17px}.ps .comment{display:flex;gap:10px;margin:18px 0;align-items:flex-start}.ps .comment>div{flex:1;min-width:0}.ps .comment p{font-size:12px;color:var(--muted);line-height:1.8;margin-top:4px;white-space:pre-wrap;overflow-wrap:anywhere}.ps .comment>div>button:last-child:not(.person-link){font-size:10px;color:var(--accent);padding:5px 0}.ps .comment-thread form{display:flex;gap:9px;margin-top:18px;align-items:center}.ps .comment-thread label{flex:1;min-width:0}.ps .comment-thread input,.ps .social-modal input,.ps .social-modal textarea,.ps .circle-compose textarea{border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--text);padding:12px;font-size:12px;max-width:100%;width:100%;min-width:0}.ps .comment-thread .primary{padding:10px 14px;font-size:11px}.ps .social-modal{max-width:570px}.ps .social-modal form{display:flex;flex-direction:column;gap:19px}.ps .social-modal label{font-size:11px}.ps .social-modal textarea,.ps .circle-compose textarea{min-height:100px;resize:vertical;font:12px/1.8 Inter,sans-serif}.ps .social-modal select{font-size:12px}.ps .social-modal .primary{align-self:flex-start;margin-top:5px}.ps .row-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:22px}.ps .row-actions .web-secondary{font-size:11px}.ps .back-link{font-size:10px;color:var(--muted);margin-bottom:23px}.ps .profile-cover,.ps .circle-cover{padding:31px;border:1px solid var(--line);background:var(--surface);border-radius:var(--radius);margin-bottom:27px;position:relative;overflow:hidden}.ps .profile-identity{display:flex;align-items:center;gap:24px}.ps .profile-identity .social-avatar{font-size:36px}.ps .profile-cover h1{font:500 49px/1.1 var(--heading);margin:7px 0;letter-spacing:-1px}.ps .profile-identity>div>span{font-size:11px;color:var(--muted)}.ps .profile-cover>p{font-size:13px;color:var(--muted);max-width:570px;line-height:1.8;margin-top:22px}.ps .profile-shared{display:flex;flex-wrap:wrap;gap:7px;margin-top:17px}.ps .profile-cover-actions{display:flex;align-items:center;gap:14px;margin-top:25px}.ps .profile-cover-actions .web-secondary{font-size:11px}.ps .profile-section{padding:4px 0 30px}.ps .profile-section h2,.ps .group-finder h2,.ps .circle-discussion h2{font:500 31px/1.2 var(--heading);margin:3px 0 12px}.ps .social-game-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.ps .circle-directory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.ps .circle-card{border:1px solid var(--line);border-radius:var(--radius);padding:26px;background:var(--surface);display:flex;flex-direction:column;overflow:hidden}.ps .circle-card-top{display:flex;align-items:center;justify-content:space-between;color:var(--accent);padding-bottom:29px}.ps .circle-card-top>span{font-size:10px;color:var(--muted)}.ps .circle-card h2{font:500 35px/1.1 var(--heading);margin:7px 0 16px}.ps .circle-card>p{font-size:12px;color:var(--muted);line-height:1.8;flex:1}.ps .circle-card .primary{font-size:10px;padding:12px 14px}.ps .circle-cover h1{font:500 58px/1.1 var(--heading);max-width:650px;margin:12px 0 18px;letter-spacing:-1px}.ps .circle-cover>p{max-width:590px;font-size:13px;line-height:1.9;color:var(--muted)}.ps .group-finder{padding:26px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}.ps .group-finder>p{margin:13px 0 24px}.ps .group-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:17px 14px;margin-bottom:22px}.ps .group-fields label{font-size:10px}.ps .group-results{margin-top:30px;border-top:1px solid var(--line);padding-top:22px}.ps .group-result{padding:0 0 23px;margin-bottom:22px;border-bottom:1px solid var(--line)}.ps .group-result>p{font-size:12px;color:var(--muted);line-height:1.8;margin-top:15px}.ps .ownership{display:grid;grid-template-columns:1fr 1fr;gap:18px;background:var(--bg);padding:18px;border:1px solid var(--line);border-radius:5px;margin-top:19px}.ps .ownership span{font-size:11px;line-height:1.8;color:var(--muted)}.ps .ownership strong{display:block;font-size:10px;color:var(--accent);margin-bottom:6px}.ps .shared-wishlist-row{padding-bottom:16px}.ps .shared-wishlist-row>.text-button{font-size:10px;margin-top:10px;color:var(--muted)}.ps .circle-discussion{padding:25px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}.ps .circle-discussion>.comment{padding:16px 0;border-bottom:1px solid var(--line)}.ps .circle-compose{display:flex;flex-direction:column;gap:17px;margin-top:25px}.ps .circle-compose>.primary{align-self:flex-start}.ps .member-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ps .member-card{display:flex;flex-direction:column;align-items:center;gap:12px;border:1px solid var(--line);border-radius:var(--radius);padding:25px 18px;background:var(--surface)}.ps .member-card strong{font-size:13px;font-weight:500}.ps .member-card>span:not(.social-avatar){font-size:10px;color:var(--muted)}.ps .game-social{margin-top:30px;padding-top:25px;border-top:1px solid var(--line)}.ps .game-social h2{font:500 29px var(--heading);margin:7px 0}.ps .social-owner-row{display:flex;gap:15px;flex-wrap:wrap;margin:17px 0}.ps .social-owner-row>button{display:flex;gap:7px;align-items:center;font-size:11px;padding:0}.ps .game-social-quote{margin-top:17px;padding-top:16px;border-top:1px solid var(--line)}.ps .game-social-quote>p{font:500 21px/1.5 var(--heading);color:var(--muted);margin-top:9px}.ps .finder-social{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)}.ps .finder-social>span{margin-right:6px}.ps .finder-social>button{font-size:10px;border:1px solid var(--line);padding:6px 11px;border-radius:20px;min-height:32px}.ps .finder-social>button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}.ps .card-social-context{font-size:9px;color:var(--accent);margin-top:9px;line-height:1.7}.ps .web-profile-preview{margin:20px 0;border-top:1px solid var(--line);padding-top:16px;font-size:10px}.ps .web-profile-preview>span{color:var(--muted);font-size:9px}.ps .web-profile-preview strong{display:block;font-weight:500;margin:13px 0 7px;color:var(--accent)}.ps .web-profile-preview>button{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;padding:7px 0;font-size:10px}.ps .web-ownership{font-size:10px;line-height:1.8;padding-top:15px;margin-top:19px;border-top:1px solid var(--line);color:var(--muted)}.ps .web-ownership strong{color:var(--accent);font-weight:500}.ps .web-ownership>button{font-size:10px;padding:8px 0;text-decoration:underline}.ps .web-filters{flex-wrap:wrap;border-radius:var(--radius)}.ps .web-filters>button{padding:8px 12px}.ps .navlinks{gap:21px}.ps .navlinks button{font-size:12px}.ps .search{width:165px}
 .ps.summer .social-heading h1{font-size:52px;font-weight:700}.ps.summer .activity-card,.ps.summer .circle-card{border:1px solid var(--text);box-shadow:3px 3px 0 var(--line)}.ps.spring .profile-cover,.ps.spring .circle-cover{border-radius:38px 8px 38px 8px}.ps.autumn .activity-card blockquote{font-style:italic}.ps.winter .social-heading h1{font-size:47px;font-weight:400}.ps.winter .activity-card blockquote{font-size:19px;font-weight:400}.ps.winter .activity-card,.ps.winter .profile-cover,.ps.winter .circle-cover{background:linear-gradient(125deg,var(--surface),var(--bg))}
 @media(max-width:1100px){.ps .community-layout{grid-template-columns:minmax(0,1fr) 260px;gap:23px}.ps .side-card{padding:18px}.ps .activity-art{width:150px}.ps .activity-card{padding:20px}.ps .activity-game{gap:16px}.ps .preview-grid{gap:14px}.ps .compact{padding:16px}.ps .circle-directory{gap:15px}.ps .circle-card{padding:21px}.ps .circle-card h2{font-size:30px}.ps .group-fields{grid-template-columns:1fr 1fr}.ps .social-game-grid{grid-template-columns:1fr}.ps .activity-actions{gap:12px}.ps .social-preview-foot{flex-wrap:wrap}.ps .side-card .small-game-art{width:100%;height:auto;aspect-ratio:2}.ps .side-card .small-game>div{min-width:100px}}
 @media(max-width:1050px){.ps .navlinks{display:none}.ps .mobile-menu{display:block}.ps .navtools{margin-left:auto}.ps .search{width:180px}.ps .mobile-links{display:flex;gap:17px;flex-wrap:wrap;padding:20px 0;border-bottom:1px solid var(--line);font-size:12px}.ps .preview-grid{grid-template-columns:1fr}.ps .compact .activity-game{display:flex}.ps .compact .activity-art{width:180px;margin-bottom:0}.ps .compact blockquote{font-size:24px}.ps .compact .activity-time{display:block}.ps .compact .activity-save{margin-left:auto}.ps .compact .activity-save span{display:inline}.ps .compact .activity-actions button{font-size:10px}}
 @media(max-width:800px){.ps .community-layout{grid-template-columns:1fr}.ps .community-sidebar{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ps .side-card{margin-bottom:0}.ps .side-note{display:none}.ps .social-heading h1{font-size:53px}.ps .activity-art{width:190px}.ps .circle-directory{grid-template-columns:1fr}.ps .circle-card{padding:27px}.ps .circle-card-top{padding-bottom:21px}.ps .circle-cover h1{font-size:48px}.ps .social-game-grid{grid-template-columns:1fr 1fr}.ps .circle-card .row-actions{justify-content:space-between}.ps .group-fields{grid-template-columns:repeat(3,1fr)}}
 @media(max-width:500px){.ps .social-page{padding-top:29px}.ps .social-heading h1{font-size:44px;letter-spacing:-1px;max-width:330px;margin:12px 0}.ps .social-heading>p{font-size:12px;max-width:290px}.ps .social-heading-actions{gap:16px;flex-wrap:wrap;margin-top:22px}.ps .social-heading-actions .primary{font-size:11px;padding:12px 15px}.ps .community-sidebar{grid-template-columns:1fr;gap:20px}.ps .side-card{padding:22px}.ps .activity-card{padding:18px}.ps .activity-time{font-size:8px;max-width:55px;white-space:normal;text-align:right}.ps .activity-person p{font-size:10px}.ps .activity-person{gap:9px}.ps .activity-art{width:115px;aspect-ratio:1.45}.ps .activity-game{gap:13px}.ps .activity-game-name{font-size:25px}.ps .activity-game>div>span{font-size:9px}.ps .activity-game .kicker{font-size:7px}.ps .activity-game p{font-size:9px}.ps .activity-card blockquote{font-size:23px;margin:19px 0}.ps .activity-actions{gap:14px 11px}.ps .activity-actions .activity-save{margin-left:0}.ps .action-word{display:none}.ps .social-reason{font-size:10px}.ps .social-tabs{gap:6px;margin-bottom:20px;padding-bottom:15px}.ps .social-tabs button{font-size:10px;min-height:36px;padding:8px 11px}.ps .community-layout{gap:25px}.ps .social-preview{padding-top:34px}.ps .social-preview .section-head{align-items:flex-start}.ps .social-preview .section-head h2{font-size:29px;max-width:215px}.ps .social-preview .section-head p{font-size:10px;max-width:220px}.ps .social-preview .section-head .text-button{margin-top:24px;font-size:9px}.ps .preview-grid{gap:17px}.ps .compact .activity-art{width:115px}.ps .compact .activity-save{margin-left:0}.ps .compact .activity-time{display:none}.ps .social-preview-foot>span{flex-wrap:wrap;font-size:10px;line-height:1.8}.ps .social-preview-foot>span .social-avatar{width:22px!important;height:22px!important}.ps .social-preview-foot .text-button{font-size:10px}.ps .comment-thread form{flex-wrap:wrap}.ps .comment-thread label{flex-basis:100%}.ps .profile-cover,.ps .circle-cover{padding:24px 20px}.ps .profile-identity{gap:16px;align-items:flex-start}.ps .profile-identity .social-avatar{width:64px!important;height:64px!important;font-size:29px}.ps .profile-cover h1{font-size:37px;margin:8px 0}.ps .profile-cover .kicker{font-size:8px}.ps .profile-cover>p{font-size:12px}.ps .profile-identity>div>span{font-size:9px}.ps .profile-cover-actions{flex-wrap:wrap}.ps .profile-cover-actions .primary{font-size:11px}.ps .social-game-grid{grid-template-columns:1fr}.ps .side-card .small-game-art{width:80px;height:65px;aspect-ratio:auto}.ps .side-card .small-game>div{min-width:0}.ps .circle-cover h1{font-size:42px;letter-spacing:-1px}.ps .circle-cover .kicker{font-size:8px}.ps .circle-cover>p{font-size:12px}.ps .circle-card{padding:24px}.ps .circle-card h2{font-size:35px}.ps .group-finder,.ps .circle-discussion{padding:21px 17px}.ps .group-finder h2{font-size:31px}.ps .group-fields{grid-template-columns:1fr 1fr;gap:16px 11px}.ps .group-fields label{font-size:9px}.ps .group-result .small-game-art{width:80px}.ps .group-result>p{font-size:11px}.ps .ownership{padding:14px;gap:14px}.ps .ownership span{font-size:10px}.ps .ownership strong{font-size:9px}.ps .row-actions .primary{font-size:10px}.ps .member-card{padding:23px 13px}.ps .finder-social{gap:7px}.ps .finder-social>span{width:100%}.ps .finder-social>button{font-size:9px;padding:6px 9px}.ps .card-social-context{font-size:8px}.ps .detail-actions{flex-wrap:wrap}.ps .web-filters{border-radius:12px}.ps .web-filters>button{font-size:9px;padding:7px 10px}.ps .social-modal .modal-head h2{font-size:29px}.ps .social-owner-row{gap:12px}.ps .search{width:35px}.ps.summer .social-heading h1{font-size:34px}.ps.winter .social-heading h1{font-size:34px}}


 .ps .social-destinations{display:flex;gap:23px;border-bottom:1px solid var(--line);padding:22px 0 15px;flex-wrap:wrap}.ps .social-destinations button{font-size:11px;color:var(--muted);padding:0 0 5px}.ps .social-destinations button[aria-current=page]{color:var(--accent);border-bottom:1px solid var(--accent)}.ps .social-modal{position:relative;z-index:1}

 .ps .privacy-preview{display:flex;align-items:center;gap:24px;margin:0 0 25px;border:1px solid var(--line);border-radius:var(--radius);padding:16px 20px}.ps .privacy-preview label{font-size:10px;min-width:160px}.ps .privacy-preview>span{font-size:10px;color:var(--muted)}@media(max-width:500px){.ps .privacy-preview{flex-wrap:wrap;gap:12px}}

 .ps .wishlist-social{margin-bottom:25px;border-bottom:1px solid var(--line);padding-bottom:20px}.ps .wishlist-social .row-actions{margin:0 0 15px}.ps .wishlist-social .primary{font-size:11px}.ps .wishlist-overlap{display:flex;flex-wrap:wrap;gap:14px;margin-top:15px}.ps .wishlist-overlap>button{display:flex;align-items:center;gap:8px;font-size:10px;padding:0}.ps button:disabled{cursor:not-allowed;opacity:.5}

 .ps .browse-fields{grid-template-columns:repeat(4,minmax(0,1fr))}.ps .browse-fields input{width:100%;min-width:0;padding:13px 12px;border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--text);font:12px Inter,sans-serif}.ps .browse-controls{margin-top:25px}.ps .browse-controls .finder-foot{justify-content:space-between;align-items:center}.ps .browse-controls .summary{font-size:10px;color:var(--muted)}@media(max-width:750px){.ps .browse-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.ps .browse-fields{grid-template-columns:1fr}}
 .ps .web-network{height:760px}.ps .graph-stage{height:600px;flex-shrink:0}.ps .web-inspector{max-height:760px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line) transparent}
 @media(max-width:750px){.ps .web-network{height:660px}.ps .graph-stage{height:550px}.ps .web-inspector{max-height:none;overflow:visible}}

 /* PLAYSCAPE 2.0 — unified game-store design system */
 .ps{
   --bg:#0b0e16;--surface:#141a27;--surface-2:#1b2333;--surface-3:#222d40;
   --text:#f3f5fb;--muted:#9ba6bb;--line:#2b3548;--accent:#9b83ff;--ink:#11101d;
   --radius:14px;--heading:'Space Grotesk',Inter,system-ui,sans-serif;
   color:var(--text);background:var(--bg);font-family:'DM Sans',Inter,system-ui,sans-serif;
   font-size:14px;line-height:1.55;overflow-x:clip;overflow-y:visible;
   background-image:radial-gradient(ellipse at 50% -22%,#6d5ac01c,transparent 55%);
 }
 .ps.summer,.ps.spring,.ps.autumn,.ps.winter{
   --bg:#0b0e16;--surface:#141a27;--text:#f3f5fb;--muted:#9ba6bb;--line:#2b3548;
   --ink:#11101d;--radius:14px;--heading:'Space Grotesk',Inter,system-ui,sans-serif;
   background-color:var(--bg);background-image:radial-gradient(ellipse at 50% -22%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 55%);
 }
 .ps.summer{--accent:#ffb45e}.ps.spring{--accent:#66d6b0}.ps.autumn{--accent:#a78bfa}.ps.winter{--accent:#65c9ee}
 .ps .wrap{max-width:1360px;padding-inline:clamp(20px,4vw,64px)}
 .ps .nav{height:76px;gap:clamp(18px,2.5vw,36px);border-bottom:1px solid #ffffff12;background:#0b0e16e8;backdrop-filter:blur(18px);position:sticky;top:0;z-index:70}
 .ps .brand{font:700 24px 'Space Grotesk',sans-serif;letter-spacing:-1.3px;color:#fff}
 .ps .brand-mark{border-radius:8px 13px 8px 13px;transform:rotate(-12deg);background:linear-gradient(145deg,var(--accent),#53d9e8);border:0;width:27px;height:27px;box-shadow:0 0 24px color-mix(in srgb,var(--accent) 25%,transparent)}
 .ps .brand-mark:after{inset:7px;border:2px solid #111522;border-radius:50%;}
 .ps .navlinks{gap:clamp(14px,2vw,28px)}.ps .navlinks button{font-size:13px;font-weight:600;color:#929db2;transition:color .18s}
 .ps .navlinks button:hover,.ps .navlinks button.current{color:#fff}.ps .navlinks .current:after{height:3px;border-radius:4px 4px 0 0;background:var(--accent);box-shadow:0 0 14px color-mix(in srgb,var(--accent) 55%,transparent)}
 .ps .navtools{gap:13px}.ps .search{width:clamp(155px,18vw,245px);border-radius:10px;background:#ffffff08;border-color:#ffffff18;padding:10px 13px}
 .ps .search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent)}
 .ps .search input{font-size:13px}.ps .avatar{background:linear-gradient(145deg,var(--accent),#53d9e8);color:#101522;border:2px solid #ffffff30;width:36px;height:36px}
 .ps .nav-theme{border-color:#ffffff20;background:#ffffff08}
 .ps .atmosbar{padding-top:21px;font-size:11px}.ps .online{color:#9ba6bb}.ps .dot{width:7px;height:7px;background:#62d6a6;box-shadow:0 0 10px #62d6a688}
 .ps .theme-trigger{border-radius:9px;background:#ffffff08;border-color:#ffffff1b;padding:8px 12px}.ps .theme-trigger:hover{box-shadow:none;border-color:var(--accent)}
 .ps .intro{padding:clamp(48px,6vw,78px) 0 34px;text-align:left;max-width:900px}
 .ps .eyebrow{justify-content:flex-start;color:var(--accent);font-size:11px;font-weight:700;letter-spacing:1.7px}
 .ps :is(.intro h1,.social-heading h1,.web-intro h1,.circle-cover h1,.profile-cover h1){font-family:'Space Grotesk',sans-serif;font-size:clamp(38px,5.4vw,66px);font-weight:700;letter-spacing:-.055em;line-height:1.04;margin:16px 0 14px;max-width:850px}
 .ps .intro>p,.ps .social-heading>p{font-size:16px;color:var(--muted);max-width:640px;line-height:1.7}
 .ps .season-grid{gap:16px;margin-top:12px}.ps .season{height:250px;border-radius:15px;border:1px solid #ffffff22;box-shadow:0 12px 35px #00000020}
 .ps .season:hover{transform:translateY(-5px);border-color:color-mix(in srgb,var(--accent) 60%,white)}
 .ps .season.selected{outline:2px solid var(--accent);outline-offset:3px}.ps .season h2{font:700 28px 'Space Grotesk',sans-serif;letter-spacing:-.04em}
 .ps .season .line{font-size:12px;font-weight:600}.ps .season .tags{font-size:10px;color:#e2e8f2}
 .ps .mood-note{margin:19px 0 28px;color:var(--muted);font-size:12px}.ps .mood-note button{color:var(--accent);font-size:12px}
 .ps .finder{background:linear-gradient(135deg,#192235,#121927);border:1px solid #ffffff17;border-radius:16px;padding:25px 27px;box-shadow:0 18px 45px #00000022}
 .ps .finder-head h2{font:600 18px 'Space Grotesk',sans-serif;letter-spacing:-.02em}.ps .finder-head h2 svg{color:var(--accent)}.ps .finder-head p{color:var(--muted);font-size:12px}
 .ps label{font-size:11px;font-weight:600;color:#aeb8ca}.ps select,.ps .browse-fields input,.ps .web-search input,.ps .search input{background:#0e1420;color:var(--text);border:1px solid #ffffff1c;border-radius:9px;font-size:13px;min-height:44px}
 .ps select:focus,.ps .browse-fields input:focus{border-color:var(--accent);outline:2px solid color-mix(in srgb,var(--accent) 25%,transparent)}
 .ps .primary{background:var(--accent);color:#111321;border-radius:9px;font-size:13px;font-weight:800;min-height:44px;padding:12px 18px;box-shadow:0 7px 22px color-mix(in srgb,var(--accent) 18%,transparent)}
 .ps .primary:hover{filter:brightness(1.08);transform:translateY(-2px);box-shadow:0 10px 26px color-mix(in srgb,var(--accent) 26%,transparent)}
 .ps .finder-social{color:var(--muted)}.ps .finder-social button[aria-pressed=true]{color:var(--accent);font-weight:700}
 .ps .section{padding-top:62px}.ps .section-head{margin-bottom:23px;align-items:end}.ps .kicker{color:var(--accent);font-size:10px;font-weight:800;letter-spacing:1.5px}
 .ps .section-head h2,.ps :is(.side-card h2,.profile-section h2,.group-finder h2,.circle-discussion h2,.game-social h2,.web-inspector h2){font:700 clamp(24px,3vw,32px)/1.15 'Space Grotesk',sans-serif;letter-spacing:-.045em;color:var(--text)}
 .ps .section-head p{color:var(--muted);font-size:12px}.ps .text-button{font-size:12px;color:var(--accent);font-weight:700}
 .ps .games{gap:24px 18px}.ps .game{min-width:0}.ps .game-art{aspect-ratio:1.72;border-radius:12px;border:1px solid #ffffff14;background:var(--surface);box-shadow:0 10px 24px #00000022}
 .ps .game-art img{transition:transform .35s ease,filter .35s}.ps .game-art:hover img{transform:scale(1.055);filter:saturate(1.12)}
 .ps .save{width:34px;height:34px;border-radius:10px;background:#0b0e16d9;border:1px solid #ffffff38}.ps .save.saved{background:var(--accent);color:#111321;border-color:transparent}
 .ps .explore{background:linear-gradient(0deg,#080b12ed,#080b1270);font-weight:700;font-size:12px;padding:12px}
 .ps .game-info{padding:12px 2px 0}.ps .game-title{align-items:center}.ps .game-title button{font:700 15px 'Space Grotesk',sans-serif;letter-spacing:-.02em}.ps .game-title>span{font-size:12px;font-weight:700;color:#fff}
 .ps .game-info>p{font-size:11px;color:var(--muted)}.ps .game-meta{font-size:10px;color:#aab5c8}.ps .why{color:var(--accent);font-size:10px}
 .ps .editorial{border:1px solid #ffffff18;border-radius:16px;box-shadow:0 18px 50px #00000028}.ps .editorial h2{font-family:'Space Grotesk',sans-serif;letter-spacing:-.04em}
 .ps .bottom{border-color:#ffffff16}.ps footer{border-color:#ffffff16;color:var(--muted)}
 .ps .browse-controls{margin-top:10px}.ps .browse-fields{gap:14px}.ps .browse-controls .summary{color:var(--muted)}
 .ps .veil{background:#050811c9;backdrop-filter:blur(10px)}.ps .modal{background:#151d2b;border:1px solid #ffffff20;border-radius:18px;box-shadow:0 28px 90px #0009;color:var(--text)}
 .ps .toast{background:var(--accent);color:#101321;border-radius:10px;font-weight:700;box-shadow:0 12px 35px #0008}
 .ps :is(.activity-card,.side-card,.web-rec,.circle-card,.profile-cover,.circle-cover,.web-shell,.web-filters,.member-card,.group-finder,.circle-discussion,.finder,.summary,.privacy-preview){background-color:var(--surface);border:1px solid #ffffff16;border-radius:14px;box-shadow:none}
 .ps :is(.activity-card,.side-card,.web-rec,.circle-card,.member-card):hover{border-color:color-mix(in srgb,var(--accent) 50%,#ffffff20)}
 .ps .social-heading,.ps .web-intro{padding-top:54px}.ps .social-heading h1,.ps .web-intro h1{font-family:'Space Grotesk',sans-serif}
 .ps button:focus-visible,.ps a:focus-visible,.ps input:focus-visible,.ps select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
 .ps ::selection{background:color-mix(in srgb,var(--accent) 38%,transparent);color:#fff}
 @media(max-width:1000px){.ps .wrap{padding-inline:28px}.ps .nav{gap:18px}.ps .navlinks{gap:16px}.ps .navlinks button{font-size:12px}.ps .search{width:165px}.ps .games{gap:22px 15px}}
 @media(max-width:800px){.ps .nav{height:68px}.ps .season-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ps .season{height:225px}.ps .intro{padding-top:44px}.ps .finder-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.ps .finder-fields>.primary{grid-column:1/-1}.ps .games{grid-template-columns:repeat(2,minmax(0,1fr))}.ps .section{padding-top:48px}}
 @media(max-width:520px){.ps .wrap{padding-inline:18px}.ps .nav{gap:12px}.ps .brand{font-size:20px}.ps .search{width:38px;padding:9px}.ps .search input{font-size:12px}.ps .search:focus-within{left:18px;right:18px}.ps .navtools{gap:8px}.ps .avatar{width:32px;height:32px}.ps .intro{padding:38px 0 26px}.ps .intro h1{font-size:clamp(36px,10vw,48px)}.ps .intro>p{font-size:14px}.ps .season-grid{gap:11px}.ps .season{height:205px;padding:15px 13px}.ps .season h2{font-size:24px}.ps .season .tags{font-size:9px}.ps .finder{padding:19px 15px}.ps .finder-head{display:block}.ps .finder-head p{margin:7px 0 0 27px}.ps .finder-fields{gap:12px}.ps .finder-foot{gap:12px;flex-wrap:wrap}.ps .games{gap:22px 12px}.ps .game-art{aspect-ratio:1.45}.ps .game-title button{font-size:13px}.ps .game-title>span{font-size:11px}.ps .game-meta{font-size:9px}.ps .section-head h2{font-size:25px}.ps .editorial{padding:25px 20px}.ps .veil{padding:12px}}
 @media(prefers-reduced-motion:reduce){.ps,.ps *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}


 /* PLAYSCAPE — calmer, more spacious visual pass */
 .ps {
   --bg: #0d111b;
   --surface: #151c2a;
   --surface-2: #1a2333;
   --surface-3: #202b3d;
   --text: #f2f4f9;
   --muted: #9ba6b8;
   --line: #283347;
   --radius: 16px;
   background-color: var(--bg);
   background-image: radial-gradient(ellipse at 50% -30%, color-mix(in srgb,var(--accent) 9%,transparent), transparent 58%);
   letter-spacing: 0;
 }
 .ps.summer,.ps.spring,.ps.autumn,.ps.winter {
   --bg:#0d111b; --surface:#151c2a; --surface-2:#1a2333; --surface-3:#202b3d;
   --text:#f2f4f9; --muted:#9ba6b8; --line:#283347; --radius:16px;
   background-color:var(--bg);
   background-image:radial-gradient(ellipse at 50% -30%,color-mix(in srgb,var(--accent) 9%,transparent),transparent 58%);
 }
 .ps .wrap { max-width:1280px; padding-inline:clamp(22px,5vw,76px); }
 .ps .nav {
   height:72px; gap:clamp(16px,2.2vw,32px);
   border-bottom:1px solid #ffffff0d;
   background:rgba(13,17,27,.9); backdrop-filter:blur(20px);
 }
 .ps .brand { font-size:22px; letter-spacing:-1.1px; }
 .ps .brand-mark { width:24px; height:24px; box-shadow:none; }
 .ps .navlinks { gap:clamp(12px,1.8vw,24px); }
 .ps .navlinks button { font-size:12px; font-weight:500; }
 .ps .navlinks .current:after { height:2px; box-shadow:none; }
 .ps .navtools { gap:10px; }
 .ps .search { width:clamp(145px,17vw,220px); padding:9px 12px; border-radius:11px; }
 .ps .nav-theme { border:1px solid #ffffff14; border-radius:10px; padding:9px; }
 .ps .avatar { width:34px; height:34px; }
 .ps .atmosbar { padding-top:18px; }
 .ps .intro {
   max-width:820px; padding:clamp(54px,7vw,86px) 0 44px;
   text-align:left;
 }
 .ps .eyebrow { font-size:10px; letter-spacing:1.35px; }
 .ps :is(.intro h1,.social-heading h1,.web-intro h1,.circle-cover h1,.profile-cover h1) {
   font-size:clamp(38px,4.8vw,58px); line-height:1.08;
   letter-spacing:-.055em; margin:14px 0 14px; max-width:760px;
 }
 .ps .intro>p,.ps .social-heading>p { max-width:590px; font-size:15px; line-height:1.7; }
 .ps .finder {
   padding:clamp(22px,3vw,32px); border-radius:18px;
   background:rgba(21,28,42,.78); border:1px solid #ffffff12;
   box-shadow:0 16px 44px #00000012;
 }
 .ps .finder-head { margin-bottom:24px; }
 .ps .finder-head h2 { font-size:17px; font-weight:600; }
 .ps .finder-head p { font-size:12px; }
 .ps label { font-size:11px; font-weight:500; gap:9px; }
 .ps .finder-fields { grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
 .ps .finder-fields>.primary { grid-column:1/-1; justify-self:start; min-width:190px; margin-top:3px; }
 .ps select,.ps .browse-fields input,.ps .web-search input,.ps .search input {
   min-height:46px; border-radius:10px; padding:11px 12px;
   background:#0e1420; border-color:#ffffff16;
 }
 .ps .primary { min-height:44px; border-radius:10px; padding:12px 18px; box-shadow:none; }
 .ps .primary:hover { transform:translateY(-1px); box-shadow:none; }
 .ps .finder-social {
   display:flex; align-items:center; flex-wrap:wrap; gap:10px;
   margin-top:20px; padding-top:17px; border-top:1px solid #ffffff0d;
   font-size:11px;
 }
 .ps .finder-social button {
   padding:7px 11px; border:1px solid transparent; border-radius:8px;
   color:var(--muted); font-size:11px;
 }
 .ps .finder-social button[aria-pressed=true] {
   color:var(--text); background:#ffffff0b; border-color:#ffffff14;
 }
 .ps .finder-foot { margin-top:12px; }
 .ps .advanced,.ps .reset { font-size:11px; }
 .ps .section { padding-top:clamp(58px,7vw,82px); }
 .ps .section-head { margin-bottom:25px; }
 .ps .kicker { font-size:10px; letter-spacing:1.35px; margin-bottom:8px; }
 .ps .section-head h2,.ps :is(.side-card h2,.profile-section h2,.group-finder h2,.circle-discussion h2,.game-social h2,.web-inspector h2) {
   font-size:clamp(23px,2.5vw,30px); line-height:1.18; letter-spacing:-.04em;
 }
 .ps .section-head p { font-size:12px; line-height:1.6; }
 .ps .text-button { font-size:12px; }
 .ps .games { grid-template-columns:repeat(4,minmax(0,1fr)); gap:34px 22px; }
 .ps .game-art {
   aspect-ratio:1.72; border-radius:13px; border:1px solid #ffffff12;
   box-shadow:none;
 }
 .ps .game-art img { filter:saturate(.94); }
 .ps .save { top:10px; right:10px; width:34px; height:34px; border-radius:11px; }
 .ps .explore { opacity:1; transform:translateY(100%); transition:transform .2s ease; }
 .ps .art-button:hover .explore,.ps .art-button:focus-visible .explore { transform:translateY(0); }
 .ps .game-info { padding:13px 1px 0; }
 .ps .game-title { align-items:flex-start; }
 .ps .game-title button { font-size:14px; line-height:1.35; }
 .ps .game-title>span { font-size:12px; }
 .ps .game-info>p { font-size:11px; line-height:1.5; margin-top:6px; }
 .ps .game-meta { font-size:10px; margin:10px 0 0; }
 .ps .why { margin-top:8px; font-size:10px; }
 .ps .season-grid { gap:14px; margin-top:4px; }
 .ps .season {
   height:164px; padding:17px 18px; border-radius:14px;
   outline:1px solid #ffffff14; box-shadow:none;
 }
 .ps .season:hover { transform:translateY(-2px); }
 .ps .season-top { top:14px; left:17px; right:17px; }
 .ps .season-top>span { font-size:9px; }
 .ps .season h2 { font:600 25px 'Space Grotesk',sans-serif; letter-spacing:-.04em; }
 .ps .season .line { font-size:11px; margin-bottom:0; }
 .ps .season .tags { display:none; }
 .ps .season-bottom { margin-top:10px; padding-top:9px; font-size:10px; }
 .ps .mood-note { margin:15px 0 8px; }
 .ps .editorial { border-radius:18px; box-shadow:none; }
 .ps :is(.activity-card,.side-card,.web-rec,.circle-card,.profile-cover,.circle-cover,.web-shell,.web-filters,.member-card,.group-finder,.circle-discussion,.summary,.privacy-preview) {
   border-radius:16px; box-shadow:none; border-color:#ffffff12;
 }
 .ps .section-head[style*="margin-top: 72px"] { margin-top:clamp(54px,7vw,78px)!important; }
 .ps .veil { padding:24px; }
 .ps .modal { border-radius:18px; }
 .ps footer { margin-top:76px; }
 @media(max-width:900px) {
   .ps .wrap { padding-inline:28px; }
   .ps .nav { gap:16px; }
   .ps .navlinks { gap:13px; }
   .ps .navlinks button { font-size:11px; }
   .ps .search { width:150px; }
   .ps .games { grid-template-columns:repeat(3,minmax(0,1fr)); gap:28px 18px; }
 }
 @media(max-width:700px) {
   .ps .nav { height:66px; }
   .ps .navlinks { display:none; }
   .ps .mobile-menu { display:grid; place-items:center; }
   .ps .mobile-links { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:14px 0; }
   .ps .mobile-links button { text-align:left; padding:10px 12px; border-radius:9px; background:#ffffff08; }
   .ps .intro { padding:48px 0 34px; }
   .ps .finder-fields { grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
   .ps .finder-fields>.primary { grid-column:1/-1; width:100%; }
   .ps .season-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
   .ps .games { grid-template-columns:repeat(2,minmax(0,1fr)); }
   .ps .section { padding-top:54px; }
 }
 @media(max-width:480px) {
   .ps .wrap { padding-inline:18px; }
   .ps .nav { gap:10px; }
   .ps .brand { font-size:20px; }
   .ps .search { width:38px; padding:9px; }
   .ps .search input { font-size:12px; }
   .ps .navtools { gap:7px; }
   .ps .intro { padding:40px 0 30px; }
   .ps :is(.intro h1,.social-heading h1,.web-intro h1,.circle-cover h1,.profile-cover h1) { font-size:clamp(35px,10vw,46px); }
   .ps .intro>p { font-size:14px; }
   .ps .finder { padding:20px 16px; }
   .ps .finder-head { display:block; }
   .ps .finder-head p { margin:7px 0 0 28px; }
   .ps .finder-fields { grid-template-columns:1fr; }
   .ps .finder-fields>.primary { grid-column:auto; }
   .ps .finder-social { align-items:flex-start; }
   .ps .season { height:150px; padding:14px; }
   .ps .season h2 { font-size:22px; }
   .ps .season-top { top:12px; left:14px; right:14px; }
   .ps .season-bottom { font-size:9px; }
   .ps .games { gap:23px 12px; }
   .ps .game-art { aspect-ratio:1.42; }
   .ps .game-title button { font-size:13px; }
   .ps .game-title>span { font-size:11px; }
   .ps .game-meta { font-size:9px; }
   .ps .section-head { align-items:flex-start; gap:14px; }
   .ps .section-head h2 { font-size:24px; }
   .ps .text-button { white-space:nowrap; }
   .ps .veil { padding:12px; }
 }
 @media(prefers-reduced-motion:reduce) {
   .ps,.ps * { scroll-behavior:auto!important; transition-duration:.01ms!important; animation-duration:.01ms!important; animation-iteration-count:1!important; }
 }

 `}</style>
                <div className="wrap">
                    <header className="nav">
                        <button
                            className="brand"
                            onClick={() => nav("Discover")}
                            aria-label="Playscape home"
                        >
                            <span className="brand-mark" />
                            playscape
                        </button>
                        <nav className="navlinks" aria-label="Main navigation">
                            {["Discover", "Browse", "Wishlist", "The Web", "Community"].map((n) => (
                                <button
                                    className={isCurrent(n) ? "current" : ""}
                                    aria-current={isCurrent(n) ? "page" : undefined}
                                    onClick={() => nav(n)}
                                    key={n}
                                >
                                    {n === "Browse" ? "Store" : n}
                                    {n === "Wishlist" && saved.length > 0
                                        ? " (" + saved.length + ")"
                                        : ""}
                                </button>
                            ))}
                        </nav>
                        <div className="navtools">
                            <button
                                className="nav-theme"
                                aria-label={`Atmosphere: ${atmos}. Change`}
                                onClick={() => setPanel("Personalization")}
                            >
                                <Icon
                                    name={
                                        atmos === "Winter"
                                            ? "snow"
                                            : atmos === "Summer"
                                              ? "sun"
                                              : "leaf"
                                    }
                                    size={16}
                                />
                            </button>
                            <label
                                className="search"
                                style={{ flexDirection: "row" }}
                            >
                                <Icon name="search" size={15} />
                                <input
                                    aria-label="Search games"
                                    placeholder="Find your next game"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setActive(true)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") find()
                                    }}
                                />
                            </label>
                            <button
                                className="avatar"
                                aria-label="Open your player profile"
                                onClick={() => nav("Profile")}
                            >
                                SC
                            </button>
                            <button
                                className="mobile-menu"
                                aria-label="Toggle navigation"
                                aria-expanded={menu}
                                onClick={() => setMenu(!menu)}
                            >
                                <Icon name="menu" />
                            </button>
                        </div>
                    </header>
                    {menu && (
                        <nav className="mobile-links">
                            {[
                                "Discover",
                                "Browse",
                                "The Web",
                                "Community",
                                "Gaming Circles",
                                "Wishlist",
                                "Profile",
                                "Personalization",
                            ].map((n) => (
                                <button key={n} onClick={() => nav(n)}>
                                    {n === "Browse" ? "Store" : n}
                                </button>
                            ))}
                        </nav>
                    )}
                    {["Community", "Gaming Circles", "Profile"].includes(
                        view
                    ) && (
                        <nav
                            className="social-destinations"
                            aria-label="Community destinations"
                        >
                            {["Community", "Gaming Circles", "Profile"].map(
                                (v) => (
                                    <button
                                        key={v}
                                        aria-current={
                                            view === v ? "page" : undefined
                                        }
                                        onClick={() => changeView(v)}
                                    >
                                        {v === "Profile" ? "Your profile" : v}
                                    </button>
                                )
                            )}
                        </nav>
                    )}
                    <main
                        id="discover-content"
                        style={{
                            display: view !== "Discover" ? "none" : undefined,
                        }}
                    >
                        <section className="intro">
                            <div className="eyebrow">
                                <Icon name="spark" size={12} /> Less searching.
                                More discovering.
                            </div>
                            <h1>{title}</h1>
                            <p>
                                Find your next favorite game based on the
                                experience you’re looking for.
                            </p>
                        </section>
                        <section
                            className="finder"
                            aria-label="Experience finder"
                        >
                            <div className="finder-head">
                                <h2>
                                    <Icon name="sliders" size={18} /> Your next
                                    great experience
                                </h2>
                                <p>
                                    A few little details. A much better match.
                                </p>
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
                                <button className="primary" onClick={find}>
                                    Find my experience
                                    <Icon name="arrow" size={17} />
                                </button>
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
                                    My preferences + my people
                                </button>
                            </div>
                            <div className="finder-foot">
                                <button
                                    className="advanced"
                                    onClick={() =>
                                        setPanel(
                                            panel === "advanced"
                                                ? ""
                                                : "advanced"
                                        )
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
                                                <option value="">
                                                    Any {k.toLowerCase()}
                                                </option>
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
                                            ? "Made for this moment"
                                            : "A little more you"}
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
                                            : "Unhurried adventures. Unexpected favorites. A good place to start."}
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
                                            No exact matches this time. Try a
                                            different mood or a little more
                                            flexibility.
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
                                <div className="kicker">Or start from a feeling</div>
                                <h2>Pick a season, see what fits</h2>
                            </div>
                        </div>
                        <section
                            aria-label="Choose your discovery mood"
                            className="season-grid"
                        >
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
                                    <img
                                        src={steam(s.id)}
                                        alt=""
                                        loading="eager"
                                    />
                                    <div className="season-top">
                                        <Icon name={s.symbol} size={25} />
                                        {mood === s.name && (
                                            <span>YOUR DISCOVERY</span>
                                        )}
                                    </div>
                                    <h2>{s.name}</h2>
                                    <p className="line">{s.line}</p>
                                    <p className="tags">{s.tags}</p>
                                    <div className="season-bottom">
                                        <span>
                                            {mood === s.name ? (
                                                <>
                                                    <Icon
                                                        name="check"
                                                        size={12}
                                                    />
                                                    Selected mood
                                                </>
                                            ) : (
                                                "Explore this feeling"
                                            )}
                                        </span>
                                        <Icon name="arrow" size={17} />
                                    </div>
                                </button>
                            ))}
                        </section>
                        <section className="editorial">
                            <div>
                                <div className="kicker">
                                    The slow-play collection / 01
                                </div>
                                <h2>
                                    Some worlds are worth
                                    <br />
                                    slowing down for.
                                </h2>
                                <p>
                                    Step off the beaten path. Discover small
                                    adventures that leave a lasting impression.
                                </p>
                                <button
                                    onClick={() => {
                                        setPrefs({ ...prefs, Mood: "Relaxing" })
                                        setMood("Spring")
                                        find()
                                    }}
                                >
                                    Find your quiet corner
                                    <Icon name="arrow" size={16} />
                                </button>
                            </div>
                        </section>
                        <CommunityPreview />
                    </main>
                    {view === "Browse" && (
                        <main className="browse-page">
                            <section className="intro">
                                <div className="eyebrow">
                                    <Icon name="search" size={12} /> The full collection
                                </div>
                                <h1>Find your next world.</h1>
                                <p>Explore the catalog by genre, platform, or simply search for something that catches your eye.</p>
                            </section>
                            <section className="finder browse-controls" aria-label="Browse catalog filters">
                                <div className="finder-head">
                                    <h2><Icon name="sliders" size={18} /> Browse the collection</h2>
                                    <p>{browseResults.length} {browseResults.length === 1 ? "game" : "games"} in this view</p>
                                </div>
                                <div className="finder-fields browse-fields">
                                    <label>
                                        Search games
                                        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, stories, genres…" aria-label="Search catalog" />
                                    </label>
                                    <label>
                                        Genre
                                        <select value={browseGenre} onChange={(event) => setBrowseGenre(event.target.value)} aria-label="Filter by genre">
                                            <option value="">All genres</option>
                                            {browseGenres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                                        </select>
                                    </label>
                                    <label>
                                        Platform
                                        <select value={browsePlatform} onChange={(event) => setBrowsePlatform(event.target.value)} aria-label="Filter by platform">
                                            <option value="">All platforms</option>
                                            {Array.from(new Set(data.flatMap((game) => game.platforms))).sort().map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                                        </select>
                                    </label>
                                    <label>
                                        Sort by
                                        <select value={browseSort} onChange={(event) => setBrowseSort(event.target.value)} aria-label="Sort games">
                                            <option value="featured">Featured order</option>
                                            <option value="title">Title A–Z</option>
                                            <option value="price-low">Price: low to high</option>
                                            <option value="price-high">Price: high to low</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="finder-foot">
                                    <span className="summary">Filters and search are applied to the shared game catalog.</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                        <button
                                            className="text-button"
                                            onClick={() => {
                                                setActive(Boolean(query || browseGenre || browsePlatform))
                                                changeView("Discover")
                                            }}
                                        >
                                            Use in Discover
                                            <Icon name="arrow" size={15} />
                                        </button>
                                        <button className="reset" onClick={() => { setQuery(""); setBrowseGenre(""); setBrowsePlatform(""); setBrowseSort("featured") }}>Clear browse filters</button>
                                    </div>
                                </div>
                            </section>
                            <section className="section" aria-live="polite">
                                <div className="section-head">
                                    <div>
                                        <div className="kicker">The PLAYSCAPE catalog</div>
                                        <h2>{query ? `Results for “${query}”` : browseGenre || "Every possibility"}</h2>
                                        <p>{browseResults.length} matches · Sample prices in USD</p>
                                    </div>
                                </div>
                                <div className="games">
                                    {browseResults.length ? browseResults.map(card) : (
                                        <div className="empty">
                                            <p>No games match those filters. Try another genre or platform.</p>
                                            <button className="primary" style={{ marginTop: 18 }} onClick={() => { setQuery(""); setBrowseGenre(""); setBrowsePlatform("") }}>Show all games</button>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </main>
                    )}
                    {view === "Wishlist" && (
                        <main className="social-page">
                            <section className="social-heading">
                                <div className="kicker">Your library</div>
                                <h1>Wishlist / saved worlds.</h1>
                                <p>
                                    Your shortlist is a personal catalog: a place to keep the games you want to revisit, compare, and share with your friends.
                                </p>
                                <div className="social-heading-actions">
                                    <button className="primary" onClick={() => changeView("Browse")}>
                                        Browse the catalog
                                        <Icon name="arrow" size={15} />
                                    </button>
                                    <button
                                        className="text-button"
                                        onClick={() =>
                                            social.setDialog({
                                                type: "shareWishlist",
                                            })
                                        }
                                    >
                                        Share this wishlist
                                        <Icon name="arrow" size={15} />
                                    </button>
                                </div>
                            </section>
                            <section className="community-layout">
                                <div>
                                    <WishlistSocial />
                                    <div className="games" style={{ marginTop: 20 }}>
                                        {wishlistSummary.savedGames.length ? (
                                            wishlistSummary.savedGames.map(card)
                                        ) : (
                                            <div className="empty">
                                                <p>No saved games yet. Save a title with the heart button to start your personal library.</p>
                                                <button className="primary" style={{ marginTop: 18 }} onClick={() => changeView("Browse")}>
                                                    Explore the catalog
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <aside className="community-sidebar">
                                    <div className="side-card">
                                        <div className="kicker">Saved list</div>
                                        <h2>{wishlistSummary.totalSaved} games</h2>
                                        <div className="summary">
                                            {wishlistSummary.totalSaved === 0
                                                ? "Your wishlist is empty. Start by saving games you want to revisit."
                                                : `You’ve saved ${wishlistSummary.totalSaved} games across your personal catalog.`}
                                        </div>
                                    </div>
                                    <div className="side-card">
                                        <div className="kicker">Overlap</div>
                                        <h2>Shared with friends</h2>
                                        {wishlistSummary.overlaps.length ? (
                                            wishlistSummary.overlaps.map((person) => (
                                                <button
                                                    key={person.id}
                                                    className="circle-mini"
                                                    style={{ width: "100%", display: "flex", justifyContent: "space-between" }}
                                                    onClick={() => changeView("Profile", person.id)}
                                                >
                                                    <span>
                                                        <strong>{person.name}</strong>
                                                        <small>{person.sharedCount} shared picks</small>
                                                    </span>
                                                    <span className="social-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                                                        {person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                                                    </span>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="social-muted">No overlaps yet. Save a few games and see which friends match your taste.</p>
                                        )}
                                    </div>
                                </aside>
                            </section>
                        </main>
                    )}
                    <div
                        style={{
                            display: view === "The Web" ? "block" : "none",
                        }}
                    >
                        <SocialWeb
                            games={data}
                            saved={saved}
                            toggle={toggle}
                            openGame={openGame}
                        />
                    </div>
                    {view === "Community" && <CommunityPage />}
                    {view === "Profile" && (
                        <PlayerProfile key={profileId} id={profileId} />
                    )}
                    <div
                        style={{
                            display:
                                view === "Gaming Circles" ? "block" : "none",
                        }}
                    >
                        <CirclePage key={circleId} id={circleId} />
                    </div>
                    <footer>
                        <button
                            className="brand"
                            onClick={() => nav("Discover")}
                        >
                            playscape
                        </button>
                        <span>A world for every kind of player.</span>
                        <span>
                            {view === "The Web"
                                ? "THE WEB · SOCIAL DISCOVERY"
                                : "PLAYSCAPE · COMMUNITY PROTOTYPE"}
                        </span>
                    </footer>
                </div>
                {panel && panel !== "advanced" && (
                    <div className="veil" onClick={() => setPanel("")}>
                        <section
                            className="modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label={panel}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setPanel("")
                            }}
                        >
                            <div className="modal-head">
                                <h2>
                                    {panel === "Personalization"
                                        ? "Make yourself at home."
                                        : panel}
                                </h2>
                                <button
                                    className="icon-button"
                                    aria-label="Close dialog"
                                    autoFocus
                                    onClick={() => setPanel("")}
                                >
                                    <Icon name="close" />
                                </button>
                            </div>
                            {panel === "Personalization" ? (
                                <>
                                    <p>
                                        One Playscape. Four different feelings.
                                        Change your surroundings without
                                        changing your discoveries.
                                    </p>
                                    <div className="theme-grid">
                                        {seasons.map((s) => (
                                            <button
                                                className={
                                                    "theme-choice " +
                                                    s.name.toLowerCase()
                                                }
                                                key={s.name}
                                                onClick={() =>
                                                    changeAtmos(s.name)
                                                }
                                                aria-pressed={atmos === s.name}
                                            >
                                                <Icon name={s.symbol} />
                                                <strong>
                                                    {s.name}
                                                    {atmos === s.name
                                                        ? " · Active"
                                                        : ""}
                                                </strong>
                                                <small>{s.tags}</small>
                                            </button>
                                        ))}
                                    </div>
                                    <label
                                        className="setting"
                                        style={{ flexDirection: "row" }}
                                    >
                                        <span>
                                            Follow the calendar automatically
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={auto}
                                            onChange={(e) => {
                                                const v = e.target.checked
                                                setAuto(v)
                                                let a = atmos
                                                if (v) {
                                                    const m =
                                                        new Date().getMonth()
                                                    a =
                                                        m >= 2 && m <= 4
                                                            ? "Spring"
                                                            : m >= 5 && m <= 7
                                                              ? "Summer"
                                                              : m >= 8 &&
                                                                  m <= 10
                                                                ? "Autumn"
                                                                : "Winter"
                                                    setAtmos(a)
                                                }
                                                persist(a, saved, v)
                                            }}
                                        />
                                    </label>
                                    <div className="summary">
                                        Visual atmosphere:{" "}
                                        <strong>{atmos}</strong> · Discovery
                                        mood: <strong>{mood}</strong>
                                        <br />
                                        Your atmosphere is remembered on this
                                        browser. Your finder preferences stay
                                        independent.
                                    </div>
                                    <button
                                        className="text-button"
                                        style={{ marginTop: 18 }}
                                        onClick={() => {
                                            changeAtmos("Autumn")
                                            setMood("Spring")
                                        }}
                                    >
                                        Restore default atmosphere & mood
                                    </button>
                                </>
                            ) : panel === "Wishlist" ? (
                                <>
                                    <p>
                                        Your saved worlds, all in one place.
                                        Saved on this browser.
                                    </p>
                                    <WishlistSocial />
                                    <div className="games">
                                        {data
                                            .filter((g) => saved.includes(g.id))
                                            .map(card)}
                                        {!saved.length && (
                                            <div className="empty">
                                                A new adventure is waiting. Save
                                                a game using its heart button.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : panel === "Friends’ picks" ? (
                                <>
                                    <p>
                                        Sample friend recommendations to spark
                                        your next discovery.
                                    </p>
                                    <div className="summary">
                                        Jamie recommends A Short Hike for a
                                        peaceful evening. Alex is building a
                                        co-op farm in Stardew Valley.
                                    </div>
                                    <div
                                        className="games"
                                        style={{ marginTop: 20 }}
                                    >
                                        {data
                                            .filter((g) =>
                                                [1055540, 413150].includes(g.id)
                                            )
                                            .map(card)}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p>
                                        The Web is the next chapter: explore the
                                        connections between friends, games, and
                                        shared interests.
                                    </p>
                                    <div className="summary">
                                        This first stage focuses on Discover and
                                        Atmospheres. The interactive social
                                        network will follow in the next stage.
                                    </div>
                                    <button
                                        className="primary"
                                        style={{ marginTop: 20 }}
                                        onClick={() =>
                                            setPanel("Friends’ picks")
                                        }
                                    >
                                        Explore sample friends’ picks
                                    </button>
                                </>
                            )}
                        </section>
                    </div>
                )}
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
                {detailGame && (
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
                                    onClick={() => toggle(detailGame.id)}
                                >
                                    <Icon
                                        name={
                                            saved.includes(detailGame.id)
                                                ? "check"
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
                            <GameSocial id={detailGame.id} />
                        </section>
                    </div>
                )}
                <SocialDialog
                    key={
                        social.dialog ? JSON.stringify(social.dialog) : "closed"
                    }
                />
                {social.message && (
                    <div role="status" className="toast">
                        {social.message}
                    </div>
                )}
            </div>
        </CommunityContext.Provider>
    )
}
