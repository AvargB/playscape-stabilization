import {
    steam,
    type GameMedia,
    type GameMediaType,
    type GameRecord,
} from "../../data/games"

const VIDEO_SOURCE = /\.(mp4|webm|ogg)(?:[?#]|$)/i

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringField(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeMediaType(value: unknown): GameMediaType | null {
    if (
        value === "gameplay" ||
        value === "trailer" ||
        value === "screenshot" ||
        value === "cover" ||
        value === "promotional"
    ) {
        return value
    }
    return null
}

/**
 * Reads optional media from a canonical GameRecord without mutating catalog
 * data. Legacy `trailerUrl` / `screenshots` fields are folded into the same
 * normalized collection so older seeds remain useful when populated.
 */
export function getGameMedia(game: GameRecord | null | undefined): GameMedia[] {
    if (!game) return []
    const raw = (game as GameRecord & { media?: unknown }).media
    const items: GameMedia[] = []
    const seen = new Set<string>()

    function add(item: GameMedia) {
        const key = `${item.type}:${item.url}`
        if (seen.has(key)) return
        seen.add(key)
        items.push(item)
    }

    if (Array.isArray(raw)) {
        raw.forEach((entry, index) => {
            if (!isRecord(entry)) return
            const type = normalizeMediaType(entry.type)
            const url = stringField(entry.url)
            if (!type || !url) return
            add({
                id: stringField(entry.id) ?? `${game.id}-${type}-${index}`,
                type,
                url,
                thumbnail: stringField(entry.thumbnail),
                title: stringField(entry.title),
                description: stringField(entry.description),
                source: stringField(entry.source),
                duration: stringField(entry.duration),
                featured: entry.featured === true,
            })
        })
    }

    const trailerUrl = stringField(game.trailerUrl)
    if (trailerUrl && !items.some((item) => item.url === trailerUrl)) {
        add({
            id: `${game.id}-trailer-legacy`,
            type: "trailer",
            url: trailerUrl,
            title: "Official trailer",
        })
    }

    ;(game.screenshots ?? []).forEach((url, index) => {
        const normalized = stringField(url)
        if (!normalized || items.some((item) => item.url === normalized)) return
        add({
            id: `${game.id}-screenshot-legacy-${index}`,
            type: "screenshot",
            url: normalized,
            title: `Screenshot ${index + 1}`,
        })
    })

    if (!items.some((item) => item.type === "cover")) {
        add({
            id: `${game.id}-cover`,
            type: "cover",
            url: steam(game.steamAppId || game.id),
            title: `${game.title} cover artwork`,
            thumbnail: steam(game.steamAppId || game.id),
        })
    }

    return items
}

export function isVideoMedia(item: GameMedia): boolean {
    return item.type === "gameplay" || item.type === "trailer" || VIDEO_SOURCE.test(item.url)
}

/**
 * Selects the featured item for compact previews. Trailers are never chosen
 * as a substitute for gameplay, and a featured item must be a valid video.
 */
export function getFeaturedPreview(
    game: GameRecord | null | undefined,
): GameMedia | null {
    const items = getGameMedia(game)
    const videos = items.filter(isVideoMedia)
    return (
        videos.find((item) => item.featured && item.type === "gameplay") ??
        videos.find((item) => item.type === "gameplay") ??
        null
    )
}

export function getMediaLabel(item: GameMedia): string {
    if (item.type === "gameplay") return "Gameplay"
    if (item.type === "trailer") return "Trailer"
    if (item.type === "screenshot") return "Screenshot"
    if (item.type === "cover") return "Cover"
    return "Promotional"
}

export function filterMedia(
    items: GameMedia[],
    filter: "all" | "gameplay" | "trailer" | "screenshot",
): GameMedia[] {
    if (filter === "all") return items
    if (filter === "gameplay") {
        return items.filter((item) => item.type === "gameplay")
    }
    return items.filter((item) => item.type === filter)
}
