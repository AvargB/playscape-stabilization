/** @jsxRuntime classic */
import * as React from "react"
import { Icon } from "../../components/Icon"
import { gameCatalog, type GameRecord } from "../../data/games"
import {
    socialPeople,
    type SocialGraph,
    type SocialGraphNode,
    type SocialPerson,
    type SocialState,
} from "../../socialData"

export type WebNode = {
    id: string
    name: string
    type: "You" | "Friend" | "Game"
    x: number
    y: number
    game?: number
    degree: number
}

export type WebEdge = {
    id: string
    person: string
    game: string
    label: string
    kind: "playing" | "owned" | "favorite" | "wishlist" | "shared" | "recommendation"
}

/** One visible neutral dot color; meaning lives in the connecting lines. */
const WEB_DOT_COLOR = "#C9D3E2"
const OWNED_LINE_COLOR = "#8EDCC0"
const WISHLIST_LINE_COLOR = "#A99BCB"
const NEUTRAL_LINE_COLOR = "#566174"

/** Only owned and wishlisted connections carry a highlight color. */
const lineColor = (kind: WebEdge["kind"]) => {
    if (kind === "owned") return OWNED_LINE_COLOR
    if (kind === "wishlist" || kind === "shared") return WISHLIST_LINE_COLOR
    return NEUTRAL_LINE_COLOR
}

export type WebGraphModel = {
    nodes: WebNode[]
    people: WebNode[]
    games: WebNode[]
    edges: WebEdge[]
    collections: Map<string, Set<string>>
    similarity: Record<string, number>
    friendshipIds: Set<string>
}

export interface TheWebProps {
    games: GameRecord[]
    saved: number[]
    toggle: (id: number) => void
    openGame: (game: GameRecord | number | null | undefined) => void
    community: {
        activeView: string
        webFocus: string
        go: (destination: string, id?: string) => void
        setDialog: (dialog: any) => void
        /** Derived once from the shared social model, including stored actions. */
        graph: SocialGraph
        state: SocialState
        /** Prototype ledger overlays; never stored in the social graph itself. */
        ownedIdsByPerson?: Record<string, number[]>
    }
}

const GAME_LINK_LABELS = new Set([
    "Favorite",
    "Owned",
    "Currently playing",
    "Wishlist",
    "Recommendation",
    "Shared wishlist",
])

const RELATIONSHIP_KINDS: Record<
    string,
    { kind: WebEdge["kind"]; label: string; slug: string }
> = {
    "Currently playing": { kind: "playing", label: "Playing", slug: "playing" },
    Owned: { kind: "owned", label: "Owned", slug: "owned" },
    Favorite: { kind: "favorite", label: "Favorite", slug: "favorite" },
    Wishlist: { kind: "wishlist", label: "Wishlisted", slug: "wishlist" },
    "Shared wishlist": { kind: "shared", label: "Shared wishlist", slug: "wishlist" },
    Recommendation: { kind: "recommendation", label: "Recommended", slug: "recommendation" },
}

const isPersonNode = (
    node: SocialGraphNode | WebNode
): node is (SocialGraphNode | WebNode) & { type: "You" | "Friend" } =>
    node.type === "You" || node.type === "Friend"

function pairKey(a: string, b: string) {
    return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Shared games divided by the union of both collections. */
export function jaccardSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>) {
    if (!a.size && !b.size) return 0
    let shared = 0
    for (const id of a) if (b.has(id)) shared += 1
    const union = a.size + b.size - shared
    return union ? shared / union : 0
}

function hash01(value: string) {
    let hash = 2166136261
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return (hash >>> 0) / 4294967295
}

function collectionIds(person: SocialPerson, validGames: Set<string>) {
    const ids = new Set<string>()
    for (const field of ["owned", "playing", "recent", "favorites", "wishlist", "recommends"] as const) {
        for (const id of person[field]) if (validGames.has(String(id))) ids.add(String(id))
    }
    return ids
}

