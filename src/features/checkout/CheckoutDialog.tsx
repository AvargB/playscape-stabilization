/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { steam, type GameRecord } from "../../data/games"
import { socialPeople, type SocialPerson } from "../../socialData"
import {
    CHECKOUT_DISCLAIMER,
    GIFT_STATUS_LABELS,
    PURCHASE_TYPES,
    type CheckoutResult,
    type CheckoutSession,
    type CheckoutStep,
    type GiftStatus,
    type PrototypeTransaction,
    type PurchaseType,
} from "./types"
import {
    buildCheckoutSummary,
    formatPrototypePrice,
    formatTransactionDate,
    isDirectFriend,
    transactionReference,
    validateCheckoutSession,
} from "./model"
import { playUiSound } from "../sound/uiSounds"

export interface CheckoutDialogProps {
    /** Single-game entry point. Kept for direct game/compare checkout. */
    game?: GameRecord
    /** Multi-game entry point used by the cart. */
    games?: GameRecord[]
    sessionId: string
    initialPurchaseType?: PurchaseType
    /** "review", "payment", and "complete" are the displayed steps. */
    initialStep?: CheckoutStep
    initialCompleted?: PrototypeTransaction | PrototypeTransaction[] | null
    friends?: SocialPerson[]
    currentUser?: SocialPerson
    renderAvatar?: (props: { id: string; size?: number }) => React.ReactNode
    cartMode?: boolean
    onAddToCart?: (id: number) => void
    onRemoveFromCart?: (id: number) => void
    onClearCart?: () => void
    onClose: () => void
    onComplete: (session: CheckoutSession) => CheckoutResult
    onViewProfile?: (id: string) => void
}

function asArray(
    value: PrototypeTransaction | PrototypeTransaction[] | null | undefined,
): PrototypeTransaction[] {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
}

/** Fixed, clearly synthetic values that prefill the fake payment form. */
const DEMO_CARD_DETAILS = {
    label: "Demo card",
    number: "0000 0000 0000 0000",
    expiry: "12/30",
    code: "000",
} as const

/**
 * Compact prototype checkout: review, fake payment details, then receipt.
 * Payment choice and repeated price/total panels were removed; fake card
 * details are prefilled with fixed demo values, stay in local component state,
 * and are never stored or transmitted.
 */
