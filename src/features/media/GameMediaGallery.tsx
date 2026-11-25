/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { steam, type GameMedia, type GameRecord } from "../../data/games"
import { filterMedia, getGameMedia, getMediaLabel, isVideoMedia } from "./model"

type GalleryFilter = "all" | "gameplay" | "trailer" | "screenshot"

const FILTERS: { id: GalleryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "gameplay", label: "Gameplay" },
    { id: "trailer", label: "Trailers" },
    { id: "screenshot", label: "Screenshots" },
]

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return ""
    const minutes = Math.floor(seconds / 60)
    const remainder = Math.floor(seconds % 60)
    return `${minutes}:${String(remainder).padStart(2, "0")}`
}

export interface GameMediaGalleryProps {
    game: GameRecord
}

/**
 * Product-page media gallery. Selection is local presentation state; all
 * metadata comes from the canonical GameRecord via getGameMedia().
 */
export default function GameMediaGallery({ game }: GameMediaGalleryProps) {
    const items = React.useMemo(() => getGameMedia(game), [game])
    const hasOptionalMedia = items.some((item) => item.type !== "cover")
    const [filter, setFilter] = React.useState<GalleryFilter>("all")
    const visible = React.useMemo(() => filterMedia(items, filter), [items, filter])
    const [selectedId, setSelectedId] = React.useState<string | null>(null)
    const selected =
        visible.find((item) => item.id === selectedId) ?? visible[0] ?? null

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState(false)
    const [playing, setPlaying] = React.useState(false)
    const [duration, setDuration] = React.useState("")
    const [fullscreen, setFullscreen] = React.useState(false)
    const [lightbox, setLightbox] = React.useState(false)
    const stageRef = React.useRef<HTMLDivElement>(null)
    const videoRef = React.useRef<HTMLVideoElement>(null)
    const lightboxCloseRef = React.useRef<HTMLButtonElement>(null)
    const lastTriggerRef = React.useRef<HTMLElement | null>(null)
    const selectedIndex = selected ? visible.findIndex((item) => item.id === selected.id) : -1

    React.useEffect(() => {
        setLoading(true)
        setError(false)
        setPlaying(false)
        setDuration(selected?.duration ?? "")
    }, [selected?.id, selected?.duration])

    React.useEffect(() => {
        if (typeof document === "undefined") return
        const update = () => setFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener("fullscreenchange", update)
        return () => document.removeEventListener("fullscreenchange", update)
    }, [])

    React.useEffect(() => {
        if (!lightbox || typeof document === "undefined") return
        lightboxCloseRef.current?.focus()
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeLightbox()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [lightbox])

    function closeLightbox() {
        setLightbox(false)
        if (typeof window !== "undefined") {
            window.requestAnimationFrame?.(() => lastTriggerRef.current?.focus?.())
        }
    }

    function openLightbox(event: React.MouseEvent<HTMLButtonElement>) {
        lastTriggerRef.current = event.currentTarget
        setLightbox(true)
    }

    function step(direction: number) {
        if (visible.length < 2 || selectedIndex < 0) return
        const next = visible[(selectedIndex + direction + visible.length) % visible.length]
        setSelectedId(next.id)
    }

    function handleKeys(event: React.KeyboardEvent<HTMLElement>) {
        const target = event.target as HTMLElement
        if (target.tagName === "VIDEO" || target.tagName === "BUTTON") return
        if (event.key === "ArrowLeft") {
            event.preventDefault()
            step(-1)
        } else if (event.key === "ArrowRight") {
            event.preventDefault()
            step(1)
        }
    }

    async function togglePlay() {
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
            try {
                await video.play()
                setPlaying(true)
            } catch {
                setError(true)
            }
        } else {
            video.pause()
            setPlaying(false)
        }
    }

    function retry() {
        const video = videoRef.current
        if (!video) return
        setError(false)
        setLoading(true)
        video.load()
    }

    async function toggleFullscreen() {
        const node = stageRef.current
        if (!node) return
        try {
            if (typeof document !== "undefined" && document.fullscreenElement) {
                await document.exitFullscreen()
            } else if (node.requestFullscreen) {
                await node.requestFullscreen()
            }
        } catch {
            setError(true)
        }
    }

    return (
        <section className="media-gallery" aria-label={`${game.title} media gallery`}>
            <div className="media-gallery-head">
                <div>
                    <h3>Media gallery</h3>
                    <p>
                        {hasOptionalMedia
                            ? "Gameplay, trailers, and artwork from the central catalog."
                            : "No gameplay footage or screenshots are available yet. Cover artwork is shown instead."}
                    </p>
                </div>
                {selected && (
                    <span className="media-selected-indicator" role="status">
                        {getMediaLabel(selected)} {selectedIndex + 1} of {visible.length}
                    </span>
                )}
            </div>

            <div className="media-filters" role="group" aria-label="Filter media">
                {FILTERS.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        className={"media-filter" + (filter === option.id ? " selected" : "")}
                        aria-pressed={filter === option.id}
                        onClick={() => setFilter(option.id)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="media-empty" role="status">
                    <Icon name="image" />
                    <p>No {filter === "all" ? "media" : filter} is available for this game yet.</p>
                    <button type="button" onClick={() => setFilter("all")}>
                        Show cover artwork
                    </button>
                </div>
            ) : (
                <>
                    <div
                        className="media-stage"
                        ref={stageRef}
                        onKeyDown={handleKeys}
                        tabIndex={0}
                        aria-label="Media viewer. Use left and right arrow keys to change media."
                    >
                        {selected && isVideoMedia(selected) ? (
                            <div className="media-video-shell">
                                <video
                                    key={selected.id}
                                    ref={videoRef}
                                    src={selected.url}
                                    poster={
                                        selected.thumbnail || steam(game.steamAppId || game.id)
                                    }
                                    controls
                                    playsInline
                                    preload="metadata"
                                    aria-label={
                                        selected.title || `${game.title} ${getMediaLabel(selected)}`
                                    }
                                    onWaiting={() => setLoading(true)}
                                    onCanPlay={() => setLoading(false)}
                                    onLoadedMetadata={(event) => {
                                        setLoading(false)
                                        if (!selected.duration) {
                                            setDuration(
                                                formatDuration(event.currentTarget.duration),
                                            )
                                        }
                                    }}
                                    onPlay={() => setPlaying(true)}
                                    onPause={() => setPlaying(false)}
                                    onError={() => {
                                        setLoading(false)
                                        setError(true)
                                    }}
                                />
                                {loading && !error && (
                                    <span className="media-loading" role="status">
                                        Loading media…
                                    </span>
                                )}
                                {error && (
                                    <div className="media-error" role="alert">
                                        <span>
                                            This media source could not be loaded. Cover artwork
                                            remains available.
                                        </span>
                                        <button type="button" onClick={retry}>
                                            Try again
                                        </button>
                                    </div>
                                )}
                                <div className="media-video-controls">
                                    <button
                                        type="button"
                                        onClick={togglePlay}
                                        aria-label={playing ? "Pause video" : "Play video"}
                                    >
                                        <Icon name={playing ? "pause" : "play"} size={14} />
                                    </button>
                                    <span className="media-volume-hint">
                                        <Icon name="volume" size={14} /> Volume in player controls
                                    </span>
                                    {duration && (
                                        <span className="media-duration">{duration}</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={toggleFullscreen}
                                        aria-label={
                                            fullscreen ? "Exit fullscreen" : "Open fullscreen"
                                        }
                                    >
                                        <Icon name="expand" size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : selected ? (
                            <div className="media-image-shell">
                                <img
                                    key={selected.id}
                                    src={selected.url}
                                    alt={
                                        selected.description ||
                                        selected.title ||
                                        `${game.title} ${getMediaLabel(selected).toLowerCase()}`
                                    }
                                    onError={() => setError(true)}
                                />
                                <span className="media-type-badge">
                                    <Icon name="image" size={13} />
                                    {getMediaLabel(selected)}
                                </span>
                                {error && (
                                    <div className="media-error" role="alert">
                                        <span>This image could not be loaded.</span>
                                        <button
                                            type="button"
                                            onClick={() => setError(false)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="media-expand-image"
                                    aria-label={`Enlarge ${selected.title || "image"}`}
                                    onClick={openLightbox}
                                >
                                    <Icon name="expand" size={16} />
                                </button>
                            </div>
                        ) : null}
                        {visible.length > 1 && (
                            <div className="media-stage-nav">
                                <button
                                    type="button"
                                    aria-label="Previous media item"
                                    onClick={() => step(-1)}
                                >
                                    <Icon name="chevron-left" size={16} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next media item"
                                    onClick={() => step(1)}
                                >
                                    <Icon name="chevron-right" size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {selected && (
                        <div className="media-caption">
                            <strong>{selected.title || getMediaLabel(selected)}</strong>
                            {selected.description && <p>{selected.description}</p>}
                            {selected.source && <p className="media-source">{selected.source}</p>}
                            {isVideoMedia(selected) && selected.duration && (
                                <span className="media-duration-inline">
                                    {selected.duration}
                                </span>
                            )}
                        </div>
                    )}

                    <div
                        className="media-thumbnails"
                        role="group"
                        aria-label="Choose media item"
                        onKeyDown={handleKeys}
                    >
                        {visible.map((item: GameMedia) => (
                            <button
                                key={item.id}
                                type="button"
                                className={
                                    "media-thumb" +
                                    (selected?.id === item.id ? " selected" : "")
                                }
                                aria-pressed={selected?.id === item.id}
                                aria-label={`Show ${getMediaLabel(item)}${
                                    item.title ? `: ${item.title}` : ""
                                }`}
                                onClick={() => setSelectedId(item.id)}
                            >
                                <img
                                    src={
                                        item.thumbnail ||
                                        (isVideoMedia(item)
                                            ? steam(game.steamAppId || game.id)
                                            : item.url)
                                    }
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                />
                                <span className="media-thumb-label">
                                    {getMediaLabel(item)}
                                    {isVideoMedia(item) && (
                                        <Icon name="play" size={11} />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {lightbox && selected && (
                <div
                    className="media-lightbox"
                    onClick={closeLightbox}
                    role="presentation"
                >
                    <section
                        className="media-lightbox-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${selected.title || "Media"} expanded view`}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") closeLightbox()
                        }}
                    >
                        <div className="modal-head">
                            <h3>{selected.title || getMediaLabel(selected)}</h3>
                            <button
                                ref={lightboxCloseRef}
                                type="button"
                                className="icon-button"
                                aria-label="Close expanded media view"
                                onClick={closeLightbox}
                            >
                                <Icon name="close" />
                            </button>
                        </div>
                        <img
                            src={selected.url}
                            alt={selected.description || selected.title || game.title}
                        />
                        {selected.source && <p className="media-source">{selected.source}</p>}
                    </section>
                </div>
            )}
        </section>
    )
}
