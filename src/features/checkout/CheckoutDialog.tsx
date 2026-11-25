/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { steam, type GameRecord } from "../../data/games"
import { socialPeople, type SocialPerson } from "../../socialData"
import {
    CHECKOUT_DISCLAIMER,
    GIFT_STATUS_LABELS,
    PAYMENT_METHODS,
    PURCHASE_TYPES,
    type CheckoutResult,
    type CheckoutSession,
    type CheckoutStep,
    type GiftStatus,
    type PaymentMethodType,
    type PrototypeTransaction,
    type PurchaseType,
} from "./types"
import {
    buildCheckoutSummary,
    formatPrototypePrice,
    formatTransactionDate,
    isDirectFriend,
    transactionReference,
} from "./model"

export interface CheckoutDialogProps {
    game: GameRecord
    sessionId: string
    initialPurchaseType?: PurchaseType
    /** Useful for restoring a prototype flow in tests or deep links. */
    initialStep?: CheckoutStep
    initialCompleted?: PrototypeTransaction | null
    friends?: SocialPerson[]
    currentUser?: SocialPerson
    renderAvatar?: (props: { id: string; size?: number }) => React.ReactNode
    onClose: () => void
    onComplete: (session: CheckoutSession) => CheckoutResult
    onViewProfile?: (id: string) => void
}

const STEP_LABELS: Array<{ id: Exclude<CheckoutStep, "complete">; label: string }> = [
    { id: "review", label: "Order review" },
    { id: "details", label: "Details" },
    { id: "payment", label: "Payment" },
    { id: "confirm", label: "Confirm" },
]

