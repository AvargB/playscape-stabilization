/**
 * PLAYSCAPE prototype checkout contracts.
 *
 * Every record in this module is local, simulated, and explicitly not a real
 * purchase, payment, order, license, or gift delivery. Game and person data is
 * always referenced by canonical IDs from the existing catalog/social data.
 */

/** Dedicated key; wishlist, social, review, and compare records are untouched. */
export const CHECKOUT_KEYS = {
    storage: "playscape-checkout-v1",
    version: 1,
} as const

export type PurchaseType = "personal" | "gift"
export type PaymentMethodType = "card" | "wallet" | "prototype"
export type GiftStatus = "received" | "accepted" | "declined"
export type TransactionStatus = "simulated-complete"
/** Review, fake payment details, then receipt. */
export type CheckoutStep = "review" | "payment" | "complete"
export type GiftDecision = Extract<GiftStatus, "accepted" | "declined">

export type CheckoutSession = {
    /** Stable per dialog opening; prevents duplicate submissions. */
    id: string
    gameId: number
    /** Optional edition selected in the cart; defaults to the standard edition. */
    edition?: string
    purchaseType: PurchaseType
    recipientId: string | null
    giftMessage: string
    paymentMethod: PaymentMethodType
}

export type PrototypeTransaction = {
    id: string
    sessionId: string
    gameId: number
    /** Catalog-resolved at purchase time; identity still uses gameId. */
    title: string
    edition?: string
    senderId: string
    recipientId: string | null
    type: PurchaseType
    price: number | null
    paymentMethod: PaymentMethodType
    createdAt: string
    status: TransactionStatus
    giftMessage: string | null
    delivery: "immediate" | null
    giftStatus: GiftStatus | null
}

export type CheckoutState = {
    /** Complete simulated history. Views are derived; no duplicate ledgers. */
    transactions: PrototypeTransaction[]
    /** Prototype-only library overlay from personal simulated purchases. */
    ownedGameIds: number[]
}

export type CheckoutSummary = {
    gameId: number
    edition: string
    title: string
    developer: string | null
    publisher: string | null
    price: number | null
    priceLabel: string
    subtotal: number | null
    total: number | null
}

export type CheckoutResult =
    | { ok: true; transaction: PrototypeTransaction }
    | { ok: false; errors: string[] }

export type GiftResponseResult =
    | { ok: true; transaction: PrototypeTransaction }
    | { ok: false; errors: string[] }

export const CHECKOUT_DISCLAIMER =
    "PLAYSCAPE Prototype Checkout — No real payment will be processed."

export const PURCHASE_TYPES: ReadonlyArray<{
    id: PurchaseType
    label: string
    description: string
}> = [
    {
        id: "personal",
        label: "Purchase for Myself",
        description: "Add the game to a local prototype library. No license is delivered.",
    },
    {
        id: "gift",
        label: "Gift to a Friend",
        description: "Create a simulated gift record for one existing PLAYSCAPE friend.",
    },
]

export const PAYMENT_METHODS: ReadonlyArray<{
    id: PaymentMethodType
    label: string
    note: string
}> = [
    {
        id: "card",
        label: "Credit/Debit Card",
        note: "Illustrative preview only. No card fields are collected or stored.",
    },
    {
        id: "wallet",
        label: "Digital Wallet",
        note: "Prototype wallet preview. No wallet account is contacted.",
    },
    {
        id: "prototype",
        label: "Prototype Payment",
        note: "No details required. This is the safest way to explore the flow.",
    },
]

export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
    received: "Received",
    accepted: "Accepted",
    declined: "Declined",
}
