import * as React from "react"
import type { NavigationDestination } from "../navigation/NavigationItem"

interface GlobalFooterProps {
    atmosphere: string
    onNavigate: (destination: NavigationDestination) => void
}

/**
 * One footer for every route. The mark is the same CSS brand mark used by the
 * navigation; its seasonal color comes from the root theme class, so it stays
 * in sync with atmosphere changes without a second theme source.
 */
export function GlobalFooter({ atmosphere, onNavigate }: GlobalFooterProps) {
    const season = atmosphere.toLowerCase()

    return (
        <footer
            className="global-footer"
            aria-label="Site footer"
            data-atmosphere={season}
        >
            <p className="global-footer-disclaimer">PLAYSCAPE is a prototype.</p>
            <button
                type="button"
                className="global-footer-logo"
                aria-label="Return to PLAYSCAPE home"
                data-atmosphere={season}
                onClick={() => onNavigate("Discover")}
            >
                <span className="brand-mark" aria-hidden="true" />
            </button>
            <span className="global-footer-title">PLAYSCAPE</span>
        </footer>
    )
}
