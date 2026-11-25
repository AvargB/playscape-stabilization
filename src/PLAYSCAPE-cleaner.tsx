/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "./components/Icon"
import {
    buildFriendGameSignals,
    buildWishlistRecommendations,
    buildWishlistSummary,
    filterGames,
    gameCatalog,
    resolveGameRecord,
    searchGames,
    sortGames,
    type GameRecord,
} from "./data/games"
import {
    loadAppState,
    saveAppState,
    useSocialState,
    type SocialPrivacy,
} from "./social"
import {
    initialCircles,
    socialPeople,
} from "./socialData"
import { AppLayout } from "./components/layout/AppLayout"
import { PageContainer } from "./components/layout/PageContainer"
import type { NavigationDestination } from "./components/navigation/NavigationItem"
import Discover from "./features/discover"
import Browse from "./features/browse"
import GameDetails from "./features/game-details"
import Wishlist from "./features/wishlist"
import Community from "./features/community"
import Profiles from "./features/profiles"
import GamingCircles from "./features/circles"
import TheWeb from "./features/the-web"
import ComparePage from "./features/compare"
import {
    addGameToComparison,
    clearComparison,
    removeGameFromComparison,
} from "./features/compare/utils"
import { loadComparisonState, saveComparisonState } from "./features/compare/storage"
import { useReviews } from "./features/reviews"
import {
    CheckoutDialog,
    createSessionId,
    useCheckout,
    type CheckoutSession,
    type GiftDecision,
    type PurchaseType,
    useCart,
} from "./features/checkout"
import { GameMediaPreview } from "./features/media"

const steam = (id: number) =>
    "https://cdn.akamai.steamstatic.com/steam/apps/" + id + "/header.jpg"
const seasons = [
    {
        name: "Summer",
        line: "Action and multiplayer",
        tags: "Energetic · Social · Playful",
        id: 1172620,
        color: "#f4c267",
        symbol: "sun",
        mood: "Exciting",
        images: [1172620, 1145360, 39210],
        description: "Social adventures, multiplayer worlds, and energetic action.",
    },
    {
        name: "Spring",
        line: "Creative and relaxing",
        tags: "Relaxing · Creative · Exploratory",
        id: 413150,
        color: "#b8d8a1",
        symbol: "flower",
        mood: "Relaxing",
        images: [413150, 1055540, 747200],
        description: "Creative life sims, gentle exploration, and cozy escapes.",
    },
    {
        name: "Autumn",
        line: "Narrative and exploration",
        tags: "Immersive · Thoughtful · Nostalgic",
        id: 383870,
        color: "#dda879",
        symbol: "leaf",
        mood: "Story-driven",
        images: [383870, 972660, 219760],
        description: "Atmospheric stories, thoughtful choices, and rich worlds.",
    },
    {
        name: "Winter",
        line: "Strategy and survival",
        tags: "Focused · Strategic · Atmospheric",
        id: 323190,
        color: "#b7d7e7",
        symbol: "snow",
        mood: "Challenging",
        images: [323190, 504230, 1030300],
        description: "Strategic survival, precision challenges, and dark worlds.",
    },
]
const seasonForCurrentMonth = () => {
    const month = new Date().getMonth()
    if (month >= 2 && month <= 4) return "Spring"
    if (month >= 5 && month <= 7) return "Summer"
    if (month >= 8 && month <= 10) return "Autumn"
    return "Winter"
}

