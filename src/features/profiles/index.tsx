/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import type { NavigationDestination } from "../../components/navigation/NavigationItem"
import { getGameById } from "../../data/games"
import type { PrototypeResetScope } from "../../prototypeReset"
import {
    initialFriendships,
    socialPeople,
    type SocialPerson,
    type SocialState,
} from "../../socialData"
import {
    getPersonReviews,
    REVIEW_CATEGORIES,
    REVIEW_SCALE,
    type ReviewRecord,
} from "../reviews"
import GiftHistory from "../checkout/GiftHistory"
import {
    createEmptyCheckoutState,
    type CheckoutState,
    type GiftDecision,
    type GiftResponseResult,
} from "../checkout"

export interface ProfilesProps {
    id: string
    social: {
        activity: any[]
        state: SocialState
        saved: number[]
        go: (destination: NavigationDestination, id?: string) => void
        setDialog: (dialog: any) => void
    }
    renderAvatar: (props: { id: string; size?: number }) => React.ReactNode
    renderSmallGame: (props: {
        id: number
        key?: number | string
        reason?: string
    }) => React.ReactNode
    renderActivityCard: (item: any) => React.ReactNode
    reviews?: ReviewRecord[]
    onOpenGame?: (id: number) => void
    initialTab?: string
    initialAudience?: string
    checkout?: {
        state: CheckoutState
        onRespondToGift?: (id: string, decision: GiftDecision) => GiftResponseResult
    }
    /** Full canonical ownership list, including seeded demo games. */
    ownedIds?: number[]
    onResetPrototypeData?: (scope: PrototypeResetScope) => void
}

