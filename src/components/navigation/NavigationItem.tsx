import * as React from "react"

export type NavigationDestination =
    | "Discover"
    | "Browse"
    | "Wishlist"
    | "The Web"
    | "Community"
    | "Gaming Circles"
    | "Profile"
    | "Personalization"
    | "Compare"

export interface NavigationItemProps {
    destination: NavigationDestination
    label?: React.ReactNode
    ariaLabel?: string
    active?: boolean
    badgeCount?: number
    onNavigate: (destination: NavigationDestination) => void
    className?: string
}

export function NavigationItem({
    destination,
    label,
    ariaLabel,
    active = false,
    badgeCount,
    onNavigate,
    className,
}: NavigationItemProps) {
    const displayedLabel =
        label ?? (destination === "Browse" ? "Store" : destination)
    const badge = badgeCount && badgeCount > 0 ? ` (${badgeCount})` : ""

    return (
        <button
            type="button"
            className={className ? `${className}${active ? " current" : ""}` : active ? "current" : undefined}
            aria-current={active ? "page" : undefined}
            aria-label={ariaLabel}
            onClick={() => onNavigate(destination)}
        >
            {displayedLabel}
            {destination === "Wishlist" ? badge : ""}
        </button>
    )
}
