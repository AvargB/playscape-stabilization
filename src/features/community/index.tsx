/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import {
    getPendingInviteSummary,
    type SocialInvite,
} from "../../socialState"
import { socialPeople, type SocialState } from "../../socialData"

export interface CommunityProps {
    social: {
        activity: any[]
        state: SocialState
        setDialog: (dialog: any) => void
        go: (destination: string, id?: string) => void
        respondToInvite: (id: string, status: string) => void
        saved: number[]
    }
    renderActivityCard: (item: any) => React.ReactNode
    renderSmallGame: (props: { id: number; reason: string }) => React.ReactNode
    changeView: (v: string, id?: string) => void
}

export default function Community({
    social,
    renderActivityCard,
    renderSmallGame,
    changeView,
}: CommunityProps) {
    const { activity, state, setDialog, go, respondToInvite, saved } = social
    const [filter, setFilter] = React.useState("For you")
    const [count, setCount] = React.useState(4)
    const items = activity.filter(
        (a: any) =>
            filter === "For you" ||
            (filter === "Saved picks" && state.savedRecs.includes(a.id)) ||
            a.category === filter,
    )
    const pendingInvites = (state.invites || []).filter(
        (invite: SocialInvite) => invite.status === "pending",
    )
    const inviteSummary = getPendingInviteSummary(
        state.invites || [],
        state.circles || [],
    )

    return (
        <main className="social-page">
            <header className="social-heading">
                <h1>Community</h1>
                <p>Activity and recommendations from your friends.</p>
                <div className="social-heading-actions">
                    <button
                        className="primary"
                        onClick={() =>
                            setDialog({ type: "recommend", game: 1055540 })
                        }
                    >
                        Recommend a game
                        <Icon name="arrow" size={16} />
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
                            "Acquired games",
                            "Prototype gifts",
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
                            <React.Fragment key={a.id}>
                                {renderActivityCard(a)}
                            </React.Fragment>
                        ))}
                        {!items.length && (
                            <div className="empty">No activity in this view yet.</div>
                        )}
                    </div>
                    {items.length > count && (
                        <button
                            className="web-secondary full"
                            onClick={() => setCount(count + 4)}
                        >
                            Load more
                        </button>
                    )}
                </div>
                <aside className="community-sidebar">
                    <div className="side-card">
                        <div className="kicker">A good place to belong</div>
                        <h2>Your Gaming Circles</h2>
                        {state.circles.map((circle: any) => (
                            <button
                                className="circle-mini"
                                key={circle.id}
                                onClick={() =>
                                    go("Gaming Circles", circle.id)
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
                                setDialog({ type: "createCircle" })
                            }
                        >
                            Create a circle
                        </button>
                    </div>
                    <div className="side-card">
                        <div className="kicker">Pending invites</div>
                        <h2>Circle requests</h2>
                        {pendingInvites.length ? (
                            pendingInvites.map((invite: SocialInvite) => {
                                const circle = state.circles.find(
                                    (entry: any) => entry.id === invite.circle,
                                )
                                const person = socialPeople.find(
                                    (entry) => entry.id === invite.person,
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
                                                    respondToInvite(
                                                        invite.id,
                                                        "accepted",
                                                    )
                                                }
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="text-button"
                                                onClick={() =>
                                                    respondToInvite(
                                                        invite.id,
                                                        "declined",
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
                                {inviteSummary.accepted > 0 ||
                                inviteSummary.declined > 0
                                    ? ` · ${inviteSummary.accepted} accepted · ${inviteSummary.declined} declined`
                                    : ""}
                            </small>
                        )}
                        {inviteSummary.total === 0 && (
                            <small className="social-muted">
                                {inviteSummary.accepted > 0 ||
                                inviteSummary.declined > 0
                                    ? `${inviteSummary.accepted} accepted · ${inviteSummary.declined} declined`
                                    : "No action needed right now."}
                            </small>
                        )}
                    </div>
                    <div className="side-card">
                        <div className="kicker">Overlapping wishlists</div>
                        <h2>On everyone’s mind</h2>
                        {renderSmallGame({ id: 972660, reason: "Jamie and Alex want to play" })}
                        {renderSmallGame({ id: 1172620, reason: "Jamie wants in. Alex & Morgan own it." })}
                    </div>
                    <div className="side-note">
                        <Icon name="leaf" size={20} />
                        <p>
                            Less noise.
                            <br />
                            More “you’d love this.”
                        </p>
                        <span>
                            Sample friends. Real possibilities.
                            <br />
                            Your interactions stay in this browser.
                        </span>
                    </div>
                </aside>
            </div>
        </main>
    )
}