const CommunityContext = React.createContext<any>(null)
const useSocial = () => React.useContext(CommunityContext)
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
                    name={c.saved.includes(id) ? "heart-filled" : "heart"}
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
                <span className="activity-art-wrap">
                    <button
                        className="activity-art"
                        onClick={() => c.openGame(g)}
                        aria-label={"Explore " + g.title}
                    >
                        <img src={steam(g.id)} alt={g.title + " artwork"} />
                    </button>
                    <GameMediaPreview
                        game={g}
                        hostSelector=".activity-art-wrap"
                    />
                </span>
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
                    <Icon
                        name={reacted ? "heart-filled" : "heart"}
                        size={14}
                    />
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
                    aria-pressed={c.saved.includes(g.id)}
                    aria-label={
                        (c.saved.includes(g.id) ? "Remove from" : "Add to") +
                        " wishlist"
                    }
                    onClick={() => c.toggle(g.id)}
                >
                    <Icon
                        name={c.saved.includes(g.id) ? "heart-filled" : "heart"}
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
                        A little inspiration from your friends
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
function SocialDialog() {
    const c = useSocial(),
        d = c.dialog,
        [text, setText] = React.useState(""),
        [game, setGame] = React.useState(String(d?.game || 413150)),
        [recipient, setRecipient] = React.useState(d?.recipient || "jamie"),
        [friend, setFriend] = React.useState("jamie"),
        [privacyDraft, setPrivacyDraft] = React.useState<SocialPrivacy>(c.state.privacy)
    const circle = c.state.circles.find((x: any) => x.id === d?.circle)
    const inviteSuggestions = d?.type === "invite" && circle
        ? c.getInviteSuggestions(circle.id)
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
        let succeeded = true
        if (d.type === "createCircle") {
            const id = c.createCircle(text)
            if (!id) succeeded = false
            else c.go("Gaming Circles", id)
        } else if (d.type === "invite") {
            succeeded = c.inviteToCircle(d.circle, friend)
        } else if (d.type === "circleGame") {
            if (!circle?.joined) {
                c.setMessage("Join this Gaming Circle before adding a game.")
                succeeded = false
            } else if (circle.wishlist.includes(Number(game))) {
                c.setMessage("This game is already in the circle’s shared wishlist.")
            } else {
                succeeded = c.shortlist(d.circle, Number(game))
            }
        } else if (d.type === "privacy") {
            c.setPrivacy(privacyDraft)
        } else if (d.type === "shareWishlist") {
            if (!c.saved.length) {
                c.setMessage("Save a game before sharing your wishlist.")
                succeeded = false
            } else {
                succeeded = c.shareWishlist(recipient, [...c.saved])
            }
        } else if (d.type === "recommend") {
            succeeded = c.recommend(Number(game), recipient, text)
        }
        if (succeeded) c.setDialog(null)
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
                                        value={privacyDraft[k]}
                                        onChange={(e) =>
                                            setPrivacyDraft({
                                                ...privacyDraft,
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
                                    {c.getInviteSuggestions(circle.id)
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
    const data = games?.length ? games : gameCatalog
    const comparisonHydration = React.useMemo(() => loadComparisonState(data), [data])
    const appHydration = React.useMemo(() => {
        const prefs = loadAppState(data)
        return prefs.auto ? { ...prefs, atmos: seasonForCurrentMonth() } : prefs
    }, [data])
    const [atmos, setAtmos] = React.useState(appHydration.atmos),
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
        [saved, setSaved] = React.useState<number[]>(appHydration.saved),
        [compareIds, setCompareIds] = React.useState<number[]>(
            comparisonHydration.selectedGameIds
        ),
        [auto, setAuto] = React.useState(appHydration.auto),
        [menu, setMenu] = React.useState(false),
        [notice, setNotice] = React.useState(""),
        [checkoutIds, setCheckoutIds] = React.useState<number[]>([]),
        [checkoutSessionId, setCheckoutSessionId] = React.useState<string | null>(null),
        [checkoutType, setCheckoutType] = React.useState<PurchaseType>("personal"),
        [checkoutFromCart, setCheckoutFromCart] = React.useState(false)
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
        compare: "Compare",
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
            Compare: "compare",
        }
        if (typeof window !== "undefined")
            window.location.hash =
                (routes[v] || "discover") + (id ? "/" + id : "")
    }
    const isCurrent = (n: string) =>
        n === view ||
        (n === "Community" &&
            ["The Web", "Gaming Circles"].includes(view)) ||
        (n === "Browse" && view === "Compare")
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
    function persist(a: string, s: number[], v: boolean) {
        saveAppState({ atmos: a, saved: s, auto: v })
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
    const comparisonReady = React.useRef(false)
    React.useEffect(() => {
        if (!comparisonHydration.canPersist) return
        if (!comparisonReady.current) {
            comparisonReady.current = true
            return
        }
        saveComparisonState(compareIds, data)
    }, [compareIds, comparisonHydration.canPersist, data])
    function addToCompare(id: number) {
        const result = addGameToComparison(id, compareIds)
        if (!result.success) {
            setNotice(result.error || "This game is already in the comparison.")
            return
        }
        setCompareIds(result.newIds)
        setNotice("")
    }
    function removeFromCompare(id: number) {
        setCompareIds((current) => removeGameFromComparison(id, current))
    }
    function resetComparison() {
        setCompareIds(clearComparison())
        setNotice("")
    }
    function toggleCompare(id: number) {
        if (compareIds.includes(id)) removeFromCompare(id)
        else addToCompare(id)
    }
    function openGame(game: GameRecord | number | null | undefined) {
        const nextId = resolveGameRecord(game, data)?.id ?? null
        setDetail(nextId)
    }
    function openCheckout(
        game: GameRecord | number | null | undefined,
        type: PurchaseType = "personal",
    ) {
        const resolved = resolveGameRecord(game, data)
        if (!resolved) {
            setNotice("That game is no longer available in this prototype catalog.")
            return
        }
        setDetail(null)
        setCheckoutType(type)
        setCheckoutFromCart(false)
        setCheckoutSessionId(createSessionId())
        setCheckoutIds([resolved.id])
    }
    function openCartCheckout() {
        if (!cart.gameIds.length) {
            setNotice("Your prototype cart is empty. Add a game from its details or checkout screen.")
            return
        }
        setDetail(null)
        setCheckoutType("personal")
        setCheckoutFromCart(true)
        setCheckoutSessionId(createSessionId())
        setCheckoutIds(cart.gameIds)
    }
    function closeCheckout() {
        setCheckoutIds([])
        setCheckoutSessionId(null)
        setCheckoutFromCart(false)
    }
    function addToCart(id: number) {
        if (cart.gameIds.includes(id)) {
            setNotice("This game is already in your prototype cart.")
            return
        }
        cart.add(id)
        setNotice("Added to your prototype cart. No purchase was made.")
    }
    function removeFromCart(id: number) {
        const next = cart.gameIds.filter((entry) => entry !== id)
        cart.remove(id)
        setCheckoutIds(next)
        if (!next.length) closeCheckout()
    }
    function clearCartItems() {
        cart.clear()
        closeCheckout()
        setNotice("Prototype cart cleared.")
    }
    function completeCheckout(session: CheckoutSession) {
        const result = checkoutState.completeCheckout(session)
        if (result.ok === false) {
            setNotice(result.errors[0] || "This simulated checkout could not be completed.")
            return result
        }
        if (checkoutFromCart) cart.clear()
        setNotice(
            session.purchaseType === "gift"
                ? "Prototype gift sent. No payment, delivery, or notification occurred."
                : "Prototype checkout complete. No purchase was made."
        )
        return result
    }
    function respondToGift(id: string, decision: GiftDecision) {
        const result = checkoutState.respondToGift(id, decision)
        if (result.ok === false) {
            setNotice(result.errors[0] || "This gift response could not be saved.")
            return result
        }
        setNotice(
            decision === "accepted"
                ? "Prototype gift accepted. No game license was delivered."
                : "Prototype gift declined. The historical record was kept."
        )
        return result
    }
    const wishlistSummary = React.useMemo(
        () => buildWishlistSummary(saved, socialPeople, data),
        [saved, data],
    )
    React.useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(() => setNotice(""), 2800)
        return () => window.clearTimeout(timer)
    }, [notice])
    const social = useSocialState(
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
    const reviewState = useReviews({ games: data, savedIds: saved })
    const checkoutState = useCheckout({ games: data })
    const cart = useCart({ games: data })
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
    function nav(n: string) {
        if (["The Web", "Community", "Gaming Circles", "Profile", "Discover", "Browse", "Wishlist", "Compare"].includes(n)) {
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
                <GameMediaPreview game={g} />
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
                    <Icon name={compareIds.includes(g.id) ? "check" : "sliders"} size={14} />
                    <span>{compareIds.includes(g.id) ? "Comparing" : "Compare"}</span>
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
                    <div className="game-meta-group" role="group" aria-label="Player modes">
                        {g.playerModes.map((mode) => (
                            <span className="game-meta-chip" key={mode}>
                                {mode}
                            </span>
                        ))}
                    </div>
                    <div className="game-meta-group game-platforms" role="group" aria-label="Available platforms">
                        {g.platforms.map((platform) => (
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
                <button
                    className="web-secondary card-checkout"
                    onClick={() => openCheckout(g.id)}
                    aria-label={"Start simulated checkout for " + g.title}
                >
                    Checkout
                </button>
            </div>
        </article>
    )
    return (
        <CommunityContext.Provider
            value={{ ...social, initialCircleTab, webFocus, activeView: view }}
        >
            <div
                className={
                    "ps " +
                    atmos.toLowerCase() +
                    (view === "The Web" ? " web-view" : "")
                }
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
 @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
 .ps{--bg:#111a17;--surface:#1a2420;--text:#f2f0e7;--muted:#aab5aa;--line:#34413a;--accent:#d6e7b8;--ink:#18231b;--radius:10px;--heading:'Cormorant Garamond',Georgia,serif;color:var(--text);background:var(--bg);font-family:Inter,sans-serif;font-size:14px;line-height:1.5;width:100%;min-height:100vh;transition:background .4s,color .4s;overflow:hidden}
 .ps *{box-sizing:border-box}.ps button,.ps input,.ps select{font:inherit}.ps button{cursor:pointer}.ps button,.ps a,.ps input,.ps select{outline-offset:5px}.ps :focus-visible{outline:2px solid var(--accent)}.ps button{color:inherit}.ps button{border:0;background:none}.ps h1,.ps h2,.ps h3,.ps p{margin:0}.ps svg{flex-shrink:0}.ps a{color:inherit}.ps .wrap{width:100%;max-width:1440px;margin:auto;padding:0 52px;min-height:100vh;display:flex;flex-direction:column}.ps .app-content{flex:1 0 auto;min-width:0}
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
 .ps .bottom{padding:38px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);gap:20px}.ps .bottom h2{font:500 26px var(--heading)}.ps .bottom p{font-size:11px;color:var(--muted);margin-top:4px}.ps .people{display:flex;align-items:center;gap:11px}.ps .faces{display:flex;padding-left:8px}.ps .faces span{width:32px;height:32px;border-radius:50%;border:2px solid var(--bg);margin-left:-8px;display:grid;place-items:center;font-size:10px;color:#1e3428;background:#b4c6a4}.ps .faces span:nth-child(2){background:#dcc9b6}.ps .faces span:nth-child(3){background:#b4c2d6}.ps .global-footer{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:clamp(16px,3vw,48px);padding:22px 0 26px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.ps .global-footer-disclaimer{justify-self:start;max-width:420px;line-height:1.6;font-size:11px;color:var(--muted)}.ps .global-footer-logo{justify-self:center;display:grid;place-items:center;padding:0 10px;border-radius:10px;line-height:1}.ps .global-footer-logo .brand-mark{width:30px;height:30px;box-shadow:none;transition:transform .18s ease,box-shadow .18s ease}.ps .global-footer-logo:hover .brand-mark,.ps .global-footer-logo:focus-visible .brand-mark{transform:rotate(-12deg) translateY(-2px);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 24%,transparent),0 0 20px color-mix(in srgb,var(--accent) 32%,transparent)}.ps .global-footer-title{justify-self:end;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600;letter-spacing:.14em;color:var(--text)}@media(max-width:1100px){.ps .global-footer-disclaimer{max-width:320px;font-size:10px}.ps .global-footer-title{font-size:11px}}@media(max-width:800px){.ps .global-footer{column-gap:10px;padding:18px 0 20px;font-size:9px}.ps .global-footer-disclaimer{max-width:none;font-size:9px;line-height:1.45;overflow-wrap:anywhere}.ps .global-footer-logo{padding:0 5px}.ps .global-footer-logo .brand-mark{width:24px;height:24px}.ps .global-footer-title{font-size:9px;letter-spacing:.1em}}
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
  .ps .compare-card{position:absolute;left:9px;top:9px;bottom:auto;display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:6px;background:#13211ccc;color:#fff;font-size:10px;font-weight:600;backdrop-filter:blur(5px)}
  .ps .compare-card.selected{background:var(--accent);color:var(--ink)}
.ps.autumn{--bg:var(--ps-AutumnBackground,var(--token-pEg3QnG6_,#111a17));--surface:var(--ps-AutumnSurface,var(--token-gAC6Jk_Zd,#1a2420));--text:var(--ps-AutumnText,var(--token-qoUM4MCZW,#f2f0e7));--muted:var(--ps-AutumnMuted,var(--token-OgU5QKno6,#aab5aa));--line:var(--ps-AutumnBorder,var(--token-bBlvFUsdn,#34413a));--accent:var(--ps-AutumnAccent,var(--token-EzqfK39pf,#d6e7b8));--ink:var(--ps-AutumnOnAccent,var(--token-ppHAco4EE,#18231b));}
.ps.summer{--bg:var(--ps-SummerBackground,var(--token-pNlLshm2W,#fff7e8));--surface:var(--ps-SummerSurface,var(--token-rczGRbL0V,#ffedcf));--text:var(--ps-SummerText,var(--token-bqf3Htfos,#292219));--muted:var(--ps-SummerMuted,var(--token-hUbQef9Kp,#665b48));--line:var(--ps-SummerBorder,var(--token-hqFYESDNJ,#ddc9a8));--accent:var(--ps-SummerAccent,var(--token-eQ2jAS_1u,#ed653e));--ink:var(--ps-SummerOnAccent,var(--token-bjyznlgH9,#ffffff));}
.ps.spring{--bg:var(--ps-SpringBackground,var(--token-ZneZSJH11,#f2f5e9));--surface:var(--ps-SpringSurface,var(--token-O4cu5WWyz,#e8efdd));--text:var(--ps-SpringText,var(--token-fEwuX8Qlm,#243f34));--muted:var(--ps-SpringMuted,var(--token-U6o_jDhB7,#5a6e5a));--line:var(--ps-SpringBorder,var(--token-ZvRGbP63a,#cbd7bf));--accent:var(--ps-SpringAccent,var(--token-Ad0eP42pg,#3e674a));--ink:var(--ps-SpringOnAccent,var(--token-oQN_KdHbe,#ffffff));}
.ps.winter{--bg:var(--ps-WinterBackground,var(--token-GXBFylioX,#101821));--surface:var(--ps-WinterSurface,var(--token-VY2_Csgps,#192530));--text:var(--ps-WinterText,var(--token-vTOmfB0Pl,#e8f0f6));--muted:var(--ps-WinterMuted,var(--token-KvbE9DelC,#a8bccb));--line:var(--ps-WinterBorder,var(--token-jXJXMiOeK,#354653));--accent:var(--ps-WinterAccent,var(--token-XV21F2PDT,#bdd9ed));--ink:var(--ps-WinterOnAccent,var(--token-yiedWUFhA,#142430));}

 .ps .web-page{padding-top:38px}.ps .web-intro{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:0 0 30px}.ps .web-intro h1{font-size:57px;margin:7px 0 10px;letter-spacing:-1.6px}.ps .web-intro p{font-size:12px;color:var(--muted)}.ps .web-live{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:8px;letter-spacing:1px;white-space:nowrap}.ps .web-toolbar{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:18px}.ps .web-filters{display:flex;gap:5px;background:var(--surface);padding:5px;border:1px solid var(--line);border-radius:30px}.ps .web-filters button{font-size:10px;padding:8px 17px;border-radius:25px;color:var(--muted);min-height:35px}.ps .web-filters button[aria-pressed=true]{background:var(--accent);color:var(--ink)}.ps .web-search{display:flex;flex-direction:row;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:9px 0;width:185px}.ps .web-search input{border:0;background:none;outline:none;color:var(--text);font-size:11px;width:100%;min-width:0}.ps .web-search input::placeholder{color:var(--muted)}.ps .web-shell{display:grid;grid-template-columns:minmax(0,1fr) 284px;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--bg)}.ps .web-network{min-width:0;position:relative;background-image:radial-gradient(var(--line) .7px,transparent .7px);background-size:23px 23px;display:flex;flex-direction:column}.ps .network-caption{display:flex;justify-content:space-between;padding:22px 23px 0;font-size:8px;letter-spacing:1.3px;color:var(--muted);gap:10px}.ps .graph-stage{height:600px;width:100%;touch-action:none;cursor:grab;overflow:hidden}.ps .graph-stage:active{cursor:grabbing}.ps .web-node{transition:opacity .2s}.ps .web-node:hover>circle,.ps .web-node:focus-visible>circle,.ps .web-node:focus-visible>rect,.ps .web-node:hover>rect{stroke:var(--accent);stroke-width:3px}.ps .network-bottom{display:flex;align-items:center;justify-content:space-between;padding:0 19px;gap:10px;margin-top:auto}.ps .web-legend{display:flex;gap:13px;font-size:8px;color:var(--muted)}.ps .web-legend span{display:flex;align-items:center;gap:5px}.ps .web-legend i{display:block;border:1px solid var(--muted);width:7px;height:7px}.ps .legend-friend{border-radius:50%;background:var(--muted)}.ps .legend-game{border-radius:1px}.ps .legend-interest{transform:rotate(45deg)}.ps .zoom-controls{display:flex;align-items:center;gap:0;background:var(--surface);border:1px solid var(--line);border-radius:5px}.ps .zoom-controls button{height:34px;width:34px;display:grid;place-items:center;font-size:18px}.ps .zoom-controls span{font-size:9px;padding:0 4px;min-width:32px;text-align:center}.ps .zoom-controls button:last-child{border-left:1px solid var(--line);margin-left:3px}.ps .graph-help{font-size:8px;color:var(--muted);padding:17px 20px 20px;text-align:center}.ps .web-inspector{border-left:1px solid var(--line);padding:24px 23px;background:var(--surface)}.ps .inspector-symbol{margin:25px auto 17px;border:1px solid var(--accent);outline:1px solid var(--line);outline-offset:7px;width:65px;height:65px;border-radius:50%;display:grid;place-items:center;font-size:25px;color:var(--accent);background:var(--bg);font-family:var(--heading)}.ps .inspector-symbol.interest{border-radius:20px}.ps .inspector-type{font-size:9px;color:var(--muted);text-align:center;margin-top:13px}.ps .web-inspector h2{text-align:center;font:500 30px/1.2 var(--heading);margin:7px 0 12px}.ps .web-inspector>p{font-size:11px;color:var(--muted);line-height:1.7;text-align:center}.ps .connection-reason{display:flex;align-items:flex-start;gap:9px;padding:15px 0;margin:14px 0 5px;border-top:1px solid var(--line);font-size:10px;line-height:1.8;color:var(--muted)}.ps .connection-reason svg{color:var(--accent);margin-top:4px}.ps .full{width:100%;margin-top:9px;font-size:10px;min-height:40px}.ps .web-secondary{border:1px solid var(--line);border-radius:5px;padding:10px 12px;display:flex;align-items:center;justify-content:center;gap:8px}.ps .web-secondary[aria-pressed=true]{border-color:var(--accent)}.ps .related-list{margin-top:26px;border-top:1px solid var(--line);padding-top:18px}.ps .related-list button{padding:10px 0;display:flex;justify-content:space-between;align-items:center;text-align:left;width:100%;border-bottom:1px solid var(--line);font-size:11px}.ps .related-list small{display:block;font-size:8px;color:var(--muted);margin-bottom:2px}.ps .inspector-art{width:100%;border-radius:var(--radius);margin-top:20px}.ps .web-game-meta{font-size:10px;display:flex;flex-direction:column;gap:5px;margin-top:16px;color:var(--muted)}.ps .web-game-meta strong{font-size:19px;color:var(--text);margin-top:6px}.ps .web-game-meta small{font-weight:400;font-size:8px;color:var(--muted)}.ps .web-recommendations{padding:38px 0}.ps .web-rec-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.ps .web-rec{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--surface)}.ps .web-rec-image{padding:0;display:block;width:100%;aspect-ratio:2;overflow:hidden}.ps .web-rec-image img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.ps .web-rec-image:hover img{transform:scale(1.05)}.ps .web-rec>div{padding:18px}.ps .web-rec h3{font-size:15px;font-weight:500;margin-bottom:8px}.ps .web-rec p{font-size:10px;color:var(--muted);line-height:1.8;min-height:52px}.ps .web-rec .text-button{font-size:10px;margin-top:15px}.ps.winter .web-intro h1{font-size:44px}.ps.summer .web-intro h1{font-size:47px}.ps.spring .web-shell{border-radius:28px 8px 28px 8px}
 @media(max-width:1050px){.ps .web-shell{grid-template-columns:minmax(0,1fr) 250px}.ps .web-inspector{padding:22px 18px}.ps .web-intro{display:block}.ps .web-live{margin-top:20px}.ps .web-intro h1{font-size:51px}.ps .web-legend{gap:7px;font-size:7px}.ps .network-bottom{padding:0 12px}.ps .web-rec-grid{gap:14px}.ps .web-rec>div{padding:14px}}
 @media(max-width:750px){.ps .web-shell{grid-template-columns:1fr}.ps .web-inspector{border-left:0;border-top:1px solid var(--line);padding:25px;display:block}.ps .web-toolbar{align-items:stretch;flex-direction:column;gap:12px}.ps .web-search{width:100%;padding:11px 4px}.ps .web-filters{justify-content:space-between}.ps .web-filters button{padding:8px 12px}.ps .graph-stage{height:550px}.ps .web-inspector .related-list{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}.ps .related-list>.kicker{grid-column:1/-1}.ps .web-inspector .connection-reason{font-size:12px}.ps .web-inspector>p{font-size:12px}.ps .inspector-art{max-width:400px;display:block;margin:20px auto 0}.ps .web-rec-grid{grid-template-columns:1fr}.ps .web-rec{display:grid;grid-template-columns:130px 1fr}.ps .web-rec-image{aspect-ratio:auto;height:100%}.ps .web-rec p{min-height:0}.ps .web-rec .text-button{margin-top:10px}.ps .web-rec>div{padding:16px}.ps .web-recommendations{padding-bottom:20px}.ps .graph-help{font-size:8px;max-width:300px;margin:auto}.ps .web-intro h1{font-size:46px}.ps .web-intro p{font-size:12px;max-width:290px;line-height:1.8}.ps .web-page{padding-top:31px}.ps.summer .web-intro h1{font-size:36px}.ps.winter .web-intro h1{font-size:35px}.ps .web-inspector .full{font-size:12px;min-height:44px}}


 .ps .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
 .ps .social-page{padding:42px 0 24px}.ps .social-heading{padding:0 0 35px;border-bottom:1px solid var(--line);margin-bottom:30px}.ps .social-heading h1{font:500 62px/1.08 var(--heading);letter-spacing:-1.8px;margin:11px 0 16px;max-width:700px}.ps .social-heading>p{color:var(--muted);font-size:13px;max-width:530px;line-height:1.8}.ps .social-heading-actions{display:flex;align-items:center;gap:25px;margin-top:25px}.ps .social-heading>.primary{margin-top:23px}.ps .social-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;font:500 15px var(--heading);color:var(--accent);background:var(--surface);border:1px solid var(--line);position:relative}.ps .av-jamie{background:var(--accent);color:var(--ink)}.ps .av-alex{border:1px solid var(--accent)}.ps .av-morgan{border-radius:35% 50% 35% 50%;border:1px solid var(--accent)}.ps .av-casey{border:1px dashed var(--accent)}.ps .av-riley{border-radius:40% 60% 45% 55%;border:1px solid var(--accent)}.ps .av-sam{background:var(--accent);color:var(--ink);border-radius:50% 50% 42% 42%}.ps .av-devon{border:1px solid var(--accent);box-shadow:inset 0 0 0 3px var(--surface),0 0 0 1px var(--accent)}.ps .avatar-button{padding:0}.ps .person-link{font-size:12px;font-weight:600;padding:0;text-align:left}.ps .person-link:hover{text-decoration:underline;text-underline-offset:3px}.ps .social-muted{font-size:12px;line-height:1.8;color:var(--muted)}.ps .profile-friend-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.ps .profile-friend{display:flex;align-items:center;gap:13px;width:100%;padding:15px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);color:var(--text);text-align:left}.ps .profile-friend:hover{border-color:var(--accent)}.ps .profile-friend>span{display:grid;gap:3px;min-width:0;flex:1}.ps .profile-friend strong{font-size:13px}.ps .profile-friend small{font-size:11px;color:var(--muted)}.ps .profile-friend-games{font-size:11px;line-height:1.6;color:var(--muted)}.ps .community-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:30px;align-items:start}.ps .community-layout>div,.ps .community-sidebar{min-width:0}.ps .social-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 25px;padding-bottom:18px;border-bottom:1px solid var(--line)}.ps .social-tabs button{font-size:11px;color:var(--muted);border:1px solid var(--line);padding:8px 13px;border-radius:25px;min-height:36px}.ps .social-tabs button[aria-pressed=true]{background:var(--accent);color:var(--ink);border-color:var(--accent)}.ps .activity-feed{display:flex;flex-direction:column;gap:23px}.ps .activity-card{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);padding:23px;overflow:hidden}.ps .activity-person{display:flex;align-items:center;gap:11px;margin-bottom:20px}.ps .activity-person>div{min-width:0}.ps .activity-person p{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5}.ps .activity-time{margin-left:auto;align-self:start;font-size:9px;white-space:nowrap;color:var(--muted);padding-top:3px}.ps .activity-game{display:flex;gap:20px;align-items:center}.ps .activity-art{width:195px;aspect-ratio:1.9;border-radius:calc(var(--radius) * .6);padding:0;overflow:hidden;flex-shrink:0;display:block;background:var(--bg)}.ps .activity-art img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.ps .activity-art:hover img{transform:scale(1.05)}.ps .activity-game .kicker{font-size:8px;letter-spacing:1.5px}.ps .activity-game-name{font:500 26px/1.15 var(--heading);padding:0;text-align:left;margin:3px 0 7px;display:block}.ps .activity-game p{font-size:10px;color:var(--muted);margin-bottom:8px}.ps .activity-game>div>span{font-size:10px;color:var(--muted)}.ps .activity-card blockquote{font:500 23px/1.45 var(--heading);margin:22px 0 18px;letter-spacing:.05px;max-width:650px}.ps .social-reason{display:flex;align-items:flex-start;gap:8px;font-size:10px;line-height:1.8;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}.ps .social-reason svg{margin-top:3px;color:var(--accent)}.ps .activity-actions{display:flex;align-items:center;gap:16px;margin-top:18px;flex-wrap:wrap}.ps .activity-actions button{padding:3px 0;font-size:10px;color:var(--muted);display:flex;align-items:center;gap:5px;min-height:32px}.ps .activity-actions button[aria-pressed=true]{color:var(--accent)}.ps .activity-actions .activity-save{margin-left:auto;color:var(--accent)}.ps .activity-circle{border-top:1px solid var(--line);display:flex;justify-content:space-between;width:100%;margin-top:16px;padding:14px 0 0;font-size:10px;color:var(--muted);text-align:left}.ps .side-card{padding:22px;border:1px solid var(--line);background:var(--surface);border-radius:var(--radius);margin-bottom:21px;overflow:hidden}.ps .side-card h2{font:500 27px/1.15 var(--heading);margin:7px 0 20px}.ps .circle-mini{display:flex;align-items:center;gap:10px;padding:14px 0;width:100%;text-align:left;border-bottom:1px solid var(--line)}.ps .circle-mini>span:not(.social-avatar):not(.circle-glyph){flex:1;min-width:0}.ps .circle-mini strong{font-size:11px;font-weight:500;display:block;line-height:1.5}.ps .circle-mini small{font-size:9px;color:var(--muted);display:block;margin-top:3px}.ps .circle-glyph{width:33px;height:33px;display:grid;place-items:center;background:var(--bg);border:1px solid var(--line);border-radius:30%;color:var(--accent);flex-shrink:0}.ps .side-note{padding:12px 20px 25px;color:var(--accent)}.ps .side-note p{font:500 32px/1.1 var(--heading);margin:15px 0}.ps .side-note>span{color:var(--muted);font-size:10px;line-height:1.8}.ps .small-game{display:flex;align-items:center;gap:12px;padding:15px 0;border-bottom:1px solid var(--line);min-width:0}.ps .small-game-art{width:84px;height:65px;overflow:hidden;border-radius:5px;flex-shrink:0;padding:0}.ps .small-game-art img{height:100%;width:100%;object-fit:cover}.ps .small-game>div{flex:1;min-width:0}.ps .small-game p{font-size:10px;line-height:1.6;color:var(--muted);margin:4px 0}.ps .small-game>div>span{font-size:10px;color:var(--accent)}.ps .small-game .icon-button{width:29px;height:29px;flex-shrink:0}.ps .side-card .small-game{gap:9px;flex-wrap:wrap}.ps .side-card .small-game-art{width:68px;height:51px}.ps .side-card .small-game .icon-button{width:25px;height:25px}.ps .side-card .small-game .person-link{font-size:11px}.ps .social-preview{padding:43px 0 20px}.ps .preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.ps .activity-card.compact{padding:18px;display:flex;flex-direction:column}.ps .compact .activity-person{gap:9px;margin-bottom:16px}.ps .compact .activity-person .social-avatar{width:31px!important;height:31px!important}.ps .compact .activity-time{display:none}.ps .compact .activity-game{display:block}.ps .compact .activity-art{width:100%;aspect-ratio:2;margin-bottom:15px}.ps .compact .activity-game-name{font-size:26px}.ps .compact .activity-person p{font-size:10px}.ps .compact blockquote{font-size:21px;line-height:1.4;margin:16px 0;flex:1}.ps .compact .social-reason{font-size:10px}.ps .compact .activity-actions{gap:11px;flex-wrap:wrap;margin-top:12px}.ps .compact .activity-save{margin-left:0}.ps .compact .activity-save span,.ps .compact .action-word{display:none}.ps .compact .activity-actions button{font-size:9px}.ps .social-preview-foot{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:23px 0;border-bottom:1px solid var(--line)}.ps .social-preview-foot>span{display:flex;gap:7px;align-items:center;font-size:10px;color:var(--muted)}.ps .social-preview-foot .social-avatar:nth-child(2){margin-left:-14px}.ps .comment-thread{border-top:1px solid var(--line);margin-top:16px;padding-top:17px}.ps .comment{display:flex;gap:10px;margin:18px 0;align-items:flex-start}.ps .comment>div{flex:1;min-width:0}.ps .comment p{font-size:12px;color:var(--muted);line-height:1.8;margin-top:4px;white-space:pre-wrap;overflow-wrap:anywhere}.ps .comment>div>button:last-child:not(.person-link){font-size:10px;color:var(--accent);padding:5px 0}.ps .comment-thread form{display:flex;gap:9px;margin-top:18px;align-items:center}.ps .comment-thread label{flex:1;min-width:0}.ps .comment-thread input,.ps .social-modal input,.ps .social-modal textarea,.ps .circle-compose textarea{border:1px solid var(--line);border-radius:5px;background:var(--bg);color:var(--text);padding:12px;font-size:12px;max-width:100%;width:100%;min-width:0}.ps .comment-thread .primary{padding:10px 14px;font-size:11px}.ps .social-modal{max-width:570px}.ps .social-modal form{display:flex;flex-direction:column;gap:19px}.ps .social-modal label{font-size:11px}.ps .social-modal textarea,.ps .circle-compose textarea{min-height:100px;resize:vertical;font:12px/1.8 Inter,sans-serif}.ps .social-modal select{font-size:12px}.ps .social-modal .primary{align-self:flex-start;margin-top:5px}.ps .row-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:22px}.ps .row-actions .web-secondary{font-size:11px}.ps .back-link{font-size:10px;color:var(--muted);margin-bottom:23px}.ps .profile-cover,.ps .circle-cover{padding:31px;border:1px solid var(--line);background:var(--surface);border-radius:var(--radius);margin-bottom:27px;position:relative;overflow:hidden}.ps .profile-identity{display:flex;align-items:center;gap:24px}.ps .profile-identity .social-avatar{font-size:36px}.ps .profile-cover h1{font:500 49px/1.1 var(--heading);margin:7px 0;letter-spacing:-1px}.ps .profile-identity>div>span{font-size:11px;color:var(--muted)}.ps .profile-cover>p{font-size:13px;color:var(--muted);max-width:570px;line-height:1.8;margin-top:22px}.ps .profile-shared{display:flex;flex-wrap:wrap;gap:7px;margin-top:17px}.ps .profile-cover-actions{display:flex;align-items:center;gap:14px;margin-top:25px}.ps .profile-cover-actions .web-secondary{font-size:11px}.ps .profile-section{padding:4px 0 30px}.ps .profile-section h2,.ps .group-finder h2,.ps .circle-discussion h2{font:500 31px/1.2 var(--heading);margin:3px 0 12px}.ps .social-game-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.ps .circle-directory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.ps .circle-section+.circle-section{margin-top:48px}.ps .circle-count{font-size:10px;color:var(--muted);white-space:nowrap}.ps .circle-card.joined{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}.ps .circle-card.discover .circle-card-top{opacity:.78}.ps .circle-card{border:1px solid var(--line);border-radius:var(--radius);padding:26px;background:var(--surface);display:flex;flex-direction:column;overflow:hidden}.ps .circle-card-top{display:flex;align-items:center;justify-content:space-between;color:var(--accent);padding-bottom:29px}.ps .circle-card-top>span{font-size:10px;color:var(--muted)}.ps .circle-card h2{font:500 35px/1.1 var(--heading);margin:7px 0 16px}.ps .circle-card>p{font-size:12px;color:var(--muted);line-height:1.8;flex:1}.ps .circle-card .primary{font-size:10px;padding:12px 14px}.ps .circle-cover h1{font:500 58px/1.1 var(--heading);max-width:650px;margin:12px 0 18px;letter-spacing:-1px}.ps .circle-cover>p{max-width:590px;font-size:13px;line-height:1.9;color:var(--muted)}.ps .group-finder{padding:26px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}.ps .group-finder>p{margin:13px 0 24px}.ps .group-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:17px 14px;margin-bottom:22px}.ps .group-fields label{font-size:10px}.ps .group-results{margin-top:30px;border-top:1px solid var(--line);padding-top:22px}.ps .group-result{padding:0 0 23px;margin-bottom:22px;border-bottom:1px solid var(--line)}.ps .group-result>p{font-size:12px;color:var(--muted);line-height:1.8;margin-top:15px}.ps .ownership{display:grid;grid-template-columns:1fr 1fr;gap:18px;background:var(--bg);padding:18px;border:1px solid var(--line);border-radius:5px;margin-top:19px}.ps .ownership span{font-size:11px;line-height:1.8;color:var(--muted)}.ps .ownership strong{display:block;font-size:10px;color:var(--accent);margin-bottom:6px}.ps .shared-wishlist-row{padding-bottom:16px}.ps .shared-wishlist-row>.text-button{font-size:10px;margin-top:10px;color:var(--muted)}.ps .circle-discussion{padding:25px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}.ps .circle-discussion>.comment{padding:16px 0;border-bottom:1px solid var(--line)}.ps .circle-compose{display:flex;flex-direction:column;gap:17px;margin-top:25px}.ps .circle-compose>.primary{align-self:flex-start}.ps .member-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ps .member-card{display:flex;flex-direction:column;align-items:center;gap:12px;border:1px solid var(--line);border-radius:var(--radius);padding:25px 18px;background:var(--surface)}.ps .member-card strong{font-size:13px;font-weight:500}.ps .member-card>span:not(.social-avatar){font-size:10px;color:var(--muted)}.ps .game-social{margin-top:30px;padding-top:25px;border-top:1px solid var(--line)}.ps .game-social h2{font:500 29px var(--heading);margin:7px 0}.ps .social-owner-row{display:flex;gap:15px;flex-wrap:wrap;margin:17px 0}.ps .social-owner-row>button{display:flex;gap:7px;align-items:center;font-size:11px;padding:0}.ps .game-social-quote{margin-top:17px;padding-top:16px;border-top:1px solid var(--line)}.ps .game-social-quote>p{font:500 21px/1.5 var(--heading);color:var(--muted);margin-top:9px}.ps .finder-social{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)}.ps .finder-social>span{margin-right:6px}.ps .finder-social>button{font-size:10px;border:1px solid var(--line);padding:6px 11px;border-radius:20px;min-height:32px}.ps .finder-social>button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}.ps .card-social-context{font-size:9px;color:var(--accent);margin-top:9px;line-height:1.7}.ps .web-profile-preview{margin:20px 0;border-top:1px solid var(--line);padding-top:16px;font-size:10px}.ps .web-profile-preview>span{color:var(--muted);font-size:9px}.ps .web-profile-preview strong{display:block;font-weight:500;margin:13px 0 7px;color:var(--accent)}.ps .web-profile-preview>button{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;padding:7px 0;font-size:10px}.ps .web-ownership{font-size:10px;line-height:1.8;padding-top:15px;margin-top:19px;border-top:1px solid var(--line);color:var(--muted)}.ps .web-ownership strong{color:var(--accent);font-weight:500}.ps .web-ownership>button{font-size:10px;padding:8px 0;text-decoration:underline}.ps .web-filters{flex-wrap:wrap;border-radius:var(--radius)}.ps .web-filters>button{padding:8px 12px}.ps .navlinks{gap:21px}.ps .navlinks button{font-size:12px}.ps .search{width:165px}
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
 .ps .brand-mark{border-radius:8px 13px 8px 13px;transform:rotate(-12deg);background:linear-gradient(145deg,#9b83ff,var(--accent));border:0;width:27px;height:27px;box-shadow:0 0 24px color-mix(in srgb,var(--accent) 25%,transparent)}
 .ps .brand-mark:after{inset:7px;border:2px solid #111522;border-radius:50%;}
 .ps .navlinks{gap:clamp(14px,2vw,28px)}.ps .navlinks button{font-size:13px;font-weight:600;color:#929db2;transition:color .18s}
 .ps .navlinks button:hover,.ps .navlinks button.current{color:#fff}.ps .navlinks .current:after{height:3px;border-radius:4px 4px 0 0;background:var(--accent);box-shadow:0 0 14px color-mix(in srgb,var(--accent) 55%,transparent)}
 .ps .navtools{gap:13px}.ps .search{width:clamp(155px,18vw,245px);border-radius:10px;background:#ffffff08;border-color:#ffffff18;padding:10px 13px}
 .ps .search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent)}
 .ps .search input{font-size:13px}.ps .avatar{background:linear-gradient(145deg,#9b83ff,var(--accent));color:#101522;border:2px solid #ffffff30;width:36px;height:36px}
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
 .ps .bottom{border-color:#ffffff16}.ps .global-footer{border-color:#ffffff16;color:var(--muted)}
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
 .ps .global-footer { margin-top:0; }
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

 /* PLAYSCAPE — streamlined editorial system */
 .ps {
   font-family:'DM Sans',Arial,sans-serif !important;
   --bg:#0b1019; --surface:#121b29; --surface-2:#192536; --surface-3:#202d40;
   --text:#edf1f7; --muted:#9aa8bb; --line:#29374a; --radius:12px; --favorite:#e53955;
   background:#0b1019 !important;
   background-image:none !important;
   line-height:1.55;
 }
 .ps.summer,.ps.spring,.ps.autumn,.ps.winter {
   --bg:#0b1019; --surface:#121b29; --surface-2:#192536; --surface-3:#202d40;
   --text:#edf1f7; --muted:#9aa8bb; --line:#29374a;
   background:#0b1019 !important; background-image:none !important;
 }
 .ps.summer{--accent:#d2a66c}
 .ps.spring{--accent:#73bda5}
 .ps.autumn{--accent:#d56a67}
 .ps.winter{--accent:#78b9d2}
 .ps :is(h1,h2,h3,h4,.brand,.game-title button,.season h2,.modal-head h2) {
   font-family:'Space Grotesk',Arial,sans-serif !important;
   font-style:normal !important;
 }
 .ps :is(p,span,button,label,input,select,textarea,small) { font-family:'DM Sans',Arial,sans-serif; }
 .ps .intro { padding-top:54px; padding-bottom:30px; }
 .ps .intro h1 { font-size:clamp(36px,4.4vw,54px) !important; letter-spacing:-.045em !important; }
 .ps .intro>p { font-size:14px; max-width:560px; }
 .ps .section { padding-top:52px; }
 .ps .section-head { margin-bottom:20px; }
 .ps .section-head h2 { font-size:clamp(23px,2.5vw,29px); letter-spacing:-.035em; }
 .ps .season-grid { gap:14px; margin-top:8px; }
 .ps .season {
   height:210px; padding:19px; border-radius:12px !important;
   background:#182638 !important; border:1px solid #ffffff16 !important;
   box-shadow:none !important; outline:0;
 }
 .ps .season>img { opacity:.22; filter:grayscale(.45) saturate(.45); }
 .ps .season:after { background:linear-gradient(180deg,#0b101933,#0b1019e8) !important; }
 .ps .season:first-child { background:linear-gradient(135deg,#243b49,#172638 75%) !important; }
 .ps .season:first-child>img { opacity:0 !important; }
 .ps .season h2 { font-size:25px !important; font-weight:600 !important; }
 .ps .season .line { font-size:12px; font-weight:500; color:#d5deea; }
 .ps .season .tags { display:none !important; }
 .ps .season-top { top:16px; left:18px; right:18px; }
 .ps .season-top>span { font-size:9px; border-radius:5px; }
 .ps .season-bottom { margin-top:12px; padding-top:10px; font-size:11px; border-color:#ffffff20; }
 .ps .season:hover { transform:translateY(-2px); box-shadow:none !important; }
 .ps .season.selected { outline:2px solid var(--accent); outline-offset:2px; }
 .ps .finder { border-radius:12px; box-shadow:none; padding:24px; }
 .ps .finder-head { margin-bottom:20px; }
 .ps .finder-head p { max-width:460px; }
 .ps .primary { box-shadow:none; font-weight:700; }
 .ps .primary:hover { transform:none; box-shadow:none; }
 .ps .game-art { box-shadow:none; border-radius:10px; }
 .ps .game-title button { font-weight:600; }
 .ps .game-info>p { line-height:1.5; }
 .ps .editorial { display:none !important; }
 .ps .nav { height:68px; }
 .ps .navlinks button { font-weight:500; }
 .ps .eyebrow,.ps .kicker { letter-spacing:1.1px; }
 .ps :is(.activity-card,.side-card,.web-rec,.circle-card,.profile-cover,.circle-cover,.web-shell,.web-filters,.member-card,.group-finder,.circle-discussion,.finder,.summary,.privacy-preview) { border-radius:12px; }
 @media(max-width:800px){ .ps .season{height:190px} .ps .intro{padding-top:40px} }
 @media(max-width:520px){ .ps .season{height:174px;padding:14px} .ps .season h2{font-size:22px !important} .ps .season-bottom{font-size:10px} }


/* PLAYSCAPE refinement: quieter hierarchy, fewer controls, more space */
.ps .social-heading { margin-bottom: 34px; }
.ps .social-heading h1, .ps .web-intro h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: -.045em; }
.ps .social-heading h1 { font-size: clamp(34px, 4vw, 48px); margin: 0 0 9px; }
.ps .social-heading > p, .ps .web-intro p { max-width: 560px; font-size: 14px; line-height: 1.65; color: var(--muted); }
.ps .social-heading-actions { margin-top: 18px; }
.ps .social-tabs { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 0 22px; padding: 0 0 15px; border-bottom: 1px solid var(--line); }
.ps .social-tabs button { min-height: 36px; padding: 8px 13px; border-radius: 7px; font-size: 12px; }
.ps .community-sidebar .side-note, .ps .community-sidebar > .side-card:nth-child(3) { display: none !important; }
.ps .community-sidebar { gap: 16px; }
.ps .side-card { padding: 20px; }
.ps .social-page { max-width: 1240px; }
.ps .web-page { max-width: 1380px; padding-top: 42px; }
.ps .web-intro { margin-bottom: 22px; align-items: end; }
.ps .web-intro h1 { font-size: clamp(34px, 4vw, 48px); margin: 0 0 8px; }
.ps .web-intro p { margin: 0; }
.ps .web-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 22px 0 16px; }
.ps .web-filters { display: flex; flex-wrap: wrap; gap: 5px; padding: 4px; border-radius: 9px; background: var(--surface); border: 1px solid var(--line); }
.ps .web-filters > button { min-height: 34px; padding: 7px 13px; border: 0; border-radius: 6px; font-size: 12px; color: var(--muted); }
.ps .web-filters > button[aria-pressed="true"] { background: var(--accent); color: #fff; }
.ps .web-search { min-width: 210px; max-width: 260px; }
.ps .web-shell { grid-template-columns: minmax(0, 1fr) 290px; gap: 16px; padding: 14px; border-radius: 12px; }
.ps .web-network { min-width: 0; height: 650px; }
.ps .network-caption { padding: 2px 4px 10px; font-size: 10px; color: var(--muted); }
.ps .graph-stage { height: 550px; border-radius: 9px; background: var(--bg); }
.ps .network-bottom { padding: 10px 4px 0; }
.ps .web-legend, .ps .graph-help { display: none !important; }
.ps .zoom-controls { margin-left: auto; }
.ps .web-inspector { max-height: 650px; padding: 18px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); overflow-y: auto; }
.ps .inspector-art { width: 100%; max-height: 145px; object-fit: cover; border-radius: 7px; }
.ps .inspector-symbol { width: 48px; height: 48px; border-radius: 10px; }
.ps .inspector-type { margin-top: 14px; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
.ps .web-inspector h2 { font-size: 23px; margin: 5px 0 8px; }
.ps .web-inspector > p { font-size: 12px; line-height: 1.6; color: var(--muted); }
.ps .connection-reason, .ps .web-profile-preview, .ps .web-ownership { display: none !important; }
.ps .web-inspector .primary, .ps .web-inspector .web-secondary { min-height: 38px; margin-top: 8px; font-size: 11px; }
.ps .related-list { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); }
.ps .related-list > button { padding: 9px 0; font-size: 11px; }
.ps .web-recommendations { display: none !important; }
.ps .web-page .kicker { letter-spacing: .08em; }
.ps .web-guide-ring { display: none; }
.ps .web-network { background-image: none; }
.ps .network-caption { min-height: 28px; align-items: center; }
.ps .related-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 14px; }
.ps .related-list > .kicker { grid-column: 1 / -1; margin-bottom: 4px; }
.ps .related-list > button { min-height: 48px; align-items: center; }
.ps .related-list > button span { min-width: 0; }
.ps .related-list > button span:not(:first-child) { overflow: hidden; text-overflow: ellipsis; }
.ps .web-inspector { box-shadow: none; }
.ps .zoom-controls { height: 36px; }
.ps .zoom-controls button { height: 36px; }
.ps .finder-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  min-width: 0;
}
.ps .randomize-button {
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--text);
  background: var(--surface);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}
.ps .randomize-button:hover {
  border-color: var(--accent);
  color: var(--accent);
}
@media (max-width: 900px) {
 .ps .web-shell { grid-template-columns: 1fr; }
 .ps .web-network { height: 590px; }
 .ps .graph-stage { height: 500px; }
 .ps .web-inspector { max-height: none; }
}
@media (max-width: 600px) {
 .ps .web-toolbar { align-items: stretch; flex-direction: column; }
 .ps .web-search { max-width: none; width: 100%; }
 .ps .web-shell { padding: 9px; }
 .ps .web-network { height: 500px; }
 .ps .graph-stage { height: 420px; }
 .ps .web-filters { width: 100%; }
 .ps .web-filters > button { flex: 1; }
 .ps .related-list { grid-template-columns: 1fr; }
}

/* Personalization: one quiet, text-only seasonal choice */
.ps .modal:has(.personalization-only) {
  width: 560px;
  padding: 24px;
}
.ps .personalization-only { width: 100%; }
.ps .personalization-only .theme-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}
.ps .personalization-only .theme-choice {
  min-height: 112px;
  height: 112px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 18px;
  text-align: center;
  font-family: 'DM Sans', Arial, sans-serif;
}
.ps .personalization-only .theme-choice svg {
  width: 18px;
  height: 18px;
  color: var(--muted);
}
.ps .personalization-only .theme-choice strong {
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -.02em;
  line-height: 1.1;
}
.ps .personalization-only .theme-choice small {
  display: none;
}
.ps .personalization-only .theme-choice.summer,
.ps .personalization-only .theme-choice.spring,
.ps .personalization-only .theme-choice.autumn,
.ps .personalization-only .theme-choice.winter {
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font-family: 'DM Sans', Arial, sans-serif;
}
.ps .personalization-only .theme-choice[aria-pressed="true"] {
  border: 2px solid var(--accent);
  outline: none;
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
}
@media (max-width: 520px) {
 .ps .modal:has(.personalization-only) { width: 100%; padding: 16px; }
 .ps .personalization-only .theme-grid { gap: 10px; }
 .ps .personalization-only .theme-choice { min-height: 96px; height: 96px; }
 .ps .personalization-only .theme-choice strong { font-size: 18px; }
}

/* Final finder and seasonal collection polish */
.ps{--accent:#9b83ff}
.ps .finder-fields{
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
}
.ps .finder-actions{
  grid-column:1/-1;
  display:grid;
  grid-template-columns:240px 104px;
  gap:8px;
  min-width:0;
  width:352px;
  max-width:100%;
}
.ps .finder-actions .primary{
  width:100% !important;
  min-width:180px !important;
  white-space:nowrap !important;
}
.ps .finder-actions .randomize-button{
  min-width:104px !important;
  white-space:nowrap !important;
}
.ps .season-images{
  position:absolute;
  inset:0;
  z-index:-2;
  overflow:hidden;
  background:#182638;
}
.ps .season-images img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  filter:saturate(.82) brightness(.78);
  opacity:0;
  transition:opacity .35s ease,transform .7s ease;
  transform:scale(1.02);
}
.ps .season-images img:first-child{
  opacity:1;
}
.ps .season:hover .season-images img{
  animation-duration:4.5s;
  animation-timing-function:ease;
  animation-iteration-count:infinite;
  will-change:opacity,transform;
}
.ps .season:hover .season-images .season-image-1{animation-name:playscape-season-first}
.ps .season:hover .season-images .season-image-2{animation-name:playscape-season-second}
.ps .season:hover .season-images .season-image-3{animation-name:playscape-season-third}
.ps .season:after{
  z-index:-1;
  background:linear-gradient(180deg,#10151d18,#10151d38 42%,#10151df5);
}
.ps .season-description{
  display:block;
  position:absolute;
  left:18px;
  right:18px;
  bottom:56px;
  max-width:220px;
  font-size:11px;
  line-height:1.45;
  color:#eef2f7;
  text-shadow:0 1px 3px #000;
}
.ps .season h2{
  position:relative;
  z-index:1;
}
.ps .season .line{
  position:relative;
  z-index:1;
  max-width:230px;
}
.ps .season.summer{
  background-image:none;
}
@keyframes playscape-season-first{0%,31%{opacity:1}32%,100%{opacity:0}}
@keyframes playscape-season-second{0%,31%{opacity:0}32%,64%{opacity:1}65%,100%{opacity:0}}
@keyframes playscape-season-third{0%,64%{opacity:0}65%,100%{opacity:1}}
@media (max-width:1100px){
  .ps .finder-fields{
    grid-template-columns:repeat(4,minmax(0,1fr));
  }
  .ps .finder-actions{
    grid-column:1/-1;
    min-width:0;
  }
  .ps .finder-actions .primary{
    max-width:none;
  }
}
@media (max-width:520px){
  .ps .finder-actions{
    grid-template-columns:1fr auto;
  }
  .ps .finder-actions .primary{
    min-width:0;
  }
  .ps .season-description{
    display:block;
    position:static;
    margin-top:6px;
    font-size:10px;
  }
}
.ps .game-meta{
  display:grid;
  justify-content:stretch;
  gap:7px;
  margin:10px 0 0;
}
.ps .game-meta-group{
  display:flex;
  flex-wrap:wrap;
  gap:5px;
  min-width:0;
}
.ps .game-meta-chip{
  display:inline-flex;
  align-items:center;
  max-width:100%;
  padding:2px 7px;
  border:1px solid var(--line);
  border-radius:999px;
  color:var(--muted);
  font-size:10px;
  line-height:1.4;
  white-space:normal;
  overflow-wrap:anywhere;
}
.ps .game-platforms .game-meta-chip{
  background:var(--surface);
}

/* The Web — Obsidian-style knowledge graph */
.ps .webgraph-page {
  height:calc(100vh - 76px - 80px);
  min-height:480px;
  padding-top:12px;
  overflow:hidden;
}
.ps .webgraph-canvas {
  position:relative;
  width:100%;
  height:100%;
  overflow:hidden;
  border:1px solid #1b2536;
  border-radius:12px;
  background:#101522;
  cursor:grab;
  touch-action:none;
  isolation:isolate;
}
.ps .webgraph-canvas:active {
  cursor:grabbing;
}
.ps .webgraph-canvas::before {
  content:"";
  position:absolute;
  inset:0;
  background-image:radial-gradient(#ffffff0a .7px,transparent .7px);
  background-size:26px 26px;
  pointer-events:none;
}
.ps .webgraph-svg {
  position:absolute;
  inset:0;
  display:block;
}
.ps .webgraph-node {
  cursor:pointer;
  transition:opacity .18s ease;
}
.ps .webgraph-node:focus {
  outline:none;
}
.ps .webgraph-dot {
  stroke:#101522;
  stroke-width:1.2;
  transition:stroke-width .18s ease,filter .18s ease;
}
.ps .webgraph-node.person .webgraph-dot {
  filter:drop-shadow(0 0 5px #8edcc055);
}
.ps .webgraph-node.active .webgraph-dot,
.ps .webgraph-node:hover .webgraph-dot,
.ps .webgraph-node:focus-visible .webgraph-dot {
  stroke:#e7eaf0;
  stroke-width:1.8px;
  filter:drop-shadow(0 0 8px #8edcc088);
}
.ps .webgraph-halo {
  fill:#8edcc0;
  opacity:.07;
  transition:opacity .18s ease;
}
.ps .webgraph-node.active .webgraph-halo,
.ps .webgraph-node:hover .webgraph-halo,
.ps .webgraph-node:focus-visible .webgraph-halo {
  opacity:.2;
}
.ps .webgraph-halo.active {
  opacity:.12;
  animation:webgraph-pulse 2.4s ease-in-out infinite;
}
.ps .webgraph-hub {
  fill:none;
  stroke-width:1;
  opacity:.22;
}
.ps .webgraph-label {
  fill:#e7eaf0;
  font:600 11px Inter,system-ui,sans-serif;
  letter-spacing:.01em;
  paint-order:stroke;
  stroke:#101522;
  stroke-width:3px;
  pointer-events:none;
  transition:opacity .15s ease;
}
.ps .webgraph-node.game .webgraph-label {
  fill:#c8cedb;
  font-weight:500;
}
@keyframes webgraph-pulse {
  0%,100% { opacity:.08; }
  50% { opacity:.2; }
}
.ps .webgraph-controls {
  position:absolute;
  z-index:2;
  top:14px;
  left:14px;
  display:flex;
  align-items:center;
  gap:6px;
  max-width:calc(100% - 28px);
  padding:5px;
  border:1px solid #ffffff12;
  border-radius:10px;
  background:#171e2dd9;
  backdrop-filter:blur(12px);
}
.ps .webgraph-search {
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:7px;
  width:190px;
  max-width:42vw;
  padding:0 7px;
  color:#8993a5;
}
.ps .webgraph-search input {
  width:100%;
  min-width:0;
  border:0;
  background:none;
  color:#e7eaf0;
  font-size:11px;
}
.ps .webgraph-search input::placeholder {
  color:#8993a5;
}
.ps .webgraph-icon-button,
.ps .webgraph-reset {
  min-width:27px;
  height:27px;
  padding:0 7px;
  border:1px solid #ffffff12;
  border-radius:7px;
  background:#ffffff08;
  color:#8993a5;
  font-size:11px;
  line-height:1;
}
.ps .webgraph-icon-button:hover,
.ps .webgraph-reset:hover {
  border-color:#8edcc066;
  color:#8edcc0;
}
.ps .webgraph-hint {
  position:absolute;
  z-index:2;
  bottom:12px;
  left:16px;
  margin:0;
  color:#8993a5;
  font-size:9px;
  letter-spacing:.04em;
  pointer-events:none;
}
.ps .webgraph-context {
  position:absolute;
  z-index:3;
  right:14px;
  bottom:14px;
  width:min(272px,calc(100% - 28px));
  max-height:min(62%,440px);
  padding:14px 15px;
  overflow:auto;
  border:1px solid #ffffff14;
  border-radius:10px;
  background:#171e2de6;
  color:#e7eaf0;
  backdrop-filter:blur(12px);
  scrollbar-width:thin;
  scrollbar-color:#2b3548 transparent;
}
.ps .webgraph-context-kicker {
  color:#8edcc0;
  font-size:8px;
  font-weight:700;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.ps .webgraph-context h2 {
  margin:4px 0 10px;
  color:#e7eaf0;
  font:600 14px Inter,system-ui,sans-serif;
  letter-spacing:-.01em;
}
.ps .webgraph-context-section {
  padding-top:10px;
  border-top:1px solid #ffffff12;
}
.ps .webgraph-context-section + .webgraph-context-section {
  margin-top:10px;
}
.ps .webgraph-context-section strong {
  color:#8993a5;
  font-size:9px;
  font-weight:600;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.ps .webgraph-context-section p {
  margin-top:6px;
  color:#c8cedb;
  font-size:10px;
  line-height:1.5;
}
.ps .webgraph-context-section p b {
  display:block;
  color:#e7eaf0;
  font-weight:600;
}
.ps .webgraph-context-section p span {
  color:#8993a5;
}
.ps .webgraph-links {
  display:flex;
  flex-wrap:wrap;
  gap:4px;
  margin-top:7px;
}
.ps .webgraph-link {
  display:inline-flex;
  align-items:baseline;
  gap:4px;
  max-width:100%;
  padding:4px 7px;
  border:1px solid #ffffff14;
  border-radius:6px;
  background:#10152299;
  color:#e7eaf0;
  font-size:9.5px;
  line-height:1.4;
  text-align:left;
  overflow-wrap:anywhere;
}
.ps .webgraph-link:hover {
  border-color:#8edcc066;
  color:#8edcc0;
}
.ps .webgraph-link span {
  color:#8993a5;
  font-size:8px;
  text-transform:uppercase;
  letter-spacing:.05em;
}
.ps .webgraph-action {
  display:block;
  width:100%;
  margin-top:10px;
  padding:7px 0 0;
  border-top:1px solid #ffffff12;
  color:#8edcc0;
  font-size:10px;
  font-weight:600;
  text-align:left;
}
.ps .webgraph-action.secondary {
  margin-top:5px;
  padding-top:0;
  border-top:0;
  color:#8993a5;
}
.ps .webgraph-action:hover {
  color:#e7eaf0;
}
@media (max-width:800px) {
  .ps .webgraph-page {
    height:calc(100dvh - 68px - 92px);
    min-height:430px;
    padding-top:8px;
  }
  .ps .webgraph-controls {
    top:10px;
    right:10px;
    left:10px;
    flex-wrap:wrap;
    max-width:none;
  }
  .ps .webgraph-search {
    flex:1 1 170px;
    max-width:none;
    width:auto;
  }
  .ps .webgraph-hint {
    display:none;
  }
  .ps .webgraph-context {
    right:10px;
    bottom:10px;
    left:10px;
    width:auto;
    max-height:38%;
  }
}
@media (max-width:500px) {
  .ps .webgraph-search {
    flex-basis:140px;
  }
  .ps .webgraph-reset {
    font-size:10px;
  }
}
   /* Shared control and wishlist consistency */
  .ps .text-button,
  .ps .reset {
    display:inline-flex;
    align-items:center;
    min-height:32px;
    margin:0;
    padding:0;
    line-height:1.55;
    font-size:12px;
  }
  .ps .browse-controls .finder-foot { align-items:center; gap:12px; }
  .ps .browse-controls .finder-foot-actions {
    display:flex;
    align-items:center;
    flex-wrap:wrap;
    gap:12px;
    margin-left:auto;
  }
  .ps .text-button svg { transition:transform .18s ease; }
  .ps .text-button:hover svg { transform:translateX(3px); }
  .ps .save,
  .ps .icon-button,
  .ps .activity-save,
  .ps .cmp-head-action,
  .ps .web-secondary,
  .ps .cmp-actions .web-secondary,
  .ps .webgraph-action.secondary {
    transition:color .18s ease, background .18s ease, border-color .18s ease;
  }
  .ps .save { color:var(--text); }
  .ps .save.saved {
    color:var(--text);
    background:#0b0e16d9;
    border-color:#ffffff38;
  }
  .ps button[aria-pressed="true"] svg path[fill="currentColor"] {
    color:var(--favorite);
    stroke:var(--favorite);
    transition:color .18s ease, stroke .18s ease;
  }
  .ps .activity-save { color:var(--muted); }
  .ps .webgraph-action.secondary { gap:6px; }
  @media(max-width:700px) {
    .ps .browse-controls .finder-foot { align-items:flex-start; flex-direction:column; }
    .ps .browse-controls .finder-foot-actions { margin-left:0; }
  }
  `}</style>
                <AppLayout
                    currentView={view}
                    atmosphere={atmos}
                    wishlistCount={saved.length}
                    cartCount={cart.gameIds.length}
                    onOpenCart={openCartCheckout}
                    menuOpen={menu}
                    query={query}
                    onNavigate={(destination: NavigationDestination) => nav(destination)}
                    onToggleMenu={() => setMenu((open) => !open)}
                    onQueryChange={(nextQuery) => {
                        setQuery(nextQuery)
                        setActive(true)
                    }}
                    onSearchSubmit={find}
                >
                    <PageContainer
                        id="discover-content"
                        hidden={view !== "Discover"}
                    >
                        <Discover
                            games={data}
                            saved={saved}
                            toggle={toggle}
                            openGame={openGame}
                            changeView={changeView}
                            mood={mood}
                            setMood={setMood}
                            prefs={prefs}
                            setPrefs={setPrefs}
                            active={active}
                            setActive={setActive}
                            query={query}
                            setQuery={setQuery}
                            socialDiscovery={socialDiscovery}
                            setSocialDiscovery={setSocialDiscovery}
                            panel={panel}
                            setPanel={setPanel}
                            find={find}
                            title={title}
                            seasons={seasons}
                            resultRef={resultRef}
                            compareIds={compareIds}
                            toggleCompare={toggleCompare}
                            reviews={reviewState.reviews}
                        />
                        {view === "Discover" && <CommunityPreview />}
                    </PageContainer>
                    {view === "Browse" && (
                        <Browse
                            games={data}
                            query={query}
                            setQuery={setQuery}
                            changeView={changeView}
                            setActive={setActive}
                            renderCard={card}
                        />
                    )}
                    {view === "Wishlist" && (
                        <Wishlist
                            games={data}
                            saved={saved}
                            toggle={toggle}
                            openGame={openGame}
                            changeView={changeView}
                            social={{
                                saved: social.saved,
                                games: social.games,
                                setDialog: social.setDialog,
                                go: social.go,
                            }}
                            wishlistSummary={wishlistSummary}
                            renderCard={card}
                        />
                    )}
                    {view === "Compare" && (
                        <ComparePage
                            games={data}
                            selectedGameIds={compareIds}
                            saved={saved}
                            onAdd={addToCompare}
                            onRemove={removeFromCompare}
                            onClear={resetComparison}
                            onToggleSaved={toggle}
                            onOpenGame={openGame}
                            onBrowse={() => changeView("Browse")}
                            reviews={reviewState.reviews}
                            onCheckout={openCheckout}
                        />
                    )}
                    {view === "The Web" && (
                        <TheWeb
                            games={data}
                            saved={saved}
                            toggle={toggle}
                            openGame={openGame}
                            community={{
                                activeView: view,
                                webFocus: webFocus,
                                go: social.go,
                                setDialog: social.setDialog,
                                graph: social.graph,
                                state: social.state,
                            }}
                        />
                    )}
                    {view === "Community" && (
                        <Community
                            social={{
                                activity: social.activity,
                                state: social.state,
                                setDialog: social.setDialog,
                                go: social.go,
                                respondToInvite: social.respondToInvite,
                                saved: social.saved,
                            }}
                            renderActivityCard={(item) => <ActivityCard item={item} />}
                            renderSmallGame={({ id, reason }) => <SmallGame id={id} reason={reason} />}
                            changeView={changeView}
                        />
                    )}
                    {view === "Profile" && (
                        <Profiles
                            id={profileId}
                            social={{
                                activity: social.activity,
                                state: social.state,
                                saved: social.saved,
                                go: social.go,
                                setDialog: social.setDialog,
                            }}
                            renderAvatar={({ id, size = 38 }) => (
                                <Avatar id={id} size={size} />
                            )}
                            renderSmallGame={({ id, reason }) => (
                                <SmallGame id={id} reason={reason} />
                            )}
                            renderActivityCard={(item) => (
                                <ActivityCard item={item} />
                            )}
                            reviews={reviewState.reviews}
                            onOpenGame={(id) => openGame(id)}
                            checkout={{
                                state: checkoutState.state,
                                onRespondToGift: respondToGift,
                            }}
                        />
                    )}
                    {view === "Gaming Circles" && (
                        <GamingCircles
                            circleId={circleId}
                            social={{
                                activity: social.activity,
                                state: social.state,
                                games: social.games,
                                saved: social.saved,
                                initialCircleTab,
                                go: social.go,
                                join: social.join,
                                setDialog: social.setDialog,
                                shortlist: social.shortlist,
                                update: social.update,
                                useFinder: social.useFinder,
                            }}
                            renderSmallGame={({ id, reason }) => (
                                <SmallGame id={id} reason={reason} />
                            )}
                            renderActivityCard={(item) => (
                                <ActivityCard item={item} />
                            )}
                            renderAvatar={({ id, size = 38 }) => (
                                <Avatar id={id} size={size} />
                            )}
                            renderPersonLink={({ id }) => (
                                <PersonLink id={id} />
                            )}
                        />
                    )}
                </AppLayout>
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
                                {panel !== "Personalization" && <h2>{panel}</h2>}
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
                                <div className="personalization-only">
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
                                                <strong>{s.name}</strong>
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
                <GameDetails
                    games={data}
                    saved={saved}
                    toggle={toggle}
                    openGame={openGame}
                    go={social.go}
                    setDialog={social.setDialog}
                    activity={social.activity}
                    compareIds={compareIds}
                    toggleCompare={toggleCompare}
                    detail={detail}
                    setDetail={setDetail}
                    reviews={reviewState.reviews}
                    onSubmitReview={reviewState.submitReview}
                    onCheckout={openCheckout}
                />
                <SocialDialog
                    key={
                        social.dialog ? JSON.stringify(social.dialog) : "closed"
                    }
                />
                {checkoutIds.length > 0 && checkoutSessionId && (
                    <CheckoutDialog
                        key={checkoutSessionId}
                        games={checkoutIds
                            .map((id) => resolveGameRecord(id, data))
                            .filter((entry): entry is GameRecord => Boolean(entry))}
                        sessionId={checkoutSessionId}
                        initialPurchaseType={checkoutType}
                        friends={socialPeople}
                        currentUser={socialPeople[0]}
                        renderAvatar={({ id, size = 38 }) => (
                            <Avatar id={id} size={size} />
                        )}
                        cartMode={checkoutFromCart}
                        onAddToCart={addToCart}
                        onRemoveFromCart={removeFromCart}
                        onClearCart={clearCartItems}
                        onClose={closeCheckout}
                        onComplete={completeCheckout}
                        onViewProfile={(id) => {
                            closeCheckout()
                            changeView("Profile", id)
                        }}
                    />
                )}
                {(social.message || notice) && (
                    <div role="status" className="toast">
                        {social.message || notice}
                    </div>
                )}
            </div>
        </CommunityContext.Provider>
    )
}
