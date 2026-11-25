/** @jsxRuntime classic */
import * as React from "react"
import { steam, getGameById } from "../../data/games"
import { socialPeople, type SocialPerson } from "../../socialData"
import {
    formatPrototypePrice,
    formatTransactionDate,
    getOwnedGameIds,
    getPersonalPurchases,
    getReceivedGifts,
    getSentGifts,
    giftStatusLabel,
    transactionReference,
} from "./model"
import {
    CHECKOUT_DISCLAIMER,
    type CheckoutState,
    type GiftDecision,
    type GiftResponseResult,
    type PrototypeTransaction,
} from "./types"

export interface GiftHistoryProps {
    person: SocialPerson
    own: boolean
    state: CheckoutState
    renderAvatar?: (props: { id: string; size?: number }) => React.ReactNode
    onOpenGame?: (id: number) => void
    onRespondToGift?: (id: string, decision: GiftDecision) => GiftResponseResult
    /** Full canonical library supplied by the app; ledger-only when omitted. */
    ownedIds?: number[]
}

function PersonChip({
    id,
    label,
    renderAvatar,
}: {
    id: string
    label: string
    renderAvatar?: (props: { id: string; size?: number }) => React.ReactNode
}) {
    const person = socialPeople.find((entry) => entry.id === id)
    return (
        <div className="gift-person">
            {renderAvatar ? (
                renderAvatar({ id, size: 30 })
            ) : (
                <span className={"social-avatar av-" + id} role="img" aria-label={person?.name}>
                    {person?.initials ?? "?"}
                </span>
            )}
            <span>
                <small>{label}</small>
                <strong>{person?.name ?? "Unknown PLAYSCAPE player"}</strong>
                {person?.handle && <small>{person.handle}</small>}
            </span>
        </div>
    )
}

