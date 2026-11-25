/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import type { NavigationDestination } from "../../components/navigation/NavigationItem"
import {
    buildWishlistRecommendations,
    type GameRecord,
} from "../../data/games"
import { socialPeople } from "../../socialData"

export interface WishlistProps {
    games: GameRecord[]
    saved: number[]
    toggle: (id: number) => void
    openGame: (game: GameRecord | number | null | undefined) => void
    changeView: (v: NavigationDestination, id?: string) => void
    social: {
        saved: number[]
        games: GameRecord[]
        setDialog: (dialog: any) => void
        go: (destination: NavigationDestination, id?: string) => void
    }
    wishlistSummary: {
        savedGames: GameRecord[]
        totalSaved: number
        overlaps: Array<{
            id: string
            name: string
            sharedCount: number
        }>
    }
    renderCard: (g: GameRecord) => React.ReactNode
}

export default function Wishlist({
    games,
    saved,
    toggle,
    openGame,
    changeView,
    social,
    wishlistSummary,
    renderCard,
}: WishlistProps) {
    const { saved: socialSaved, games: socialGames, setDialog, go } = social
    const highlighted = React.useMemo(
        () =>
            buildWishlistRecommendations(
                socialSaved,
                socialPeople,
                socialGames,
            ).slice(0, 3),
        [socialSaved, socialGames],
    )

    function WishlistSocial() {
        return (
            <section className="wishlist-social">
                <div className="row-actions">
                    <button
                        className="primary"
                        disabled={!socialSaved.length}
                        onClick={() => setDialog({ type: "shareWishlist" })}
                    >
                        Share your wishlist
                        <Icon name="arrow" size={14} />
                    </button>
                    <button
                        className="text-button"
                        onClick={() => {
                            go("Gaming Circles")
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
                                    onClick={() => openGame(entry.game.id)}
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
                                p.wishlist.some((id) => socialSaved.includes(id)),
                        )
                        .map((p) => (
                            <button
                                key={p.id}
                                onClick={() => go("Profile", p.id)}
                            >
                                <Avatar id={p.id} size={24} />
                                {p.name} shares{" "}
                                {
                                    p.wishlist.filter((id) =>
                                        socialSaved.includes(id),
                                    ).length
                                }{" "}
                                saved games
                            </button>
                        ))}
                </div>
            </section>
        )
    }

    function Avatar({ id, size = 25 }: { id: string; size?: number }) {
        const p = socialPeople.find((p) => p.id === id) || socialPeople[0]
        return (
            <span
                className={"social-avatar av-" + id}
                style={{ width: size, height: size }}
                role="img"
                aria-label={p.name + " avatar"}
            >
                {p.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
            </span>
        )
    }

    return (
        <section className="social-page">
            <section className="social-heading">
                <div className="kicker">Your library</div>
                <h1>Wishlist </h1>
                <p>
                    Your shortlist is a personal catalog: a place to keep the games
                    you want to revisit, compare, and share with your friends.
                </p>
                <div className="social-heading-actions">
                    <button className="primary" onClick={() => changeView("Browse")}>
                        Browse the catalog
                        <Icon name="arrow" size={15} />
                    </button>
                    <button
                        className="text-button"
                        onClick={() => setDialog({ type: "shareWishlist" })}
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
                            wishlistSummary.savedGames.map(renderCard)
                        ) : (
                            <div className="empty">
                                <p>
                                    No saved games yet. Save a title with the heart
                                    button to start your personal library.
                                </p>
                                <button
                                    className="primary"
                                    style={{ marginTop: 18 }}
                                    onClick={() => changeView("Browse")}
                                >
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
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        justifyContent: "space-between",
                                    }}
                                    onClick={() =>
                                        changeView("Profile", person.id)
                                    }
                                >
                                    <span>
                                        <strong>{person.name}</strong>
                                        <small>{person.sharedCount} shared picks</small>
                                    </span>
                                    <span
                                        className="social-avatar"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            fontSize: 10,
                                        }}
                                    >
                                        {person.name
                                            .split(" ")
                                            .map((part) => part[0])
                                            .slice(0, 2)
                                            .join("")}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="empty">
                                Save games to see overlap with your friends.
                            </div>
                        )}
                    </div>
                </aside>
            </section>
        </section>
    )
}