export default function CheckoutDialog({
    game,
    sessionId,
    initialPurchaseType = "personal",
    initialStep = "review",
    initialCompleted = null,
    friends,
    currentUser = socialPeople[0],
    renderAvatar,
    onClose,
    onComplete,
    onViewProfile,
}: CheckoutDialogProps) {
    const summary = React.useMemo(() => buildCheckoutSummary(game), [game])
    const availableFriends = React.useMemo(
        () =>
            (friends ?? socialPeople).filter((person) =>
                isDirectFriend(person.id, friends ?? socialPeople),
            ),
        [friends],
    )
    const [purchaseType, setPurchaseType] = React.useState<PurchaseType>(
        initialCompleted?.type ?? initialPurchaseType,
    )
    const [recipientId, setRecipientId] = React.useState<string | null>(
        initialCompleted?.recipientId ?? null,
    )
    const [friendQuery, setFriendQuery] = React.useState("")
    const [giftMessage, setGiftMessage] = React.useState(initialCompleted?.giftMessage ?? "")
    const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodType>("prototype")
    const [confirmed, setConfirmed] = React.useState(false)
    const [step, setStep] = React.useState<CheckoutStep>(initialStep)
    const [errors, setErrors] = React.useState<string[]>([])
    const [submitting, setSubmitting] = React.useState(false)
    const [completed, setCompleted] = React.useState<PrototypeTransaction | null>(
        initialCompleted,
    )
    const submitLock = React.useRef(false)

    const filteredFriends = React.useMemo(() => {
        const query = friendQuery.trim().toLowerCase()
        if (!query) return availableFriends
        return availableFriends.filter(
            (person) =>
                person.name.toLowerCase().includes(query) ||
                person.handle.toLowerCase().includes(query),
        )
    }, [availableFriends, friendQuery])
    const recipient = availableFriends.find((person) => person.id === recipientId) ?? null
    const isGift = purchaseType === "gift"

    function AvatarView({ id, size = 30 }: { id: string; size?: number }) {
        if (renderAvatar) return <>{renderAvatar({ id, size })}</>
        const person = (friends ?? socialPeople).find((entry) => entry.id === id) ?? socialPeople[0]
        return (
            <span
                className={"social-avatar av-" + id}
                style={{ width: size, height: size }}
                role="img"
                aria-label={person.name + " avatar"}
            >
                {person.initials}
            </span>
        )
    }

    function chooseType(next: PurchaseType) {
        setPurchaseType(next)
        setErrors([])
        setConfirmed(false)
        if (next === "personal") setRecipientId(null)
    }

    function continueFromDetails() {
        if (isGift && !isDirectFriend(recipientId, friends ?? socialPeople)) {
            setErrors(["Choose one of your existing PLAYSCAPE friends before continuing."])
            return
        }
        setErrors([])
        setStep("payment")
    }

    function confirmCheckout() {
        if (submitLock.current) return
        if (!confirmed) {
            setErrors(["Confirm that this is a prototype checkout before continuing."])
            return
        }
        submitLock.current = true
        setSubmitting(true)
        const session: CheckoutSession = {
            id: sessionId,
            gameId: game.id,
            purchaseType,
            recipientId: isGift ? recipientId : null,
            giftMessage: isGift ? giftMessage : "",
            paymentMethod,
        }
        try {
            const result = onComplete(session)
            if (result.ok === false) {
                setErrors(result.errors)
                return
            }
            setErrors([])
            setCompleted(result.transaction)
            setStep("complete")
        } catch (error) {
            setErrors([
                error instanceof Error
                    ? error.message
                    : "This simulated checkout could not be completed.",
            ])
        } finally {
            submitLock.current = false
            setSubmitting(false)
        }
    }

    function orderCard() {
        return (
            <section className="chk-order" aria-label="Order summary">
                <img src={steam(game.id)} alt={game.title + " artwork"} />
                <div>
                    <div className="kicker">Prototype order</div>
                    <h3>{summary.title}</h3>
                    <p className="chk-muted">
                        {summary.developer
                            ? `Developer: ${summary.developer}`
                            : "Developer not listed in the prototype catalog"}
                        {summary.publisher ? ` · Publisher: ${summary.publisher}` : ""}
                    </p>
                    <p className="chk-price">{summary.priceLabel}</p>
                    <p className="chk-muted">
                        Catalog sample only — not a live storefront price.
                    </p>
                </div>
            </section>
        )
    }

    function totals() {
        return (
            <dl className="chk-totals">
                <div>
                    <dt>Simulated subtotal</dt>
                    <dd>{formatPrototypePrice(summary.subtotal)}</dd>
                </div>
                <div>
                    <dt>Simulated total</dt>
                    <dd>{formatPrototypePrice(summary.total)}</dd>
                </div>
            </dl>
        )
    }

    function paymentChooser() {
        return (
            <fieldset className="chk-fieldset">
                <legend>Simulated payment method</legend>
                {PAYMENT_METHODS.map((method) => (
                    <label
                        className={
                            "chk-choice" +
                            (paymentMethod === method.id ? " selected" : "")
                        }
                        key={method.id}
                    >
                        <input
                            type="radio"
                            name="chk-payment"
                            checked={paymentMethod === method.id}
                            onChange={() => {
                                setPaymentMethod(method.id)
                                setErrors([])
                            }}
                        />
                        <span>
                            <strong>{method.label}</strong>
                            <small>{method.note}</small>
                        </span>
                    </label>
                ))}
            </fieldset>
        )
    }

    return (
        <div className="veil" onClick={onClose}>
            <section
                className="modal checkout-modal"
                role="dialog"
                aria-modal="true"
                aria-label="PLAYSCAPE prototype checkout"
                aria-busy={submitting}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                    if (event.key === "Escape") onClose()
                }}
            >
                <div className="modal-head">
                    <div>
                        <div className="kicker">PLAYSCAPE prototype checkout</div>
                        <h2>{completed ? "Prototype receipt" : "A world worth sharing"}</h2>
                    </div>
                    <button
                        className="icon-button"
                        autoFocus
                        aria-label="Cancel checkout"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>
                <p className="chk-disclaimer" role="note">
                    {CHECKOUT_DISCLAIMER}
                </p>

                {step === "complete" && completed ? (
                    <div className="chk-complete" data-checkout-complete="true">
                        <div className="chk-success-icon" aria-hidden="true">
                            <Icon name="check" size={22} />
                        </div>
                        <h2>{isGift ? "Gift Sent!" : "Prototype checkout complete"}</h2>
                        <p className="chk-success" role="status">
                            {isGift
                                ? "A simulated gift record was created. No payment, license, email, or external delivery occurred."
                                : "A simulated purchase record was created. No payment or game license was delivered."}
                        </p>
                        <section className="chk-receipt">
                            <img src={steam(completed.gameId)} alt={summary.title + " artwork"} />
                            <div>
                                <div className="kicker">Game</div>
                                <h3>{summary.title}</h3>
                                {isGift && recipient && (
                                    <div className="chk-person">
                                        <AvatarView id={recipient.id} size={34} />
                                        <span>
                                            <strong>{recipient.name}</strong>
                                            <small>{recipient.handle}</small>
                                        </span>
                                    </div>
                                )}
                                <div className="chk-person">
                                    <AvatarView id={currentUser.id} size={34} />
                                    <span>
                                        <strong>{currentUser.name}</strong>
                                        <small>{currentUser.handle}</small>
                                    </span>
                                </div>
                            </div>
                        </section>
                        {completed.giftMessage && (
                            <blockquote className="chk-message">
                                “{completed.giftMessage}”
                            </blockquote>
                        )}
                        <dl className="chk-receipt-facts">
                            <div>
                                <dt>Simulated total</dt>
                                <dd>{formatPrototypePrice(completed.price)}</dd>
                            </div>
                            <div>
                                <dt>Transaction date</dt>
                                <dd title={completed.createdAt}>
                                    {formatTransactionDate(completed.createdAt)}
                                </dd>
                            </div>
                            <div>
                                <dt>Prototype reference</dt>
                                <dd data-transaction-reference="true">
                                    {transactionReference(completed)}
                                </dd>
                            </div>
                            {isGift && (
                                <div>
                                    <dt>Gift status</dt>
                                    <dd>
                                        {GIFT_STATUS_LABELS[
                                            (completed.giftStatus ?? "received") as GiftStatus
                                        ]}
                                    </dd>
                                </div>
                            )}
                        </dl>
                        <div className="chk-footer">
                            {isGift && recipient && onViewProfile && (
                                <button
                                    className="web-secondary"
                                    type="button"
                                    onClick={() => onViewProfile(recipient.id)}
                                >
                                    View recipient’s profile
                                </button>
                            )}
                            <button className="primary" type="button" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <ol className="chk-steps" aria-label="Checkout progress">
                            {STEP_LABELS.map((entry, index) => {
                                const currentIndex = STEP_LABELS.findIndex(
                                    (item) => item.id === step,
                                )
                                return (
                                    <li
                                        key={entry.id}
                                        className={
                                            index <= currentIndex ? "complete" : ""
                                        }
                                        aria-current={
                                            step === entry.id ? "step" : undefined
                                        }
                                    >
                                        <span>{index + 1}</span>
                                        {entry.label}
                                    </li>
                                )
                            })}
                        </ol>

                        {step === "review" && (
                            <form onSubmit={(event) => { event.preventDefault(); setStep("details") }}>
                                {orderCard()}
                                <fieldset className="chk-fieldset">
                                    <legend>What would you like to do?</legend>
                                    {PURCHASE_TYPES.map((option) => (
                                        <label
                                            className={
                                                "chk-choice" +
                                                (purchaseType === option.id ? " selected" : "")
                                            }
                                            key={option.id}
                                        >
                                            <input
                                                type="radio"
                                                name="chk-type"
                                                checked={purchaseType === option.id}
                                                onChange={() => chooseType(option.id)}
                                            />
                                            <span>
                                                <strong>{option.label}</strong>
                                                <small>{option.description}</small>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                                <p className="chk-status" role="status">
                                    {isGift
                                        ? "Gift flow selected — you’ll choose an existing friend next."
                                        : "Personal purchase selected — this only creates a local prototype record."}
                                </p>
                                {totals()}
                                <div className="chk-footer">
                                    <button className="web-secondary" type="button" onClick={onClose}>
                                        Cancel checkout
                                    </button>
                                    <button className="primary" type="submit">
                                        Continue <Icon name="arrow" size={15} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "details" && (
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    continueFromDetails()
                                }}
                            >
                                <section className="chk-section">
                                    <div className="section-head">
                                        <h3>{isGift ? "Gift details" : "Purchase details"}</h3>
                                    </div>
                                    {orderCard()}
                                    {isGift ? (
                                        <>
                                            <label className="chk-label">
                                                Search your friends
                                                <input
                                                    type="search"
                                                    value={friendQuery}
                                                    onChange={(event) =>
                                                        setFriendQuery(event.target.value)
                                                    }
                                                    placeholder="Name or username"
                                                    aria-label="Search friends"
                                                />
                                            </label>
                                            <div
                                                className="chk-friend-list"
                                                role="listbox"
                                                aria-label="Existing PLAYSCAPE friends"
                                            >
                                                {filteredFriends.map((person) => (
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={recipientId === person.id}
                                                        className={
                                                            "chk-friend" +
                                                            (recipientId === person.id
                                                                ? " selected"
                                                                : "")
                                                        }
                                                        key={person.id}
                                                        onClick={() => {
                                                            setRecipientId(person.id)
                                                            setErrors([])
                                                        }}
                                                    >
                                                        <AvatarView id={person.id} size={32} />
                                                        <span>
                                                            <strong>{person.name}</strong>
                                                            <small>{person.handle}</small>
                                                        </span>
                                                        {recipientId === person.id && (
                                                            <Icon name="check" size={14} />
                                                        )}
                                                    </button>
                                                ))}
                                                {!filteredFriends.length && (
                                                    <p className="chk-muted">
                                                        No friends match that search.
                                                    </p>
                                                )}
                                            </div>
                                            {recipient && (
                                                <p className="chk-status" role="status">
                                                    Sending to {recipient.name} ({recipient.handle}).
                                                </p>
                                            )}
                                            <label className="chk-label">
                                                Gift message
                                                <textarea
                                                    value={giftMessage}
                                                    onChange={(event) =>
                                                        setGiftMessage(event.target.value)
                                                    }
                                                    maxLength={500}
                                                    rows={3}
                                                    placeholder="A note for a friend…"
                                                    aria-label="Gift message"
                                                />
                                            </label>
                                            <p className="chk-muted">
                                                {giftMessage.length}/500 characters
                                            </p>
                                            <p className="chk-note">
                                                <strong>Delivery preference:</strong> Immediate,
                                                prototype only. No email, notification, or
                                                external delivery occurs.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="chk-note">
                                                Review the order above. No ownership is
                                                granted until you finish the simulated flow.
                                            </p>
                                            {paymentChooser()}
                                        </>
                                    )}
                                </section>
                                {errors.length > 0 && (
                                    <ul className="chk-errors" role="alert">
                                        {errors.map((error) => (
                                            <li key={error}>{error}</li>
                                        ))}
                                    </ul>
                                )}
                                <div className="chk-footer">
                                    <button
                                        className="web-secondary"
                                        type="button"
                                        onClick={() => setStep("review")}
                                    >
                                        Back
                                    </button>
                                    <button className="primary" type="submit">
                                        Continue to payment <Icon name="arrow" size={15} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "payment" && (
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    setErrors([])
                                    setStep("confirm")
                                }}
                            >
                                <section className="chk-section">
                                    <div className="section-head">
                                        <h3>Simulated payment</h3>
                                    </div>
                                    {paymentChooser()}
                                    <div className="chk-payment-preview" role="note">
                                        {paymentMethod === "card" && (
                                            <p>
                                                Illustrative card preview:
                                                <strong> •••• •••• •••• 0000</strong>. No card
                                                number, CVV, or billing field is collected.
                                            </p>
                                        )}
                                        {paymentMethod === "wallet" && (
                                            <p>
                                                Illustrative wallet:
                                                <strong> prototype@example.invalid</strong>.
                                                No wallet account is contacted.
                                            </p>
                                        )}
                                        {paymentMethod === "prototype" && (
                                            <p>
                                                No payment details required. This option simply
                                                records the simulated transaction locally.
                                            </p>
                                        )}
                                    </div>
                                    {totals()}
                                </section>
                                <div className="chk-footer">
                                    <button
                                        className="web-secondary"
                                        type="button"
                                        onClick={() => setStep("details")}
                                    >
                                        Back
                                    </button>
                                    <button className="primary" type="submit">
                                        Review final order <Icon name="arrow" size={15} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "confirm" && (
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    confirmCheckout()
                                }}
                            >
                                <section className="chk-section">
                                    <div className="section-head">
                                        <h3>Final confirmation</h3>
                                    </div>
                                    {orderCard()}
                                    <dl className="chk-receipt-facts">
                                        <div>
                                            <dt>Purchase type</dt>
                                            <dd>{isGift ? "Gift to a friend" : "Personal purchase"}</dd>
                                        </div>
                                        {isGift && (
                                            <>
                                                <div>
                                                    <dt>Recipient</dt>
                                                    <dd>
                                                        {recipient
                                                            ? `${recipient.name} ${recipient.handle}`
                                                            : "No valid friend selected"}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Gift message</dt>
                                                    <dd>
                                                        {giftMessage.trim()
                                                            ? `“${giftMessage.trim()}”`
                                                            : "No message added"}
                                                    </dd>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <dt>Simulated payment</dt>
                                            <dd>
                                                {
                                                    PAYMENT_METHODS.find(
                                                        (method) => method.id === paymentMethod,
                                                    )?.label
                                                }
                                            </dd>
                                        </div>
                                    </dl>
                                    {totals()}
                                    <p className="chk-status" role="status">
                                        Ready to create a simulated prototype record. Nothing
                                        will be purchased, delivered, or sent.
                                    </p>
                                    <p className="chk-note">
                                        Confirming creates a local prototype record only. It
                                        does not buy a game, deliver a license, or notify
                                        anyone.
                                    </p>
                                    <label className="chk-confirm">
                                        <input
                                            type="checkbox"
                                            checked={confirmed}
                                            onChange={(event) => {
                                                setConfirmed(event.target.checked)
                                                setErrors([])
                                            }}
                                        />
                                        <span>
                                            I understand this is a prototype and no real
                                            transaction will occur.
                                        </span>
                                    </label>
                                </section>
                                {errors.length > 0 && (
                                    <ul className="chk-errors" role="alert">
                                        {errors.map((error) => (
                                            <li key={error}>{error}</li>
                                        ))}
                                    </ul>
                                )}
                                <div className="chk-footer">
                                    <button
                                        className="web-secondary"
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => setStep("payment")}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className="primary"
                                        type="submit"
                                        disabled={!confirmed || submitting}
                                    >
                                        {submitting
                                            ? "Saving prototype record…"
                                            : isGift
                                                ? `Confirm gift for ${recipient?.name.split(" ")[0] ?? "friend"}`
                                                : "Confirm simulated purchase"}
                                        {!submitting && <Icon name="arrow" size={15} />}
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}
