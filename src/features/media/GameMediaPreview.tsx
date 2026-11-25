/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { steam, type GameRecord } from "../../data/games"
import { getFeaturedPreview } from "./model"

const activePreviews = new Map<symbol, () => void>()

function claimPreview(token: symbol, stop: () => void) {
    activePreviews.forEach((other, otherToken) => {
        if (otherToken !== token) other()
    })
    activePreviews.set(token, stop)
}

export interface GameMediaPreviewProps {
    game: GameRecord
    /** Selector for the artwork area that should start and stop playback. */
    hostSelector?: string
}

/**
 * Compact, delayed, muted video preview overlay for game artwork.
 * It never replaces the static cover markup and does not load a video until a
 * deliberate hover/focus or explicit button press activates it. Playable
 * trailers are used when the catalog has no gameplay footage.
 */
export default function GameMediaPreview({
    game,
    hostSelector = ".game-art",
}: GameMediaPreviewProps) {
    const media = React.useMemo(() => getFeaturedPreview(game), [game])
    const previewKind = media?.type === "trailer" ? "trailer" : "gameplay"
    const tokenRef = React.useRef<symbol>(Symbol("game-media-preview"))
    const wrapRef = React.useRef<HTMLSpanElement>(null)
    const videoRef = React.useRef<HTMLVideoElement>(null)
    const timerRef = React.useRef<number | null>(null)
    const [active, setActive] = React.useState(false)
    const [failed, setFailed] = React.useState(false)
    const [inView, setInView] = React.useState(false)
    const [reducedMotion, setReducedMotion] = React.useState(false)

    const clearTimer = React.useCallback(() => {
        if (timerRef.current !== null && typeof window !== "undefined") {
            window.clearTimeout(timerRef.current)
        }
        timerRef.current = null
    }, [])

    const stop = React.useCallback(() => {
        clearTimer()
        const video = videoRef.current
        if (video) {
            video.pause()
            try {
                video.currentTime = 0
            } catch {
                /* Some browsers reject seeking before metadata is loaded. */
            }
        }
        activePreviews.delete(tokenRef.current)
        setActive(false)
    }, [clearTimer])

    const activate = React.useCallback(() => {
        if (!media || !inView || failed) return
        claimPreview(tokenRef.current, stop)
        setActive(true)
    }, [media, inView, failed, stop])

    const schedule = React.useCallback(
        (pointerType?: string) => {
            if (!media || !inView || failed || reducedMotion) return
            if (pointerType === "touch") return
            clearTimer()
            if (typeof window === "undefined") return
            timerRef.current = window.setTimeout(activate, 500)
        },
        [media, inView, failed, reducedMotion, clearTimer, activate],
    )

    React.useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return
        const query = window.matchMedia("(prefers-reduced-motion: reduce)")
        const update = () => setReducedMotion(query.matches)
        update()
        query.addEventListener?.("change", update)
        return () => query.removeEventListener?.("change", update)
    }, [])

    React.useEffect(() => {
        const node = wrapRef.current
        if (!node || typeof IntersectionObserver === "undefined") {
            setInView(true)
            return
        }
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.some((entry) => entry.isIntersecting)
                setInView(visible)
                if (!visible) stop()
            },
            { threshold: 0.05 },
        )
        observer.observe(node)
        return () => {
            observer.disconnect()
            stop()
        }
    }, [stop])

    React.useEffect(() => {
        const art = wrapRef.current?.closest<HTMLElement>(hostSelector)
        if (!art) return
        const onArtPointerEnter = (event: PointerEvent) => schedule(event.pointerType)
        const onArtFocusIn = () => schedule()
        const onArtFocusOut = (event: FocusEvent) => {
            const next = event.relatedTarget as Node | null
            if (next && art.contains(next)) return
            stop()
        }
        art.addEventListener("pointerenter", onArtPointerEnter)
        art.addEventListener("pointerleave", stop)
        art.addEventListener("focusin", onArtFocusIn)
        art.addEventListener("focusout", onArtFocusOut)
        return () => {
            art.removeEventListener("pointerenter", onArtPointerEnter)
            art.removeEventListener("pointerleave", stop)
            art.removeEventListener("focusin", onArtFocusIn)
            art.removeEventListener("focusout", onArtFocusOut)
        }
    }, [hostSelector, schedule, stop])

    React.useEffect(() => {
        if (!active) return
        const video = videoRef.current
        if (!video) return
        const attempt = video.play()
        if (attempt && typeof attempt.catch === "function") {
            attempt.catch(() => {
                setFailed(true)
                stop()
            })
        }
    }, [active, stop])

    if (!media) return null

    function toggleExplicit() {
        if (active) {
            stop()
            return
        }
        clearTimer()
        setFailed(false)
        setInView(true)
        claimPreview(tokenRef.current, stop)
        setActive(true)
    }

    return (
        <span
            className={"game-media-preview" + (active ? " is-active" : "")}
            ref={wrapRef}
            onPointerEnter={(event) => schedule(event.pointerType)}
            onPointerLeave={stop}
            onFocus={() => schedule()}
            onBlur={(event) => {
                const next = event.relatedTarget as Node | null
                if (next && wrapRef.current?.contains(next)) return
                stop()
            }}
        >
            {active && !failed && (
                <video
                    ref={videoRef}
                    className="game-media-preview-video"
                    src={media.url}
                    poster={media.thumbnail || steam(game.steamAppId || game.id)}
                    aria-label={media.title || `${game.title} ${previewKind} preview`}
                    muted
                    loop
                    playsInline
                    preload="none"
                    onError={() => {
                        setFailed(true)
                        stop()
                    }}
                />
            )}
            {active && failed && (
                <span className="game-media-preview-fallback" role="status">
                    Preview unavailable
                </span>
            )}
            <button
                type="button"
                className="game-media-preview-toggle"
                aria-label={
                    active
                        ? `Stop ${previewKind} preview for ${game.title}`
                        : `Play ${previewKind} preview for ${game.title}`
                }
                aria-pressed={active}
                onClick={(event) => {
                    event.stopPropagation()
                    toggleExplicit()
                }}
            >
                <Icon name={active ? "pause" : "play"} size={14} />
                <span>{active ? "Stop" : "Preview"}</span>
            </button>
        </span>
    )
}
