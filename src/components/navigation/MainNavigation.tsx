import * as React from "react"
import { Icon } from "../Icon"
import {
    NavigationItem,
    type NavigationDestination,
} from "./NavigationItem"
import { socialPeople } from "../../socialData"

const currentProfile = socialPeople.find((person) => person.id === "you")

export const PRIMARY_NAVIGATION: NavigationDestination[] = [
    "Discover",
    "Browse",
    "Wishlist",
    "Community",
]

export const MOBILE_NAVIGATION: NavigationDestination[] = [
    "Discover",
    "Browse",
    "Wishlist",
    "Community",
]

export const COMMUNITY_NAVIGATION: NavigationDestination[] = [
    "Community",
    "The Web",
    "Gaming Circles",
]

export const STORE_NAVIGATION: NavigationDestination[] = [
    "Browse",
    "Compare",
]

const COMMUNITY_VIEWS = ["Community", "The Web", "Gaming Circles"]
const STORE_VIEWS = ["Browse", "Compare"]

interface MainNavigationProps {
    currentView: string
    atmosphere: string
    wishlistCount: number
    cartCount?: number
    onOpenCart?: () => void
    menuOpen: boolean
    query: string
    onNavigate: (destination: NavigationDestination) => void
    onToggleMenu: () => void
    onQueryChange: (query: string) => void
    onSearchSubmit: () => void
}

export function MainNavigation({
    currentView,
    atmosphere,
    wishlistCount,
    cartCount = 0,
    onOpenCart,
    menuOpen,
    query,
    onNavigate,
    onToggleMenu,
    onQueryChange,
    onSearchSubmit,
}: MainNavigationProps) {
    const isPrimaryCurrent = (destination: NavigationDestination) =>
        destination === currentView ||
        (destination === "Community" && COMMUNITY_VIEWS.includes(currentView)) ||
        (destination === "Browse" && STORE_VIEWS.includes(currentView))

    return (
        <>
            <header className="nav">
                <NavigationItem
                    destination="Discover"
                    label={
                        <>
                            <span className="brand-mark" />
                            playscape
                        </>
                    }
                    onNavigate={onNavigate}
                    className="brand"
                    ariaLabel="Playscape home"
                />
                <nav className="navlinks" aria-label="Main navigation">
                    {PRIMARY_NAVIGATION.map((destination) => (
                        <NavigationItem
                            key={destination}
                            destination={destination}
                            active={isPrimaryCurrent(destination)}
                            badgeCount={destination === "Wishlist" ? wishlistCount : undefined}
                            onNavigate={onNavigate}
                        />
                    ))}
                </nav>
                <div className="navtools">
                    <button
                        type="button"
                        className="nav-theme"
                        aria-label={`Atmosphere: ${atmosphere}. Change`}
                        onClick={() => onNavigate("Personalization")}
                    >
                        <Icon
                            name={
                                atmosphere === "Winter"
                                    ? "snow"
                                    : atmosphere === "Summer"
                                        ? "sun"
                                        : atmosphere === "Spring"
                                            ? "flower"
                                            : "leaf"
                            }
                            size={16}
                        />
                    </button>
                    <label className="search" style={{ flexDirection: "row" }}>
                        <Icon name="search" size={15} />
                        <input
                            aria-label="Search games"
                            placeholder="Search games"
                            value={query}
                            onChange={(event) => onQueryChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") onSearchSubmit()
                            }}
                        />
                    </label>
                    {onOpenCart && (
                        <button
                            type="button"
                            className="cart-button"
                            aria-label={`Open prototype cart, ${cartCount} ${
                                cartCount === 1 ? "game" : "games"
                            }`}
                            onClick={onOpenCart}
                        >
                            <Icon name="cart" size={17} />
                            {cartCount > 0 && (
                                <span className="cart-count" aria-hidden="true">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className="avatar"
                        aria-label="Open your player profile"
                        onClick={() => onNavigate("Profile")}
                    >
                        {currentProfile?.initials}
                    </button>
                    <button
                        type="button"
                        className="mobile-menu"
                        aria-label="Toggle navigation"
                        aria-expanded={menuOpen}
                        onClick={onToggleMenu}
                    >
                        <Icon name="menu" />
                    </button>
                </div>
            </header>
            {menuOpen && (
                <nav className="mobile-links" aria-label="Mobile navigation">
                    {MOBILE_NAVIGATION.map((destination) => (
                        <NavigationItem
                            key={destination}
                            destination={destination}
                            onNavigate={onNavigate}
                        />
                    ))}
                </nav>
            )}
            {COMMUNITY_VIEWS.includes(currentView) && (
                <nav className="social-destinations" aria-label="Community pages">
                    {COMMUNITY_NAVIGATION.map((destination) => (
                        <NavigationItem
                            key={destination}
                            destination={destination}
                            active={currentView === destination}
                            onNavigate={onNavigate}
                        />
                    ))}
                </nav>
            )}
            {STORE_VIEWS.includes(currentView) && (
                <nav className="social-destinations" aria-label="Store pages">
                    {STORE_NAVIGATION.map((destination) => (
                        <NavigationItem
                            key={destination}
                            destination={destination}
                            active={currentView === destination}
                            onNavigate={onNavigate}
                        />
                    ))}
                </nav>
            )}
        </>
    )
}
