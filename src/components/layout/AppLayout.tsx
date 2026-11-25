import * as React from "react"
import {
    MainNavigation,
} from "../navigation/MainNavigation"
import type { NavigationDestination } from "../navigation/NavigationItem"
import { GlobalFooter } from "./GlobalFooter"

interface AppLayoutProps {
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
    children: React.ReactNode
}

export function AppLayout({
    currentView,
    atmosphere,
    wishlistCount,
    cartCount,
    onOpenCart,
    menuOpen,
    query,
    onNavigate,
    onToggleMenu,
    onQueryChange,
    onSearchSubmit,
    children,
}: AppLayoutProps) {
    return (
        <div className="wrap">
            <MainNavigation
                currentView={currentView}
                atmosphere={atmosphere}
                wishlistCount={wishlistCount}
                cartCount={cartCount}
                onOpenCart={onOpenCart}
                menuOpen={menuOpen}
                query={query}
                onNavigate={onNavigate}
                onToggleMenu={onToggleMenu}
                onQueryChange={onQueryChange}
                onSearchSubmit={onSearchSubmit}
            />
            <div className="app-content">{children}</div>
            <GlobalFooter atmosphere={atmosphere} onNavigate={onNavigate} />
        </div>
    )
}