export default function PlayerProfile({
    id,
    social,
    renderAvatar,
    renderSmallGame,
    renderActivityCard,
    reviews = [],
    onOpenGame,
    initialTab = "Overview",
    initialAudience = "Myself",
    checkout,
    ownedIds = [],
    onResetPrototypeData,
}: ProfilesProps) {
    const { activity, state, saved, go, setDialog } = social
    const [resetScope, setResetScope] = React.useState<PrototypeResetScope | null>(null)
    const RenderAvatar = renderAvatar
    const RenderSmallGame = renderSmallGame
    const RenderActivityCard = renderActivityCard
    const p =
        socialPeople.find((person) => person.id === id) || socialPeople[0]
    const [tab, setTab] = React.useState(initialTab)
    const [audience, setAudience] = React.useState(initialAudience)
    const own = p.id === "you"
    const checkoutState = checkout?.state ?? createEmptyCheckoutState()
    const giftsTab = own ? "Gifts & Orders" : "Received Gifts"
    const profileTabs = [
        "Overview",
        "Friends",
        "Recommendations",
        "Reviews",
        giftsTab,
        "Wishlist",
        "Collections",
    ]
    const circles = state.circles.filter((x: any) => x.members.includes(p.id))
    const publicWishlist = own
        ? audience === "Myself" ||
          state.privacy.wishlist === "Public" ||
          (audience === "Friend" &&
            state.privacy.wishlist === "Friends only")
        : p.privacy !== "Private"
    const wishlist = own ? saved : p.wishlist
    const profileAllowed =
        !own ||
        audience === "Myself" ||
        state.privacy.profile === "Public" ||
        (audience === "Friend" && state.privacy.profile === "Friends only")
    const activityAllowed =
        !own ||
        audience === "Myself" ||
        state.privacy.activity === "Public" ||
        (audience === "Friend" && state.privacy.activity === "Friends only")
    const personReviews = getPersonReviews(reviews, p.id)
    const relatedPeople = React.useMemo(() => {
        const friendsOf = (id: string) => {
            const result = new Set<string>()
            for (const friendship of initialFriendships) {
                if (!friendship.members.includes(id)) continue
                friendship.members.forEach((member) => {
                    if (member !== id && member !== "you") result.add(member)
                })
            }
            return result
        }
        const yourFriends = friendsOf("you")
        if (own) {
            return socialPeople.filter((person) => yourFriends.has(person.id))
        }
        const theirFriends = friendsOf(p.id)
        return socialPeople.filter(
            (person) =>
                person.id !== p.id &&
                yourFriends.has(person.id) &&
                theirFriends.has(person.id),
        )
    }, [own, p.id])

    const collectionIds = (person: SocialPerson) => {
        const ids = new Set<number>()
        for (const field of [
            "owned",
            "playing",
            "recent",
            "favorites",
            "completed",
            "recommends",
            "wishlist",
        ] as const) {
            for (const id of person[field]) ids.add(id)
        }
        return ids
    }
    const sharedGamesWith = (person: SocialPerson) => {
        const anchor = own ? socialPeople[0] : p
        const anchorGames = collectionIds(anchor)
        return [...collectionIds(person)].filter((id) => anchorGames.has(id))
    }

    return (
        <main className="social-page">
            <button
                className="text-button back-link"
                onClick={() => go("Community")}
            >
                Community / Player profile
            </button>
            <header className="profile-cover">
                <div className="profile-identity">
                    {RenderAvatar({ id: p.id, size: 84 })}
                    <div>
                        <div className="kicker">
                            {own ? "Your gaming identity" : "A player in your circle"}
                        </div>
                        <h1>{p.name}</h1>
                        <span>
                            {p.handle} ·{" "}
                            {own ? state.privacy.profile : p.privacy}
                        </span>
                    </div>
                </div>
                <p>{p.bio}</p>
                <div className="profile-shared">
                    {p.interests.map((i) => (
                        <span className="pill" key={i}>{i}</span>
                    ))}
                </div>
                <div className="profile-cover-actions">
                    <button
                        className="primary"
                        onClick={() => go("The Web", p.id)}
                    >
                        Find them in The Web
                        <Icon name="arrow" size={15} />
                    </button>
                    <button
                        className="web-secondary"
                        onClick={() =>
                            setDialog(
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
                    This profile is {state.privacy.profile.toLowerCase()}. Its
                    gaming details are hidden from this visitor.
                </div>
            ) : (
                <>
                    <div className="social-tabs">
                        {profileTabs.map(
                            (t) => (
                                <button
                                    key={t}
                                    aria-pressed={tab === t}
                                    onClick={() => setTab(t)}
                                >
                                    {t}
                                </button>
                            )
                        )}
                    </div>
                    <div className="community-layout">
                        <div>
                            {tab === "Overview" ? (
                                <>
                                    <section className="profile-section chk-profile-summary">
                                        <div className="section-head">
                                            <h2>
                                                {own
                                                    ? "Your prototype library"
                                                    : `${p.name}’s prototype library`}
                                            </h2>
                                        </div>
                                        <p role="status">
                                            Owned games: {ownedIds.length}.{" "}
                                            {own
                                                ? "Personal purchases and accepted gifts appear here immediately."
                                                : "Seeded games and accepted gifts appear here immediately."}
                                        </p>
                                        <div className="social-game-grid">
                                            {ownedIds.map((id) => (
                                                <RenderSmallGame key={id} id={id} reason="Owned" />
                                            ))}
                                        </div>
                                        <button
                                            className="web-secondary"
                                            onClick={() => setTab(giftsTab)}
                                        >
                                            {own ? "View library & orders" : "View gifts & library"}{" "}
                                            <Icon name="arrow" size={14} />
                                        </button>
                                    </section>
                                    <section className="profile-section">
                                        <div className="section-head">
                                            <h2>Currently in their world</h2>
                                        </div>
                                        <div className="social-game-grid">
                                            {p.playing.map((id) => (
                                                <RenderSmallGame
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
                                                <RenderSmallGame key={id} id={id} />
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
                                            <RenderSmallGame
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
                            ) : tab === "Friends" ? (
                                <section className="profile-section profile-friends">
                                    <div className="section-head">
                                        <h2>
                                            {own
                                                ? `Your friends (${relatedPeople.length})`
                                                : `Mutual friends (${relatedPeople.length})`}
                                        </h2>
                                        <p className="social-muted">
                                            {own
                                                ? "Everyone here is part of the same network used by The Web, reviews, and recommendations."
                                                : "People you both know, with the games you have in common."}
                                        </p>
                                    </div>
                                    {relatedPeople.length === 0 ? (
                                        <div className="empty">
                                            No mutual friends in this sample yet.
                                        </div>
                                    ) : (
                                        <div className="profile-friend-grid">
                                            {relatedPeople.map((person) => {
                                                const shared = sharedGamesWith(person)
                                                    .map((id) => getGameById(id)?.title)
                                                    .filter((title): title is string => Boolean(title))
                                                return (
                                                    <button
                                                        className="profile-friend"
                                                        data-profile-friend-id={person.id}
                                                        key={person.id}
                                                        onClick={() => go("Profile", person.id)}
                                                    >
                                                        {RenderAvatar({ id: person.id, size: 44 })}
                                                        <span>
                                                            <strong>{person.name}</strong>
                                                            <small>{person.handle}</small>
                                                            <span className="profile-friend-games">
                                                                {shared.length
                                                                    ? `Shared: ${shared.slice(0, 3).join(", ")}${shared.length > 3 ? ` +${shared.length - 3} more` : ""}`
                                                                    : "No shared games yet"}
                                                            </span>
                                                        </span>
                                                        <Icon name="arrow" size={14} />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </section>
                            ) : tab === "Recommendations" ? (
                                <div className="activity-feed">
                                    {activity
                                        .filter(
                                            (a: any) =>
                                                activityAllowed &&
                                                a.person === p.id &&
                                                a.category === "Recommendations"
                                        )
                                        .map((a: any) => (
                                            <RenderActivityCard key={a.id} item={a} />
                                        ))}
                                    {p.recommends.map((id) => (
                                        <RenderSmallGame
                                            key={id}
                                            id={id}
                                            reason={"Recommended by " + p.name}
                                        />
                                    ))}
                                </div>
                            ) : tab === "Reviews" ? (
                                <div className="activity-feed profile-reviews">
                                    {!activityAllowed ? (
                                        <div className="empty">
                                            Reviews are hidden by this profile’s
                                            activity privacy setting.
                                        </div>
                                    ) : personReviews.length === 0 ? (
                                        <div className="empty">
                                            No published reviews yet. Reviews
                                            appear here after an owner or
                                            wishlister writes one.
                                        </div>
                                    ) : (
                                        personReviews.map((review) => {
                                            const game = getGameById(review.gameId)
                                            return (
                                                <article
                                                    className="profile-review"
                                                    key={review.id}
                                                >
                                                    <div className="profile-review-head">
                                                        <div>
                                                            <div className="kicker">
                                                                Overall {review.overall}/{REVIEW_SCALE.max}
                                                            </div>
                                                            {onOpenGame ? (
                                                                <button
                                                                    type="button"
                                                                    className="person-link"
                                                                    onClick={() => onOpenGame(review.gameId)}
                                                                >
                                                                    {game?.title ?? `Game ${review.gameId}`}
                                                                </button>
                                                            ) : (
                                                                <strong>
                                                                    {game?.title ?? `Game ${review.gameId}`}
                                                                </strong>
                                                            )}
                                                        </div>
                                                        <span className="rvw-source-note">
                                                            {review.source === "prototype"
                                                                ? "Explicit prototype review"
                                                                : "Locally authored review"}
                                                            {review.revisionOf ? " · Revised" : ""}
                                                        </span>
                                                    </div>
                                                    <p>“{review.text}”</p>
                                                    <ul className="rvw-friend-categories" role="list" aria-label="Category ratings">
                                                        {REVIEW_CATEGORIES.filter(
                                                            (category) => review.categories[category] !== undefined,
                                                        ).map((category) => (
                                                            <li key={category}>
                                                                <span>{category}</span>
                                                                <strong>{review.categories[category]}</strong>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </article>
                                            )
                                        })
                                    )}
                                </div>
                            ) : tab === giftsTab ? (
                                <>
                                    <GiftHistory
                                        person={p}
                                        own={own}
                                        state={checkoutState}
                                        renderAvatar={renderAvatar}
                                        onOpenGame={onOpenGame}
                                        onRespondToGift={checkout?.onRespondToGift}
                                        ownedIds={ownedIds}
                                    />
                                    {own && onResetPrototypeData && (
                                        <section className="ps-reset-card" aria-labelledby="ps-reset-heading">
                                            <div className="section-head">
                                                <h3 id="ps-reset-heading">Reset Prototype Data</h3>
                                            </div>
                                            <p>
                                                PLAYSCAPE is a prototype. Resetting clears locally stored purchases, gift records, and related account progress. No real account, payment, or order data is affected.
                                            </p>
                                            <div className="ps-reset-actions">
                                                <button
                                                    className="web-secondary"
                                                    onClick={() => setResetScope("purchases")}
                                                >
                                                    Reset purchases & history
                                                </button>
                                                <button
                                                    className="web-secondary"
                                                    onClick={() => setResetScope("all")}
                                                >
                                                    Reset all prototype account data
                                                </button>
                                            </div>
                                            {resetScope && (
                                                <div className="ps-reset-confirm" role="alertdialog" aria-label="Confirm prototype reset">
                                                    <p>
                                                        {resetScope === "purchases"
                                                            ? "This clears prototype purchases, gift records, ownership, history, and the local cart. Wishlists, reviews, circles, and comparison selections stay as they are."
                                                            : "This also clears saved games, social activity, reviews, and comparisons, then restores the seeded prototype state."}
                                                    </p>
                                                    <button
                                                        className="primary"
                                                        onClick={() => {
                                                            onResetPrototypeData(resetScope)
                                                            setResetScope(null)
                                                        }}
                                                    >
                                                        Confirm reset
                                                    </button>
                                                    <button
                                                        className="text-button"
                                                        onClick={() => setResetScope(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </section>
                                    )}
                                </>
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
                                            <RenderSmallGame
                                                key={id}
                                                id={id}
                                                reason={
                                                    saved.includes(id) && !own
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
                                                setDialog({
                                                    type: "recommend",
                                                    game: saved[0] || 413150,
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
                                            <RenderSmallGame id={id} key={id} />
                                        ))}
                                    </section>
                                    <section className="profile-section">
                                        <h2>Finished, but not forgotten</h2>
                                        {p.completed.map((id) => (
                                            <RenderSmallGame id={id} key={id} />
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
                                <h2>{own ? "Your interests" : "What you share"}</h2>
                                <div className="profile-shared">
                                    {p.interests
                                        .filter((i) =>
                                            socialPeople[0].interests.includes(i),
                                        )
                                        .map((i) => (
                                            <span className="pill" key={i}>
                                                {i}
                                            </span>
                                        ))}
                                </div>
                                <p className="social-muted">
                                    {own
                                        ? `${relatedPeople.length} friends, a few familiar worlds, and plenty left to discover.`
                                        : "A shared interest is a good reason to follow an unfamiliar recommendation."}
                                </p>
                            </div>
                            <div className="side-card">
                                <h2>Gaming Circles</h2>
                                {circles.map((x: any) => (
                                    <button
                                        className="circle-mini"
                                        key={x.id}
                                        onClick={() => go("Gaming Circles", x.id)}
                                    >
                                        <Icon name="spark" />
                                        <span>
                                            <strong>{x.name}</strong>
                                            <small>
                                                {x.members.includes("you")
                                                    ? "A shared circle"
                                                    : x.members.length + " members"}
                                            </small>
                                        </span>
                                        <Icon name="arrow" size={13} />
                                    </button>
                                ))}
                            </div>
                            <div className="side-card">
                                <h2>
                                    {own
                                        ? `Friends (${relatedPeople.length})`
                                        : `Mutual friends (${relatedPeople.length})`}
                                </h2>
                                {relatedPeople.length === 0 ? (
                                    <p className="social-muted">
                                        No mutual friends in this sample yet.
                                    </p>
                                ) : (
                                    relatedPeople.map((x) => (
                                        <button
                                            className="circle-mini"
                                            data-friend-id={x.id}
                                            onClick={() => go("Profile", x.id)}
                                            key={x.id}
                                        >
                                            {RenderAvatar({ id: x.id, size: 30 })}
                                            <span>
                                                <strong>{x.name}</strong>
                                                <small>{x.handle}</small>
                                            </span>
                                            <Icon name="arrow" size={13} />
                                        </button>
                                    ))
                                )}
                            </div>
                        </aside>
                    </div>
                </>
            )}
        </main>
    )
}