export default function CheckoutDialog({
    game,
    games,
    sessionId,
    initialPurchaseType = "personal",
    initialStep = "review",
    initialCompleted = null,
    friends,
    currentUser = socialPeople[0],
    renderAvatar,
    cartMode = false,
    onAddToCart,
    onRemoveFromCart,
    onClearCart,
    onClose,
    onComplete,
    onViewProfile,
}: CheckoutDialogProps) {
    const checkoutGames = React.useMemo(() => {
        if (games?.length) return games
        return game ? [game] : []
    }, [games, game])
    const summaries = React.useMemo(
        () => checkoutGames.map((entry) => buildCheckoutSummary(entry)),
        [checkoutGames],
    )
    const availableFriends = React.useMemo(
        () =>
            (friends ?? socialPeople).filter((person) =>
                isDirectFriend(person.id, friends ?? socialPeople),
            ),
        [friends],
    )
    const completedTransactions = React.useMemo(() => asArray(initialCompleted), [initialCompleted])
    const restored = completedTransactions[0]
    const [purchaseType, setPurchaseType] = React.useState<PurchaseType>(
        restored?.type ?? initialPurchaseType,
    )
    const [recipientId, setRecipientId] = React.useState<string | null>(
        restored?.recipientId ?? null,
    )
    const [friendQuery, setFriendQuery] = React.useState("")
    const [giftMessage, setGiftMessage] = React.useState(restored?.giftMessage ?? "")
    const [fakeCardLabel, setFakeCardLabel] = React.useState<string>(DEMO_CARD_DETAILS.label)
    const [fakeCardNumber, setFakeCardNumber] = React.useState<string>(DEMO_CARD_DETAILS.number)
    const [fakeExpiry, setFakeExpiry] = React.useState<string>(DEMO_CARD_DETAILS.expiry)
    const [fakeCode, setFakeCode] = React.useState<string>(DEMO_CARD_DETAILS.code)
    const [step, setStep] = React.useState<CheckoutStep>(
        initialStep === "complete" && completedTransactions.length
            ? "complete"
            : initialStep === "payment"
                ? "payment"
                : "review",
    )
    const [errors, setErrors] = React.useState<string[]>([])
    const [submitting, setSubmitting] = React.useState(false)
    const [completed, setCompleted] = React.useState<PrototypeTransaction[]>(completedTransactions)
    const submitLock = React.useRef(false)
    const previousStep = React.useRef(step)

    React.useEffect(() => {
        if (step === "complete" && previousStep.current !== "complete") {
            playUiSound("success")
        }
        previousStep.current = step
    }, [step])

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
    const isGiftReceipt = completed.some((entry) => entry.type === "gift")
    const receiptRecipient = completed.find((entry) => entry.recipientId)
        ? availableFriends.find(
              (person) =>
                  person.id === completed.find((entry) => entry.recipientId)?.recipientId,
          ) ?? null
        : null

    if (!checkoutGames.length) return null

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
        if (next === "personal") setRecipientId(null)
    }

    function validateSelection(): boolean {
        if (isGift && !isDirectFriend(recipientId, friends ?? socialPeople)) {
            setErrors(["Choose one of your existing PLAYSCAPE friends before continuing."])
            return false
        }
        return true
    }

    function validateReview(): boolean {
        if (!validateSelection()) return false
        const validationErrors = buildSessions().flatMap((session) =>
            validateCheckoutSession(session),
        )
        if (validationErrors.length) {
            setErrors(Array.from(new Set(validationErrors)))
            return false
        }
        return true
    }

    function validateFakePayment(): boolean {
        const digits = fakeCardNumber.replace(/\D/g, "")
        const code = fakeCode.replace(/\D/g, "")
        const nextErrors: string[] = []
        if (!fakeCardLabel.trim()) nextErrors.push("Add a nickname for the prototype card.")
        if (digits.length < 4 || digits.length > 19) {
            nextErrors.push("Enter 4–19 fake digits for the number.")
        }
        if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(fakeExpiry.trim())) {
            nextErrors.push("Use a fake expiry like 12/30.")
        }
        if (code.length < 3 || code.length > 4) {
            nextErrors.push("Enter a 3–4 digit fake code.")
        }
        if (nextErrors.length) {
            setErrors(nextErrors)
            return false
        }
        return true
    }

    function buildSessions(): CheckoutSession[] {
        return checkoutGames.map((entry, index) => ({
            id: checkoutGames.length === 1 ? sessionId : `${sessionId}-${entry.id}-${index}`,
            gameId: entry.id,
            purchaseType,
            recipientId: isGift ? recipientId : null,
            giftMessage: isGift ? giftMessage : "",
            paymentMethod: "prototype",
        }))
    }

    function goToPayment() {
        if (submitLock.current || !validateReview()) return
        setErrors([])
        setStep("payment")
    }

    function backToReview() {
        setErrors([])
        setStep("review")
    }

    function resetDemoPayment() {
        setFakeCardLabel(DEMO_CARD_DETAILS.label)
        setFakeCardNumber(DEMO_CARD_DETAILS.number)
        setFakeExpiry(DEMO_CARD_DETAILS.expiry)
        setFakeCode(DEMO_CARD_DETAILS.code)
        setErrors([])
    }

    function confirmCheckout() {
        if (submitLock.current || !validateReview() || !validateFakePayment()) return
        const sessions = buildSessions()
        submitLock.current = true
        setSubmitting(true)
        const records: PrototypeTransaction[] = []
        try {
            for (const session of sessions) {
                const result = onComplete(session)
                if (result.ok === false) {
                    setErrors(result.errors)
                    return
                }
                records.push(result.transaction)
            }
            setErrors([])
            setCompleted(records)
            setFakeCardLabel(DEMO_CARD_DETAILS.label)
            setFakeCardNumber(DEMO_CARD_DETAILS.number)
            setFakeExpiry(DEMO_CARD_DETAILS.expiry)
            setFakeCode(DEMO_CARD_DETAILS.code)
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

    function addToCart() {
        if (!onAddToCart) return
        checkoutGames.forEach((entry) => onAddToCart(entry.id))
        onClose()
    }

    function orderList() {
        return (
            <ul className="chk-item-list" aria-label="Prototype order">
                {checkoutGames.map((entry, index) => (
                    <li className="chk-item" key={entry.id}>
                        <img src={steam(entry.id)} alt={entry.title + " artwork"} />
                        <span>
                            <strong>{entry.title}</strong>
                            <small>
                                {summaries[index].developer
                                    ? summaries[index].developer
                                    : "Developer not listed"}
                                {summaries[index].publisher
                                    ? ` · ${summaries[index].publisher}`
                                    : ""}
                            </small>
                        </span>
                        {cartMode && onRemoveFromCart && (
                            <button
                                type="button"
                                className="chk-item-remove"
                                aria-label={`Remove ${entry.title} from cart`}
                                onClick={() => onRemoveFromCart(entry.id)}
                            >
                                <Icon name="close" size={13} />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        )
    }

    function receiptItem(entry: PrototypeTransaction, showSuccess = false) {
        const game = checkoutGames.find((item) => item.id === entry.gameId)
        const summary = game ? buildCheckoutSummary(game) : null
        const itemRecipient = availableFriends.find(
            (person) => person.id === entry.recipientId,
        )
        return (
            <section className="chk-receipt" key={entry.id}>
                {showSuccess && (
                    <span className="chk-success-icon" aria-hidden="true">
                        <Icon name="check" size={18} />
                    </span>
                )}
                <img src={steam(entry.gameId)} alt={summary?.title ?? "Game artwork"} />
                <div>
                    <div className="kicker">
                        {entry.type === "gift" ? "Prototype gift" : "Prototype purchase"}
                    </div>
                    <h3>{summary?.title ?? `Game ${entry.gameId}`}</h3>
                    {itemRecipient && (
                        <div className="chk-person">
                            <AvatarView id={itemRecipient.id} size={30} />
                            <span>
                                <strong>To {itemRecipient.name}</strong>
                                <small>{itemRecipient.handle}</small>
                            </span>
                        </div>
                    )}
                    <div className="chk-person">
                        <AvatarView id={currentUser.id} size={30} />
                        <span>
                            <strong>From {currentUser.name}</strong>
                            <small>{currentUser.handle}</small>
                        </span>
                    </div>
                    <dl className="chk-receipt-facts compact">
                        <div>
                            <dt>Simulated total</dt>
                            <dd>{formatPrototypePrice(entry.price)}</dd>
                        </div>
                        <div>
                            <dt>Date</dt>
                            <dd>{formatTransactionDate(entry.createdAt)}</dd>
                        </div>
                        <div>
                            <dt>Reference</dt>
                            <dd data-transaction-reference="true">
                                {transactionReference(entry)}
                            </dd>
                        </div>
                        {entry.type === "gift" && (
                            <div>
                                <dt>Status</dt>
                                <dd>
                                    {
                                        GIFT_STATUS_LABELS[
                                            (entry.giftStatus ?? "received") as GiftStatus
                                        ]
                                    }
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </section>
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
                        <div className="kicker">PLAYSCAPE</div>
                        <h2>
                            {step === "complete"
                                ? isGiftReceipt
                                    ? "Gift Sent!"
                                    : "Prototype checkout complete"
                                : step === "payment"
                                    ? "Fake payment details"
                                    : cartMode
                                        ? `Prototype cart · ${checkoutGames.length} ${
                                              checkoutGames.length === 1 ? "game" : "games"
                                          }`
                                        : "Prototype checkout"}
                        </h2>
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

                {step === "complete" && completed.length ? (
                    <div className="chk-complete" data-checkout-complete="true">
                        {completed.map((entry, index) => receiptItem(entry, index === 0))}
                        {completed.find((entry) => entry.giftMessage)?.giftMessage && (
                            <blockquote className="chk-message">
                                “{completed.find((entry) => entry.giftMessage)?.giftMessage}”
                            </blockquote>
                        )}
                        <div className="chk-footer">
                            {isGiftReceipt && receiptRecipient && onViewProfile && (
                                <button
                                    className="web-secondary"
                                    type="button"
                                    onClick={() => onViewProfile(receiptRecipient.id)}
                                >
                                    View recipient’s profile
                                </button>
                            )}
                            <button className="primary" type="button" onClick={onClose}>
                                Done
                            </button>
                        </div>
                    </div>
                ) : step === "payment" ? (
                    <form
                        className="chk-form chk-payment-form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            confirmCheckout()
                        }}
                    >
                        <section
                            className="chk-card chk-payment-card"
                            aria-labelledby="chk-payment-label"
                        >
                            <div className="chk-card-label" id="chk-payment-label">
                                <span className="chk-index">03</span>
                                Enter fake details
                            </div>
                            <p className="chk-payment-note" id="chk-payment-note">
                                Prefilled with demo values. Edit them or leave them as-is. Nothing is
                                saved, sent, or used for a real payment.
                            </p>
                            <button
                                type="button"
                                className="chk-use-demo"
                                onClick={resetDemoPayment}
                                disabled={submitting}
                            >
                                Restore demo details
                            </button>
                            <div className="chk-payment-grid">
                                <label className="chk-label">
                                    Prototype card nickname
                                    <input
                                        type="text"
                                        value={fakeCardLabel}
                                        onChange={(event) => setFakeCardLabel(event.target.value)}
                                        placeholder={DEMO_CARD_DETAILS.label}
                                        autoComplete="off"
                                        aria-describedby="chk-payment-note"
                                    />
                                </label>
                                <label className="chk-label">
                                    Fake number
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={fakeCardNumber}
                                        onChange={(event) =>
                                            setFakeCardNumber(event.target.value.replace(/[^\d\s-]/g, ""))
                                        }
                                        placeholder={DEMO_CARD_DETAILS.number}
                                        maxLength={23}
                                        autoComplete="off"
                                        aria-describedby="chk-payment-note"
                                    />
                                </label>
                                <label className="chk-label">
                                    Fake expiry
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={fakeExpiry}
                                        onChange={(event) =>
                                            setFakeExpiry(event.target.value.replace(/[^\d/]/g, ""))
                                        }
                                        placeholder={DEMO_CARD_DETAILS.expiry}
                                        maxLength={5}
                                        autoComplete="off"
                                        aria-describedby="chk-payment-note"
                                    />
                                </label>
                                <label className="chk-label">
                                    Fake code
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={fakeCode}
                                        onChange={(event) =>
                                            setFakeCode(event.target.value.replace(/\D/g, ""))
                                        }
                                        placeholder={DEMO_CARD_DETAILS.code}
                                        maxLength={4}
                                        autoComplete="off"
                                        aria-describedby="chk-payment-note"
                                    />
                                </label>
                            </div>
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
                                onClick={backToReview}
                                disabled={submitting}
                            >
                                Back
                            </button>
                            <button
                                className="primary"
                                type="submit"
                                data-sound="none"
                                disabled={submitting}
                            >
                                {submitting
                                    ? "Saving prototype record…"
                                    : isGift
                                        ? checkoutGames.length > 1
                                            ? "Send prototype gifts"
                                            : "Send prototype gift"
                                        : checkoutGames.length > 1
                                            ? "Create prototype records"
                                            : "Create prototype record"}
                                {!submitting && <Icon name="arrow" size={15} />}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form
                        className="chk-form"
                        onSubmit={(event) => {
                            event.preventDefault()
                            goToPayment()
                        }}
                    >
                        <div className="chk-layout">
                            <section
                                className="chk-card chk-order-card"
                                aria-labelledby="chk-order-label"
                            >
                                <div className="chk-card-label" id="chk-order-label">
                                    <span className="chk-index">01</span>
                                    {cartMode ? "Your games" : "Your game"}
                                </div>
                                {orderList()}
                                {cartMode && onClearCart && (
                                    <button
                                        type="button"
                                        className="chk-clear-cart"
                                        onClick={onClearCart}
                                    >
                                        Clear cart
                                    </button>
                                )}
                            </section>

                            <section
                                className="chk-card chk-choice-card"
                                aria-labelledby="chk-choice-label"
                            >
                                <div className="chk-card-label" id="chk-choice-label">
                                    <span className="chk-index">02</span>
                                    Choose an option
                                </div>
                                <div
                                    className="chk-choice-row"
                                    role="group"
                                    aria-label="Purchase type"
                                >
                                    {PURCHASE_TYPES.map((option) => (
                                        <button
                                            type="button"
                                            key={option.id}
                                            className={
                                                "chk-choice-button" +
                                                (purchaseType === option.id ? " selected" : "")
                                            }
                                            aria-pressed={purchaseType === option.id}
                                            onClick={() => chooseType(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                {isGift && (
                                    <div className="chk-gift-fields">
                                        <h3 className="chk-gift-heading">Choose a friend</h3>
                                        <label className="chk-label">
                                            Search your friends
                                            <input
                                                type="search"
                                                value={friendQuery}
                                                onChange={(event) => setFriendQuery(event.target.value)}
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
                                                        (recipientId === person.id ? " selected" : "")
                                                    }
                                                    key={person.id}
                                                    onClick={() => {
                                                        setRecipientId(person.id)
                                                        setErrors([])
                                                    }}
                                                >
                                                    <AvatarView id={person.id} size={36} />
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
                                                <p className="chk-muted">No friends match that search.</p>
                                            )}
                                        </div>
                                        <label className="chk-label">
                                            Gift message
                                            <textarea
                                                value={giftMessage}
                                                onChange={(event) => setGiftMessage(event.target.value)}
                                                maxLength={500}
                                                rows={3}
                                                placeholder="A note for a friend…"
                                                aria-label="Gift message"
                                            />
                                        </label>
                                        <p className="chk-muted">
                                            {giftMessage.length}/500 characters
                                        </p>
                                        <p className="chk-gift-status" role="status">
                                            {recipient
                                                ? `To ${recipient.name} · Immediate, prototype only. No email or delivery.`
                                                : "Choose a friend · Immediate, prototype only. No email or delivery."}
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>

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
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel checkout
                            </button>
                            {onAddToCart && !cartMode && (
                                <button
                                    className="web-secondary"
                                    type="button"
                                    onClick={addToCart}
                                    disabled={submitting}
                                >
                                    Add to cart
                                </button>
                            )}
                            <button className="primary" type="submit" disabled={submitting}>
                                Continue to payment
                                {!submitting && <Icon name="arrow" size={15} />}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    )
}