export default function GiftHistory({
    person,
    own,
    state,
    renderAvatar,
    onOpenGame,
    onRespondToGift,
    ownedIds = [],
}: GiftHistoryProps) {
    const [responseErrors, setResponseErrors] = React.useState<Record<string, string>>({})
    const received = getReceivedGifts(state, person.id)
    const sent = own ? getSentGifts(state, "you") : []
    const purchases = own ? getPersonalPurchases(state, "you") : []
    const libraryIds = ownedIds.length
        ? Array.from(new Set(ownedIds))
        : getOwnedGameIds(state, person.id)

    const acquisitionLabel = (id: number) => {
        if (purchases.some((entry) => entry.gameId === id)) return "Personal purchase"
        if (
            received.some(
                (entry) => entry.gameId === id && entry.giftStatus === "accepted",
            )
        ) {
            return "Accepted gift"
        }
        return "Seeded prototype game"
    }

    function gameTitle(id: number): string {
        return getGameById(id)?.title ?? "Unavailable game"
    }

    function respond(transaction: PrototypeTransaction, decision: GiftDecision) {
        if (!onRespondToGift) return
        const result = onRespondToGift(transaction.id, decision)
        if (result.ok === false) {
            setResponseErrors((current) => ({
                ...current,
                [transaction.id]: result.errors[0] ?? "This gift response could not be saved.",
            }))
            return
        }
        setResponseErrors((current) => {
            const next = { ...current }
            delete next[transaction.id]
            return next
        })
    }

    function giftCard(transaction: PrototypeTransaction, direction: "received" | "sent") {
        const game = getGameById(transaction.gameId)
        const counterpartyId =
            direction === "received" ? transaction.senderId : transaction.recipientId
        const recipientName = transaction.recipientId
            ? socialPeople.find((entry) => entry.id === transaction.recipientId)?.name ??
              "the recipient"
            : person.name
        return (
            <article
                className="gift-card"
                data-gift-id={transaction.id}
                data-gift-status={transaction.giftStatus ?? undefined}
                key={transaction.id}
            >
                <div className="gift-art">
                    {game ? (
                        <button
                            type="button"
                            aria-label={"View " + game.title}
                            onClick={() => onOpenGame?.(transaction.gameId)}
                        >
                            <img src={steam(transaction.gameId)} alt={game.title + " artwork"} />
                        </button>
                    ) : (
                        <span className="gift-art-missing">Artwork unavailable</span>
                    )}
                </div>
                <div className="gift-body">
                    <div className="gift-card-head">
                        <div>
                            <div className="kicker">
                                {direction === "received" ? "Received gift" : "Sent gift"}
                            </div>
                            {onOpenGame ? (
                                <button
                                    type="button"
                                    className="person-link gift-title"
                                    onClick={() => onOpenGame(transaction.gameId)}
                                >
                                    {gameTitle(transaction.gameId)}
                                </button>
                            ) : (
                                <h3>{gameTitle(transaction.gameId)}</h3>
                            )}
                        </div>
                        <span
                            className={
                                "gift-status " +
                                (transaction.giftStatus ?? "received")
                            }
                        >
                            {giftStatusLabel(transaction.giftStatus)}
                        </span>
                    </div>
                    {counterpartyId && (
                        <PersonChip
                            id={counterpartyId}
                            label={direction === "received" ? "From" : "To"}
                            renderAvatar={renderAvatar}
                        />
                    )}
                    {transaction.giftMessage && (
                        <blockquote>“{transaction.giftMessage}”</blockquote>
                    )}
                    <dl className="gift-facts">
                        <div>
                            <dt>Simulated total</dt>
                            <dd>{formatPrototypePrice(transaction.price)}</dd>
                        </div>
                        <div>
                            <dt>Date</dt>
                            <dd title={transaction.createdAt}>
                                {formatTransactionDate(transaction.createdAt)}
                            </dd>
                        </div>
                        <div>
                            <dt>Reference</dt>
                            <dd>{transactionReference(transaction)}</dd>
                        </div>
                    </dl>
                    {transaction.giftStatus === "accepted" && (
                        <p className="gift-note" role="status">
                            Accepted — added to {recipientName}’s prototype library. No real
                            game license was delivered.
                        </p>
                    )}
                    {transaction.giftStatus === "declined" && (
                        <p className="gift-note">
                            Declined. The historical prototype record is kept.
                        </p>
                    )}
                    {direction === "received" &&
                        transaction.recipientId === person.id &&
                        transaction.giftStatus === "received" &&
                        onRespondToGift && (
                            <div className="gift-actions">
                                <button
                                    className="primary"
                                    type="button"
                                    onClick={() => respond(transaction, "accepted")}
                                >
                                    Accept gift
                                </button>
                                <button
                                    className="web-secondary"
                                    type="button"
                                    onClick={() => respond(transaction, "declined")}
                                >
                                    Decline gift
                                </button>
                            </div>
                        )}
                    {responseErrors[transaction.id] && (
                        <p className="gift-error" role="alert">
                            {responseErrors[transaction.id]}
                        </p>
                    )}
                </div>
            </article>
        )
    }

    function empty(message: string) {
        return <div className="empty">{message}</div>
    }

    return (
        <div className="gift-history" data-profile-id={person.id}>
            <p className="chk-disclaimer" role="note">
                {CHECKOUT_DISCLAIMER}
            </p>
            <section className="profile-section">
                <div className="section-head">
                    <h2>Received Gifts</h2>
                    <p className="social-muted">
                        Prototype gift records only — never a real delivery.
                    </p>
                </div>
                {received.length ? (
                    <div className="gift-list">
                        {received.map((transaction) => giftCard(transaction, "received"))}
                    </div>
                ) : (
                    empty("No simulated gifts received yet.")
                )}
            </section>

            {own && (
                <>
                    <section className="profile-section">
                        <div className="section-head">
                            <h2>Personal purchases</h2>
                            <p className="social-muted">
                                Simulated purchases are kept separate from gifts.
                            </p>
                        </div>
                        {purchases.length ? (
                            <div className="gift-list">
                                {purchases.map((transaction) => (
                                    <article
                                        className="gift-card gift-purchase"
                                        data-transaction-id={transaction.id}
                                        key={transaction.id}
                                    >
                                        <div className="gift-art">
                                            {getGameById(transaction.gameId) && (
                                                <img
                                                    src={steam(transaction.gameId)}
                                                    alt={gameTitle(transaction.gameId) + " artwork"}
                                                />
                                            )}
                                        </div>
                                        <div className="gift-body">
                                            <div className="kicker">Simulated purchase</div>
                                            <h3>{gameTitle(transaction.gameId)}</h3>
                                            <dl className="gift-facts">
                                                <div>
                                                    <dt>Simulated total</dt>
                                                    <dd>
                                                        {formatPrototypePrice(transaction.price)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Date</dt>
                                                    <dd title={transaction.createdAt}>
                                                        {formatTransactionDate(transaction.createdAt)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Reference</dt>
                                                    <dd>{transactionReference(transaction)}</dd>
                                                </div>
                                            </dl>
                                            <p className="gift-note">
                                                No real purchase occurred and no license was
                                                delivered.
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            empty("No simulated purchases yet.")
                        )}
                    </section>

                    <section className="profile-section">
                        <div className="section-head">
                            <h2>Sent gifts</h2>
                            <p className="social-muted">
                                Historical prototype gift records stay here even if declined.
                            </p>
                        </div>
                        {sent.length ? (
                            <div className="gift-list">
                                {sent.map((transaction) => giftCard(transaction, "sent"))}
                            </div>
                        ) : (
                            empty("No gifts sent yet.")
                        )}
                    </section>
                </>
            )}

            <section className="profile-section">
                <div className="section-head">
                    <h2>Prototype library</h2>
                    <p className="social-muted">
                        Seeded games, simulated purchases, and accepted gifts — tied to canonical game IDs.
                    </p>
                </div>
                {libraryIds.length ? (
                    <ul className="gift-library" role="list">
                        {libraryIds.map((id) => (
                            <li key={id} data-owned-game={id}>
                                <img src={steam(id)} alt="" />
                                <span>
                                    {gameTitle(id)}
                                    <small>{acquisitionLabel(id)}</small>
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    empty(`${own ? "Your" : `${person.name}’s`} prototype library is empty.`)
                )}
            </section>
        </div>
    )
}