function separatePair(
    a: { x: number; y: number },
    b: { x: number; y: number },
    target: number,
    strength: number
) {
    let dx = b.x - a.x
    let dy = b.y - a.y
    let distance = Math.hypot(dx, dy)
    if (distance < 0.001) {
        dx = 0.01
        dy = 0.01
        distance = Math.hypot(dx, dy)
    }
    if (distance >= target) return
    const shift = ((distance - target) / distance) * strength
    a.x += dx * shift
    a.y += dy * shift
    b.x -= dx * shift
    b.y -= dy * shift
}

function moveToward(
    point: { x: number; y: number },
    target: { x: number; y: number },
    distance: number,
    strength: number
) {
    let dx = target.x - point.x
    let dy = target.y - point.y
    let length = Math.hypot(dx, dy)
    if (length < 0.001) {
        dx = 0.01
        dy = 0
        length = 0.01
    }
    const shift = ((length - distance) / length) * strength
    point.x += dx * shift
    point.y += dy * shift
}

function repelPair(
    a: { x: number; y: number },
    b: { x: number; y: number },
    distance: number,
    strength: number
) {
    let dx = b.x - a.x
    let dy = b.y - a.y
    let length = Math.hypot(dx, dy)
    if (length < 0.001) {
        dx = 0.01
        dy = 0.01
        length = Math.hypot(dx, dy)
    }
    if (length >= distance) return
    const shift = (distance - length) / length * strength
    a.x -= dx * shift
    a.y -= dy * shift
    b.x += dx * shift
    b.y += dy * shift
}

function moveAway(
    point: { x: number; y: number },
    obstacle: { x: number; y: number },
    distance: number,
    strength: number
) {
    let dx = point.x - obstacle.x
    let dy = point.y - obstacle.y
    let length = Math.hypot(dx, dy)
    if (length < 0.001) {
        dx = 0.01
        dy = 0
        length = 0.01
    }
    if (length >= distance) return
    const shift = (distance - length) / length * strength
    point.x += dx * shift
    point.y += dy * shift
}

/**
 * Deterministic similarity layout. People are relaxed into clusters using
 * Jaccard similarity over their collections; games then settle near the people
 * who own, play, or wishlist them. No random seed means the graph is stable
 * between renders and refreshes.
 */
