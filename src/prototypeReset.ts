/**
 * Explicit prototype reset support.
 *
 * PLAYSCAPE keeps every persisted feature in its own versioned record. This
 * module only names those records and asks the shared storage owner to remove
 * them; it never reads, writes, or interprets a record itself.
 */

import {
    APP_STORAGE_KEY,
    LEGACY_SOCIAL_STORAGE_KEY,
    SOCIAL_STORAGE_KEY,
    removeVersionedRecord,
} from "./social"
import { CART_KEYS } from "./features/checkout/cart"
import { CHECKOUT_KEYS } from "./features/checkout/types"
import { COMPARE_KEYS } from "./features/compare/types"
import { REVIEW_KEYS } from "./features/reviews/types"

export type PrototypeResetScope = "purchases" | "all"

export const PROTOTYPE_RESET_KEYS = {
    purchases: [CHECKOUT_KEYS.storage, CART_KEYS.storage] as const,
    all: [
        CHECKOUT_KEYS.storage,
        CART_KEYS.storage,
        APP_STORAGE_KEY,
        SOCIAL_STORAGE_KEY,
        LEGACY_SOCIAL_STORAGE_KEY,
        REVIEW_KEYS.storage,
        COMPARE_KEYS.storage,
    ] as const,
}

/**
 * Clears the named records for a user-confirmed reset. Scoped resets never
 * touch wishlists, social activity, reviews, or comparison state.
 */
export function clearPrototypeStorage(scope: PrototypeResetScope): string[] {
    const keys: readonly string[] =
        scope === "all" ? PROTOTYPE_RESET_KEYS.all : PROTOTYPE_RESET_KEYS.purchases
    for (const key of keys) removeVersionedRecord(key)
    return [...keys]
}
