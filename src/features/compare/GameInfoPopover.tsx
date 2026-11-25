/** @jsxRuntime classic */
import * as React from "react"
import { createPortal } from "react-dom"

import { steam, type GameRecord } from "../../data/games"

export interface GameInfoTarget {
    game: GameRecord
    element: HTMLElement
    pinned: boolean
}

interface GameInfoPopoverProps {
    target: GameInfoTarget | null
    onClose: () => void
}

type Placement = "right" | "left" | "bottom" | "top"

interface Position {
    top: number
    left: number
    placement: Placement
}

const gap = 12
const margin = 10
const topBoundary = 84

/** A single comparison popover rendered outside scrolling/clipping ancestors. */
export function GameInfoPopover({ target, onClose }: GameInfoPopoverProps) {
    const popoverRef = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState<Position | null>(null)
    const gameId = target?.game.id
    const anchor = target?.element

    React.useLayoutEffect(() => {
        if (!target || typeof window === "undefined") return

        const update = () => {
            const element = target.element
            if (!element || !element.isConnected) {
                onClose()
                return
            }
            const rect = element.getBoundingClientRect()
            const size = popoverRef.current?.getBoundingClientRect()
            const width = size?.width || 280
            const height = size?.height || 180
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight
            const clamp = (value: number, min: number, max: number) =>
                Math.min(Math.max(value, min), Math.max(min, max))

            const obstacles = Array.from(
                document.querySelectorAll("button,a,input,select,textarea,[role='button']")
            )
                .filter((node) => !node.closest(".game-info-popover"))
                .map((node) => ({
                    box: node.getBoundingClientRect(),
                    weight: /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(node.tagName) ? 4 : 2,
                }))
            const overlapArea = (
                box: { left: number; top: number; right: number; bottom: number },
                other: DOMRect
            ) =>
                Math.max(0, Math.min(box.right, other.right) - Math.max(box.left, other.left)) *
                Math.max(0, Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top))
            const centeredLeft = clamp(
                rect.left + rect.width / 2 - width / 2,
                margin,
                viewportWidth - width - margin
            )
            const centeredTop = clamp(
                rect.top + rect.height / 2 - height / 2,
                topBoundary,
                viewportHeight - height - margin
            )
            const candidates: Array<{ placement: Placement; left: number; top: number }> = [
                { placement: "right", left: rect.right + gap, top: centeredTop },
                { placement: "left", left: rect.left - width - gap, top: centeredTop },
                { placement: "bottom", left: centeredLeft, top: rect.bottom + gap },
                { placement: "top", left: centeredLeft, top: rect.top - height - gap },
                { placement: "right", left: viewportWidth - width - margin, top: centeredTop },
                { placement: "left", left: margin, top: centeredTop },
                { placement: "bottom", left: margin, top: rect.bottom + gap },
                { placement: "top", left: margin, top: rect.top - height - gap },
            ]

            let best = candidates[0]
            let bestLeft = margin
            let bestTop = topBoundary
            let bestScore = Number.POSITIVE_INFINITY
            for (const candidate of candidates) {
                const left = clamp(candidate.left, margin, viewportWidth - width - margin)
                const top = clamp(candidate.top, topBoundary, viewportHeight - height - margin)
                const box = { left, top, right: left + width, bottom: top + height }
                const controlOverlap = obstacles.reduce(
                    (score, obstacle) => score + overlapArea(box, obstacle.box) * obstacle.weight,
                    0
                )
                const shifted = Math.abs(candidate.left - left) + Math.abs(candidate.top - top)
                const distance = Math.hypot(left - rect.left, top - rect.top)
                const score = controlOverlap + shifted * 2 + distance
                if (score < bestScore) {
                    best = candidate
                    bestLeft = left
                    bestTop = top
                    bestScore = score
                }
            }

            setPosition({
                left: Math.round(bestLeft),
                top: Math.round(bestTop),
                placement: best.placement,
            })
        }

        update()
        window.addEventListener("resize", update)
        window.addEventListener("scroll", update, true)
        return () => {
            window.removeEventListener("resize", update)
            window.removeEventListener("scroll", update, true)
        }
    }, [gameId, anchor, onClose])

    React.useEffect(() => {
        if (!target || typeof window === "undefined") return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [target, onClose])

    if (typeof document === "undefined" || !target) return null

    const { game } = target
    const portalTarget = document.body

    return createPortal(
        <div
            id="cmp-game-info"
            ref={popoverRef}
            className="game-info-popover"
            role="tooltip"
            data-placement={position?.placement || "right"}
            style={{ top: position?.top ?? -9999, left: position?.left ?? -9999 }}
        >
            <div className="game-info-popover-head">
                <img src={steam(game.steamAppId || game.id)} alt="" />
                <div>
                    <strong>{game.title}</strong>
                    <span>{game.genre}</span>
                </div>
            </div>
            <p>{game.desc}</p>
            <dl className="game-info-popover-meta">
                <div>
                    <dt>Listed price</dt>
                    <dd>${game.price.toFixed(2)}</dd>
                </div>
                <div>
                    <dt>Moods</dt>
                    <dd>{game.moods}</dd>
                </div>
                <div>
                    <dt>Typical session</dt>
                    <dd>{game.sessionMinutes} min</dd>
                </div>
                <div>
                    <dt>Platforms</dt>
                    <dd>{game.platforms.join(", ")}</dd>
                </div>
            </dl>
        </div>,
        portalTarget,
    )
}