export function buildWebGraphModel(
    graph: SocialGraph,
    ownedIdsByPerson: Record<string, number[]> = {},
    catalogGames: GameRecord[] = gameCatalog,
): WebGraphModel {
    const peopleSource = graph.nodes
        .filter(isPersonNode)
        .sort((a, b) => (a.id === "you" ? -1 : b.id === "you" ? 1 : a.name.localeCompare(b.name)))
    const personIds = new Set(peopleSource.map((node) => node.id))
    const overlayGameIds = new Set(
        Object.values(ownedIdsByPerson).flat().map((gameId) => String(gameId)),
    )
    const catalogById = new Map(catalogGames.map((game) => [String(game.id), game]))
    /* A gifted catalog game may not be referenced anywhere in the seeded graph.
       Add it from the canonical catalog so the ledger Owned edge has a node. */
    const overlayGameNodes: SocialGraphNode[] = [...overlayGameIds]
        .filter((id) => !graph.nodes.some((node) => node.type === "Game" && node.id === id))
        .map((id): SocialGraphNode | null => {
            const game = catalogById.get(id)
            return game ? { id, name: game.title, type: "Game", game: game.id } : null
        })
        .filter((node): node is SocialGraphNode => node !== null)
    const gamesSource = [
        ...graph.nodes.filter(
            (node) =>
                node.type === "Game" &&
                (overlayGameIds.has(node.id) ||
                    graph.relationships.some(
                        ([from, to, label]) =>
                            GAME_LINK_LABELS.has(label) &&
                            ((personIds.has(from) && to === node.id) ||
                                (personIds.has(to) && from === node.id))
                    )),
        ),
        ...overlayGameNodes,
    ]
    const gameIds = new Set(gamesSource.map((node) => node.id))

    /* Accepted gifts and simulated purchases are ledger overlays. Existing
       edge de-duplication keeps them from doubling a seeded Owned edge. */
    const overlayRelationships: Array<[string, string, string]> = []
    const ownedOverlayPairs = new Set<string>()
    for (const [personId, ids] of Object.entries(ownedIdsByPerson)) {
        if (!personIds.has(personId)) continue
        for (const gameId of ids) {
            const nodeId = String(gameId)
            if (!gameIds.has(nodeId)) continue
            overlayRelationships.push([personId, nodeId, "Owned"])
            ownedOverlayPairs.add(`${personId}|${nodeId}`)
        }
    }
    const relationships = [...graph.relationships, ...overlayRelationships]

    const edges: WebEdge[] = []
    for (const [from, to, label] of relationships) {
        if (!GAME_LINK_LABELS.has(label)) continue
        const person = personIds.has(from) ? from : personIds.has(to) ? to : null
        const game = gameIds.has(from) ? from : gameIds.has(to) ? to : null
        const relationship = RELATIONSHIP_KINDS[label]
        if (!person || !game || !relationship) continue
        /* Once a gift is accepted, the recipient's old wishline should not
           compete with the Owned connection on the same person/game pair. */
        if (
            ownedOverlayPairs.has(`${person}|${game}`) &&
            (relationship.kind === "wishlist" || relationship.kind === "shared")
        )
            continue
        const id = `${person}|${game}|${label}`
        if (edges.some((edge) => edge.id === id)) continue
        edges.push({
            id,
            person,
            game,
            label,
            kind: relationship.kind,
        })
    }

    const gamePeople = new Map<string, string[]>()
    for (const edge of edges) {
        const people = gamePeople.get(edge.game) || []
        if (!people.includes(edge.person)) people.push(edge.person)
        gamePeople.set(edge.game, people)
    }

    const collections = new Map<string, Set<string>>()
    for (const person of peopleSource) {
        const canonical = socialPeople.find((entry) => entry.id === person.id)
        const ids = canonical ? collectionIds(canonical, gameIds) : new Set<string>()
        for (const edge of edges) if (edge.person === person.id) ids.add(edge.game)
        collections.set(person.id, ids)
    }

    const similarity: Record<string, number> = {}
    for (let i = 0; i < peopleSource.length; i++) {
        for (let j = i + 1; j < peopleSource.length; j++) {
            const a = peopleSource[i]
            const b = peopleSource[j]
            similarity[pairKey(a.id, b.id)] = jaccardSimilarity(
                collections.get(a.id) || new Set(),
                collections.get(b.id) || new Set()
            )
        }
    }

    /* A nearest-neighbour chain puts the closest collections next to one
       another around the ring, so shared games form visible bridges. */
    const remainingPeople = [...peopleSource]
    const orderedPeople = [remainingPeople.shift()!]
    while (remainingPeople.length) {
        const previous = orderedPeople[orderedPeople.length - 1]
        let bestIndex = 0
        let bestScore = -1
        remainingPeople.forEach((candidate, index) => {
            const score = similarity[pairKey(previous.id, candidate.id)] || 0
            if (score > bestScore) {
                bestScore = score
                bestIndex = index
            }
        })
        orderedPeople.push(remainingPeople.splice(bestIndex, 1)[0])
    }

    const positions = new Map<string, { x: number; y: number }>()
    const personHomes = new Map<string, { x: number; y: number }>()
    orderedPeople.forEach((person, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, orderedPeople.length)
        const home = {
            x: Math.cos(angle) * 400,
            y: Math.sin(angle) * 300,
        }
        positions.set(person.id, { ...home })
        personHomes.set(person.id, home)
    })

    /* Similar people settle closer; dissimilar people stay on opposite sides. */
    for (let pass = 0; pass < 300; pass++) {
        for (let i = 0; i < peopleSource.length; i++) {
            for (let j = i + 1; j < peopleSource.length; j++) {
                const a = positions.get(peopleSource[i].id)!
                const b = positions.get(peopleSource[j].id)!
                /* Anchor people to their home slot; the home order already
                   groups similar collections, and this keeps the graph roomy. */
                separatePair(a, b, 300, 0.1)
            }
        }
        for (const person of peopleSource) {
            const point = positions.get(person.id)!
            const home = personHomes.get(person.id)!
            point.x += (home.x - point.x) * 0.03
            point.y += (home.y - point.y) * 0.03
        }
    }

    /* Spread games around their closest person so shared games bridge clusters. */
    const assignedGames = new Map<string, string[]>()
    for (const person of peopleSource) assignedGames.set(person.id, [])
    for (const game of gamesSource) {
        const people = gamePeople.get(game.id) || []
        const primary = people.reduce(
            (best, id) =>
                (assignedGames.get(id)?.length || 0) < (assignedGames.get(best)?.length || 0)
                    ? id
                    : best,
            people[0] || peopleSource[0]?.id
        )
        if (!primary) continue
        assignedGames.get(primary)!.push(game.id)
    }

    const gameHomes = new Map<string, { x: number; y: number }>()
    for (const [personId, gameIdsForPerson] of assignedGames) {
        const person = positions.get(personId)
        if (!person) continue
        gameIdsForPerson.forEach((gameId, slot) => {
            const people = gamePeople.get(gameId) || []
            const anchors = people
                .map((id) => positions.get(id))
                .filter((point): point is { x: number; y: number } => !!point)
            const center = anchors.reduce(
                (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
                { x: 0, y: 0 }
            )
            const count = Math.max(1, anchors.length)
            center.x /= count
            center.y /= count
            const base = people.length > 1
                ? { x: (person.x + center.x) / 2, y: (person.y + center.y) / 2 }
                : person
            const angle =
                -Math.PI / 2 +
                (slot * Math.PI * 2) / Math.max(1, gameIdsForPerson.length) +
                (hash01(gameId) - 0.5) * 0.25
            const radius = 200 + Math.min(5, gameIdsForPerson.length) * 9
            const home = {
                x: base.x + Math.cos(angle) * radius,
                y: base.y + Math.sin(angle) * radius,
            }
            positions.set(gameId, { ...home })
            gameHomes.set(gameId, home)
        })
    }

    /* Games bridge their people, then repel one another into readable space. */
    for (let pass = 0; pass < 300; pass++) {
        for (const game of gamesSource) {
            const point = positions.get(game.id)!
            const people = gamePeople.get(game.id) || []
            for (const personId of people) {
                const anchor = positions.get(personId)
                if (anchor) moveToward(point, anchor, 195, 0.003)
            }
            for (const person of peopleSource) {
                if (people.includes(person.id)) continue
                const anchor = positions.get(person.id)!
                moveAway(point, anchor, 110, 0.04)
            }
            const home = gameHomes.get(game.id)!
            point.x += (home.x - point.x) * 0.08
            point.y += (home.y - point.y) * 0.08
        }
        for (let i = 0; i < gamesSource.length; i++) {
            for (let j = i + 1; j < gamesSource.length; j++) {
                repelPair(
                    positions.get(gamesSource[i].id)!,
                    positions.get(gamesSource[j].id)!,
                    100,
                    0.12
                )
            }
        }
    }

    const personDegree = new Map<string, Set<string>>()
    for (const edge of edges) {
        const games = personDegree.get(edge.person) || new Set<string>()
        games.add(edge.game)
        personDegree.set(edge.person, games)
    }

    const people: WebNode[] = peopleSource.map((person) => ({
        id: person.id,
        name: person.id === "you" ? socialPeople.find((entry) => entry.id === "you")?.name || "You" : person.name,
        type: person.type,
        ...positions.get(person.id)!,
        degree: personDegree.get(person.id)?.size || 0,
    }))
    const games: WebNode[] = gamesSource.map((game) => ({
        id: game.id,
        name: game.name,
        type: "Game",
        game: game.game,
        ...positions.get(game.id)!,
        degree: gamePeople.get(game.id)?.length || 0,
    }))

    const friendshipIds = new Set<string>()
    for (const [from, to, label] of graph.relationships) {
        if (label !== "Friends") continue
        if (from === "you") friendshipIds.add(to)
        if (to === "you") friendshipIds.add(from)
    }

    return {
        nodes: [...people, ...games],
        people,
        games,
        edges,
        collections,
        similarity,
        friendshipIds,
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

export default function TheWeb({
    games,
    saved,
    toggle,
    openGame,
    community,
}: TheWebProps) {
    const initialSelection = community.webFocus || null
    const [selected, setSelected] = React.useState<string | null>(initialSelection)
    const [hovered, setHovered] = React.useState<string | null>(null)
    const [focused, setFocused] = React.useState<string | null>(null)
    const [query, setQuery] = React.useState("")
    const [zoom, setZoom] = React.useState(1)
    const [pan, setPan] = React.useState({ x: 0, y: 0 })
    const [size, setSize] = React.useState({ width: 1200, height: 680 })
    const canvas = React.useRef<HTMLDivElement>(null)
    const pointers = React.useRef(new Map<number, { x: number; y: number }>())
    const drag = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
    const pinch = React.useRef<{ distance: number; zoom: number } | null>(null)
    const moved = React.useRef(false)
    const lastFocus = React.useRef(initialSelection)

    const model = React.useMemo(
        () => buildWebGraphModel(community.graph, community.ownedIdsByPerson, games),
        [community.graph, community.ownedIdsByPerson, games],
    )

    React.useEffect(() => {
        if (!canvas.current) return
        const observer = new ResizeObserver(([entry]) => {
            setSize({
                width: Math.max(320, entry.contentRect.width),
                height: Math.max(360, entry.contentRect.height),
            })
        })
        observer.observe(canvas.current)
        return () => observer.disconnect()
    }, [])

    React.useEffect(() => {
        if (
            community.activeView === "The Web" &&
            community.webFocus &&
            community.webFocus !== lastFocus.current
        ) {
            setSelected(community.webFocus)
            lastFocus.current = community.webFocus
        }
    }, [community.activeView, community.webFocus])

    React.useEffect(() => {
        const element = canvas.current
        if (!element) return
        const onWheel = (event: WheelEvent) => {
            event.preventDefault()
            setZoom((value) => clamp(value * (event.deltaY < 0 ? 1.08 : 0.92), 0.45, 2.4))
        }
        element.addEventListener("wheel", onWheel, { passive: false })
        return () => element.removeEventListener("wheel", onWheel)
    }, [])

    const bounds = React.useMemo(() => {
        if (!model.nodes.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 }
        return model.nodes.reduce(
            (box, node) => ({
                minX: Math.min(box.minX, node.x),
                maxX: Math.max(box.maxX, node.x),
                minY: Math.min(box.minY, node.y),
                maxY: Math.max(box.maxY, node.y),
            }),
            { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        )
    }, [model.nodes])

    const fit = React.useMemo(() => {
        const spanX = Math.max(1, bounds.maxX - bounds.minX)
        const spanY = Math.max(1, bounds.maxY - bounds.minY)
        const scale = clamp(
            Math.min((size.width - 130) / spanX, (size.height - 130) / spanY),
            0.22,
            1.5
        )
        return {
            scale,
            centerX: (bounds.minX + bounds.maxX) / 2,
            centerY: (bounds.minY + bounds.maxY) / 2,
        }
    }, [bounds, size])

    const screenPoint = (node: { x: number; y: number }) => ({
        x: size.width / 2 + (node.x - fit.centerX) * fit.scale * zoom + pan.x,
        y: size.height / 2 + (node.y - fit.centerY) * fit.scale * zoom + pan.y,
    })

    const activeIds = React.useMemo(
        () => new Set([hovered, selected, focused].filter((id): id is string => !!id)),
        [hovered, selected, focused]
    )
    const activeNodeId = selected || hovered || focused
    const activeNode = activeNodeId
        ? model.nodes.find((node) => node.id === activeNodeId)
        : undefined
    const relatedIds = React.useMemo(() => {
        if (!activeIds.size) return null
        const ids = new Set<string>(activeIds)
        for (const edge of model.edges) {
            if (activeIds.has(edge.person)) ids.add(edge.game)
            if (activeIds.has(edge.game)) ids.add(edge.person)
        }
        return ids
    }, [activeIds, model.edges])

    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = (node: WebNode) =>
        !normalizedQuery || node.name.toLowerCase().includes(normalizedQuery)

    const nodeOpacity = (node: WebNode) => {
        if (!matchesQuery(node)) return 0.08
        if (relatedIds && !relatedIds.has(node.id)) return 0.13
        return node.type === "Game" ? 0.78 : 1
    }

    const edgeOpacity = (edge: WebEdge) => {
        if (
            normalizedQuery &&
            !model.nodes.some(
                (node) =>
                    (node.id === edge.person || node.id === edge.game) && matchesQuery(node)
            )
        )
            return 0.03
        if (
            activeIds.size &&
            !activeIds.has(edge.person) &&
            !activeIds.has(edge.game)
        )
            return 0.06
        if (activeIds.size) return 0.92
        return 0.34
    }

    const personRadius = (node: WebNode) =>
        activeIds.has(node.id) ? 14 : node.id === "you" ? 12.5 : 11.5
    const gameRadius = (node: WebNode) => 3.6 + Math.min(2.4, node.degree * 0.6)

    const mostOverlapping = React.useMemo(() => {
        if (activeNode?.type === "Game") return []
        if (!activeNode) return []
        const own = model.collections.get(activeNode.id) || new Set<string>()
        return model.people
            .filter((person) => person.id !== activeNode.id)
            .map((person) => {
                const shared = [...own].filter((id) => model.collections.get(person.id)?.has(id))
                return { person, shared }
            })
            .filter((entry) => entry.shared.length)
            .sort((a, b) => {
                const scoreA = jaccardSimilarity(own, model.collections.get(a.person.id) || new Set())
                const scoreB = jaccardSimilarity(own, model.collections.get(b.person.id) || new Set())
                return scoreB - scoreA
            })
            .slice(0, 2)
    }, [activeNode, model.collections, model.people])

    const distinctGames = React.useMemo(() => {
        if (activeNode?.type !== "Friend" && activeNode?.type !== "You") return []
        const own = model.collections.get(activeNode.id) || new Set<string>()
        return [...own].filter(
            (id) =>
                !model.people.some(
                    (person) => person.id !== activeNode.id && model.collections.get(person.id)?.has(id)
                )
        )
    }, [activeNode, model.collections, model.people])

    function selectFirstMatch() {
        if (!normalizedQuery) return
        const match = model.nodes.find((node) => node.name.toLowerCase().includes(normalizedQuery))
        if (match) {
            setSelected(match.id)
            setPan({ x: 0, y: 0 })
            setZoom(1)
        }
    }

    function resetView() {
        setSelected(null)
        setHovered(null)
        setFocused(null)
        setQuery("")
        setZoom(1)
        setPan({ x: 0, y: 0 })
        lastFocus.current = null
    }

    function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if ((event.target as Element).closest("[data-webnode], button, input")) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        moved.current = false
        if (pointers.current.size === 1) {
            drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
        } else if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()]
            pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }
            drag.current = null
        }
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (!pointers.current.has(event.pointerId)) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()]
            const distance = Math.hypot(a.x - b.x, a.y - b.y)
            setZoom(clamp(pinch.current.zoom * (distance / pinch.current.distance), 0.45, 2.4))
            moved.current = true
            return
        }
        if (drag.current) {
            const dx = event.clientX - drag.current.x
            const dy = event.clientY - drag.current.y
            if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
            setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy })
        }
    }

    function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
        pointers.current.delete(event.pointerId)
        if (pointers.current.size < 2) pinch.current = null
        if (!pointers.current.size) drag.current = null
    }

    const connectionsForActive = activeNode
        ? model.edges.filter((edge) => edge.person === activeNode.id || edge.game === activeNode.id)
        : []

    return (
        <main className="webgraph-page">
            <h1 className="sr-only">The Web</h1>
            <div
                ref={canvas}
                className="webgraph-canvas"
                role="region"
                aria-label="Interactive gaming network. Drag to pan, scroll or pinch to zoom."
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onClick={(event) => {
                    if (!moved.current && !(event.target as Element).closest("[data-webnode], button, input")) {
                        setSelected(null)
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "Escape") setSelected(null)
                    if (event.key === "ArrowLeft") setPan((value) => ({ ...value, x: value.x + 40 }))
                    if (event.key === "ArrowRight") setPan((value) => ({ ...value, x: value.x - 40 }))
                    if (event.key === "ArrowUp") setPan((value) => ({ ...value, y: value.y + 40 }))
                    if (event.key === "ArrowDown") setPan((value) => ({ ...value, y: value.y - 40 }))
                    if (event.key === "+" || event.key === "=")
                        setZoom((value) => clamp(value + 0.12, 0.45, 2.4))
                    if (event.key === "-" || event.key === "_")
                        setZoom((value) => clamp(value - 0.12, 0.45, 2.4))
                }}
            >
                <svg
                    className="webgraph-svg"
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${size.width} ${size.height}`}
                    aria-label="People and games in your network"
                >
                    <g className="webgraph-edges">
                        {model.edges.map((edge) => {
                            const from = model.nodes.find((node) => node.id === edge.person)!
                            const to = model.nodes.find((node) => node.id === edge.game)!
                            const a = screenPoint(from)
                            const b = screenPoint(to)
                            const highlighted =
                                activeIds.has(edge.person) || activeIds.has(edge.game)
                            return (
                                <line
                                    key={edge.id}
                                    data-web-edge-kind={edge.kind}
                                    x1={a.x}
                                    y1={a.y}
                                    x2={b.x}
                                    y2={b.y}
                                    stroke={lineColor(edge.kind)}
                                    strokeWidth={highlighted ? 1.5 : 0.9}
                                    opacity={edgeOpacity(edge)}
                                />
                            )
                        })}
                    </g>
                    <g className="webgraph-nodes">
                        {model.nodes.map((node) => {
                            const point = screenPoint(node)
                            const isPerson = isPersonNode(node)
                            const radius = isPerson ? personRadius(node) : gameRadius(node)
                            const active = activeIds.has(node.id)
                            const showLabel = active
                            return (
                                <g
                                    key={`${node.type}-${node.id}`}
                                    data-webnode="true"
                                    className={`webgraph-node ${isPerson ? "person" : "game"} ${
                                        active ? "active" : ""
                                    }`}
                                    transform={`translate(${point.x},${point.y})`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${node.name}, ${node.type}, select to explore`}
                                    aria-pressed={selected === node.id}
                                    opacity={nodeOpacity(node)}
                                    onPointerEnter={() => setHovered(node.id)}
                                    onPointerLeave={() => setHovered(null)}
                                    onFocus={() => setFocused(node.id)}
                                    onBlur={() => setFocused(null)}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        setSelected(node.id)
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault()
                                            event.stopPropagation()
                                            setSelected(node.id)
                                        }
                                    }}
                                >
                                    {isPerson ? (
                                        <>
                                            <circle className="webgraph-halo" r={radius + 7} />
                                            {active && <circle className="webgraph-halo active" r={radius + 12} />}
                                            <circle
                                                className="webgraph-dot"
                                                r={radius}
                                                fill={WEB_DOT_COLOR}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {node.degree >= 3 && (
                                                <circle
                                                    className="webgraph-hub"
                                                    r={radius + 4}
                                                    stroke={WEB_DOT_COLOR}
                                                />
                                            )}
                                            <circle
                                                className="webgraph-dot"
                                                r={radius}
                                                fill={WEB_DOT_COLOR}
                                            />
                                        </>
                                    )}
                                    <text
                                        className="webgraph-label"
                                        x={radius + 8}
                                        y={3.5}
                                        opacity={showLabel ? 1 : 0}
                                    >
                                        {node.name}
                                    </text>
                                </g>
                            )
                        })}
                    </g>
                </svg>

                <div className="webgraph-controls">
                    <label className="webgraph-search">
                        <Icon name="search" size={14} />
                        <input
                            value={query}
                            aria-label="Find a person or game in the network"
                            placeholder="Find a person or game"
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") selectFirstMatch()
                            }}
                        />
                    </label>
                    <button
                        className="webgraph-icon-button"
                        aria-label="Zoom out"
                        onClick={() => setZoom((value) => clamp(value - 0.12, 0.45, 2.4))}
                    >
                        −
                    </button>
                    <button
                        className="webgraph-icon-button"
                        aria-label="Zoom in"
                        onClick={() => setZoom((value) => clamp(value + 0.12, 0.45, 2.4))}
                    >
                        +
                    </button>
                    <button className="webgraph-reset" onClick={resetView}>
                        Reset view
                    </button>
                </div>

                <p className="webgraph-hint">
                    Drag to pan · Scroll or pinch to zoom
                    <span className="webgraph-legend" aria-label="Connection colors">
                        <span className="webgraph-key owned" /> Owned
                        <span className="webgraph-key wishlist" /> Wishlisted
                    </span>
                </p>

                {activeNode && (
                    <aside className="webgraph-context" aria-live="polite">
                        <div className="webgraph-context-kicker">
                            {activeNode.type === "Game"
                                ? "Game"
                                : activeNode.id === "you"
                                    ? "You"
                                    : model.friendshipIds.has(activeNode.id)
                                        ? "Friend"
                                        : "Person"}
                        </div>
                        <h2>{activeNode.name}</h2>

                        {(activeNode.type === "You" || activeNode.type === "Friend") && (
                            <>
                                <div className="webgraph-context-section">
                                    <strong>Collections</strong>
                                    <div className="webgraph-links">
                                        {connectionsForActive.map((edge) => {
                                            const info = RELATIONSHIP_KINDS[edge.label]
                                            const game = games.find((entry) => entry.id === Number(edge.game))
                                            if (!game) return null
                                            return (
                                                <button
                                                    key={edge.id}
                                                    className="webgraph-link"
                                                    data-webgame-link={`${activeNode.id}-${info.slug}-${edge.game}`}
                                                    onClick={() => setSelected(edge.game)}
                                                >
                                                    <span>{info.label}</span>
                                                    {game.title}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                {!!mostOverlapping.length && (
                                    <div className="webgraph-context-section">
                                        <strong>Closest overlap</strong>
                                        {mostOverlapping.map(({ person, shared }) => (
                                            <p key={person.id}>
                                                <b>{person.name}</b>
                                                <span>{shared.slice(0, 2).join(" · ")}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {!!distinctGames.length && (
                                    <div className="webgraph-context-section">
                                        <strong>Only in this collection</strong>
                                        <p>{distinctGames.slice(0, 2).map((id) => games.find((game) => game.id === Number(id))?.title).join(" · ")}</p>
                                    </div>
                                )}
                                <button
                                    className="webgraph-action"
                                    onClick={() => community.go("Profile", activeNode.id)}
                                >
                                    Open profile <Icon name="arrow" size={12} />
                                </button>
                            </>
                        )}

                        {activeNode.type === "Game" && (
                            <>
                                <div className="webgraph-context-section">
                                    <strong>In collections</strong>
                                    <div className="webgraph-links">
                                        {connectionsForActive.map((edge) => {
                                            const info = RELATIONSHIP_KINDS[edge.label]
                                            const person = model.people.find((node) => node.id === edge.person)
                                            if (!person) return null
                                            return (
                                                <button
                                                    key={edge.id}
                                                    className="webgraph-link"
                                                    data-webperson-link={`${edge.game}-${info.slug}-${edge.person}`}
                                                    onClick={() => setSelected(edge.person)}
                                                >
                                                    <span>{info.label}</span>
                                                    {person.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <button
                                    className="webgraph-action"
                                    onClick={() => openGame(games.find((game) => game.id === activeNode.game))}
                                >
                                    Open game <Icon name="arrow" size={12} />
                                </button>
                                <button
                                    className="webgraph-action secondary"
                                    aria-pressed={saved.includes(Number(activeNode.game))}
                                    aria-label={
                                        saved.includes(Number(activeNode.game))
                                            ? "Remove from wishlist"
                                            : "Add to wishlist"
                                    }
                                    onClick={() => toggle(Number(activeNode.game))}
                                >
                                    <Icon
                                        name={
                                            saved.includes(Number(activeNode.game))
                                                ? "heart-filled"
                                                : "heart"
                                        }
                                        size={13}
                                    />
                                    {saved.includes(Number(activeNode.game))
                                        ? "Saved to wishlist"
                                        : "Add to wishlist"}
                                </button>
                                <button
                                    className="webgraph-action secondary"
                                    onClick={() =>
                                        community.setDialog({
                                            type: "recommend",
                                            game: Number(activeNode.game),
                                        })
                                    }
                                >
                                    Recommend game
                                </button>
                            </>
                        )}
                    </aside>
                )}
            </div>
        </main>
    )
}
