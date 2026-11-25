/**
 * PLAYSCAPE unified social state.
 *
 * This module is the only owner of persisted social state. Feature modules
 * receive the shared model and operations through context; they never write
 * social local-storage keys themselves.
 */
/** @jsxRuntime classic */
import * as React from "react"
import { gameCatalog, type GameRecord } from "./data/games"
import {
    buildSocialGraph,
    createEmptySocialState,
    getRecipientId,
    initialActivity,
    initialFriendships,
    isPersonRecipient,
    socialPeople,
    type InviteStatus,
    type SocialActivity,
    type SocialCircle,
    type SocialGraph,
    type SocialInvite,
    type SocialPerson,
    type SocialPrivacy,
    type SocialRecommendation,
    type SocialState,
    type SocialWishlistShare,
} from "./socialData"
import {
    applyInviteDecision,
    buildInviteSuggestions,
    createCircleInvite,
    type CircleInviteResult,
} from "./socialState"

export type {
    CircleGameVote,
    CircleGamePlan,
    CircleGroupRecommendation,
    CircleGoal,
    InviteStatus,
    SocialActivity,
    SocialCircle,
    SocialGraph,
    SocialInvite,
    SocialPerson,
    SocialPrivacy,
    SocialRecommendation,
    SocialState,
    SocialWishlistShare,
} from "./socialData"

/* Existing browser keys are kept so earlier prototype data remains readable. */
export const APP_STORAGE_KEY = "playscape-v1"
export const LEGACY_SOCIAL_STORAGE_KEY = "playscape-community-v2"
export const SOCIAL_STORAGE_KEY = "playscape-social-v1"

/**
 * v1: the original unversioned legacy community key.
 * v2: the first `playscape-social-v1` envelope (prepared but not wired into the app).
 * v3: unified model with validated recipients, reconciled membership, and
 *     recommendation/share relationships in The Web.
 */
export const LEGACY_SOCIAL_VERSION = 1
export const SOCIAL_STORAGE_VERSION = 3
export const APP_STORAGE_VERSION = 1
/** Backwards-compatible alias used by earlier callers. */
export const STORAGE_VERSION = SOCIAL_STORAGE_VERSION

export type AppPreferences = {
    saved: number[]
    atmos: string
    auto: boolean
}

export type InviteSuggestion = ReturnType<typeof buildInviteSuggestions>[number]

export type SocialContextValue = {
    games: GameRecord[]
    saved: number[]
    toggle: (id: number) => void
    openGame: (game: GameRecord | number | null | undefined) => void
    go: (destination: string, id?: string) => void
    useFinder: (prefs: Record<string, string>) => void
    state: SocialState
    update: (updater: (prev: SocialState) => SocialState) => void
    dialog: { type: string; [key: string]: any } | null
    setDialog: (dialog: { type: string; [key: string]: any } | null) => void
    message: string
    setMessage: (message: string) => void
    react: (id: string) => void
    comment: (id: string, text: string) => void
    toggleSavedRecommendation: (id: string) => void
    setPrivacy: (privacy: SocialPrivacy) => void
    shortlist: (circleId: string, gameId: number) => boolean
    join: (id: string) => void
    createCircle: (name: string) => string | null
    getInviteSuggestions: (circleId: string) => InviteSuggestion[]
    inviteToCircle: (circleId: string, personId: string) => boolean
    respondToInvite: (inviteId: string, decision: InviteStatus) => void
    recommend: (gameId: number, recipient: string, text: string) => boolean
    shareWishlist: (recipient: string, gameIds: number[]) => boolean
    people: SocialPerson[]
    activity: SocialActivity[]
    graph: SocialGraph
}

/** Seed state; exported as `emptyState` for earlier callers. */
export const emptyState: SocialState = createEmptySocialState()

const isRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value)

const uniqueStrings = (value: unknown, allowed?: Set<string>) =>
    Array.isArray(value)
        ? [...new Set(value.filter((item): item is string =>
            typeof item === "string" && item.length > 0 && (!allowed || allowed.has(item))
        ))]
        : []

const uniqueGameIds = (value: unknown, allowedGames: Set<number>) =>
    Array.isArray(value)
        ? [...new Set(value.filter((id): id is number =>
            Number.isInteger(id) && allowedGames.has(id)
        ))]
        : []

const validPrivacy = (value: unknown): SocialPrivacy["profile"] | null =>
    value === "Public" || value === "Friends only" || value === "Private"
        ? value
        : null

function getAllowedGameIds(games: GameRecord[]) {
    return new Set(games.map((game) => game.id))
}

function normalizeCircle(
    raw: unknown,
    people: Set<string>,
    games: Set<number>
): SocialCircle | null {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") {
        return null
    }

    const members = uniqueStrings(raw.members, people)
    return {
        id: raw.id,
        name: raw.name,
        tag: typeof raw.tag === "string" ? raw.tag : "",
        desc: typeof raw.desc === "string" ? raw.desc : "",
        members,
        wishlist: uniqueGameIds(raw.wishlist, games),
        playing: uniqueGameIds(raw.playing, games),
        topic: typeof raw.topic === "string" ? raw.topic : "",
        joined: members.includes("you"),
    }
}

function normalizeActivity(
    raw: unknown,
    people: Set<string>,
    circles: Set<string>,
    games: Set<number>
): SocialActivity | null {
    if (
        !isRecord(raw) ||
        typeof raw.id !== "string" ||
        typeof raw.person !== "string" ||
        !people.has(raw.person) ||
        !Number.isInteger(raw.game) ||
        !games.has(raw.game)
    ) {
        return null
    }
    return {
        id: raw.id,
        person: raw.person,
        game: raw.game,
        category: typeof raw.category === "string" ? raw.category : "Activity",
        action: typeof raw.action === "string" ? raw.action : "",
        time: typeof raw.time === "string" ? raw.time : "Recently",
        quote: typeof raw.quote === "string" ? raw.quote : "",
        why: typeof raw.why === "string" ? raw.why : "",
        circle: typeof raw.circle === "string" && circles.has(raw.circle)
            ? raw.circle
            : null,
        likes: Number.isFinite(raw.likes) ? Math.max(0, raw.likes) : 0,
    }
}

function normalizeRecommendation(
    raw: unknown,
    people: Set<string>,
    circles: Set<string>,
    games: Set<number>,
    index: number
): SocialRecommendation | null {
    if (!isRecord(raw) || !Number.isInteger(raw.game) || !games.has(raw.game)) {
        return null
    }
    const sender = typeof raw.sender === "string" ? raw.sender : "you"
    const recipient = typeof raw.recipient === "string" ? raw.recipient : ""
    const circleId = recipient.startsWith("circle:")
        ? recipient.slice("circle:".length)
        : recipient
    const hasRecipient = people.has(recipient) || circles.has(circleId)
    if (!people.has(sender) || !hasRecipient) {
        return null
    }
    return {
        id: typeof raw.id === "string" ? raw.id : `recommendation-migrated-${index}`,
        sender,
        recipient,
        game: raw.game,
        text: typeof raw.text === "string" ? raw.text : "",
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    }
}

function normalizeShare(
    raw: unknown,
    people: Set<string>,
    circles: Set<string>,
    games: Set<number>,
    index: number
): SocialWishlistShare | null {
    if (!isRecord(raw)) return null
    const sender = typeof raw.sender === "string" ? raw.sender : "you"
    const recipient = typeof raw.recipient === "string" ? raw.recipient : ""
    const circleId = recipient.startsWith("circle:")
        ? recipient.slice("circle:".length)
        : recipient
    const hasRecipient = people.has(recipient) || circles.has(circleId)
    const sharedGames = uniqueGameIds(raw.games, games)
    if (!people.has(sender) || !hasRecipient || !sharedGames.length) {
        return null
    }
    return {
        id: typeof raw.id === "string" ? raw.id : `share-migrated-${index}`,
        sender,
        recipient,
        games: sharedGames,
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    }
}

function normalizeInvite(raw: unknown, people: Set<string>, circles: Set<string>): SocialInvite | null {
    if (
        !isRecord(raw) ||
        typeof raw.id !== "string" ||
        typeof raw.circle !== "string" ||
        !circles.has(raw.circle) ||
        typeof raw.person !== "string" ||
        !people.has(raw.person) ||
        (raw.status !== "pending" && raw.status !== "accepted" && raw.status !== "declined")
    ) {
        return null
    }
    return {
        id: raw.id,
        circle: raw.circle,
        person: raw.person,
        status: raw.status,
    }
}

/**
 * Final, idempotent validator. Any malformed field falls back to seed data or
 * is dropped; every stored reference is checked against people, circles, and
 * the canonical game catalog.
 */
export function normalizeSocialState(
    raw: unknown,
    games: GameRecord[] = gameCatalog
): SocialState {
    const input = isRecord(raw) ? raw : {}
    const seed = createEmptySocialState()
    const people = new Set(socialPeople.map((person) => person.id))
    const allowedGames = getAllowedGameIds(games)
    const storedCircles = Array.isArray(input.circles)
        ? input.circles
            .map((circle) => normalizeCircle(circle, people, allowedGames))
            .filter((circle): circle is SocialCircle => Boolean(circle))
        : []
    /*
     * Seed circles keep their canonical names, descriptions, and relationships
     * so malformed or stale storage cannot rename a sample identity or drop a
     * newly seeded friend such as Casey. Your own join/leave choice and stored
     * wishlist changes are still preserved, and custom circles are appended.
     */
    let circles = seed.circles.map((circle) => {
        const stored = storedCircles.find((entry) => entry.id === circle.id)
        if (!stored) return { ...circle }
        const canonicalMembers = circle.members.filter((member) => member !== "you")
        return {
            ...circle,
            members: [...new Set([...canonicalMembers, ...stored.members])],
            wishlist: [...stored.wishlist],
            playing: [...stored.playing],
        }
    })
    for (const circle of storedCircles) {
        if (!seed.circles.some((seedCircle) => seedCircle.id === circle.id)) {
            circles.push(circle)
        }
    }
    const circleIds = new Set(circles.map((circle) => circle.id))

    const activity = Array.isArray(input.activity)
        ? input.activity
            .map((item) => normalizeActivity(item, people, circleIds, allowedGames))
            .filter((item): item is SocialActivity => Boolean(item))
            .filter((item, index, list) =>
                list.findIndex((entry) => entry.id === item.id) === index
            )
        : []
    const activityIds = new Set([
        ...initialActivity.map((item) => item.id),
        ...activity.map((item) => item.id),
    ])

    let invites = Array.isArray(input.invites)
        ? input.invites
            .map((invite) => normalizeInvite(invite, people, circleIds))
            .filter((invite): invite is SocialInvite => Boolean(invite))
            .filter((invite, index, list) =>
                list.findIndex((entry) => entry.id === invite.id) === index
            )
            .filter((invite, index, list) =>
                invite.status !== "pending" ||
                list.findIndex((entry) =>
                    entry.status === "pending" &&
                    entry.circle === invite.circle &&
                    entry.person === invite.person
                ) === index
            )
        : []

    /* Accepted invitations are membership facts; reconcile both directions. */
    circles = circles.map((circle) => {
        const accepted = invites.filter(
            (invite) => invite.circle === circle.id && invite.status === "accepted"
        )
        const members = [...circle.members]
        for (const invite of accepted) {
            if (!members.includes(invite.person)) members.push(invite.person)
        }
        return { ...circle, members, joined: members.includes("you") }
    })
    invites = invites.filter(
        (invite) =>
            invite.status === "accepted" ||
            !circles
                .find((circle) => circle.id === invite.circle)
                ?.members.includes(invite.person)
    )

    const discussions: SocialState["discussions"] = {}
    if (isRecord(input.discussions)) {
        for (const [circleId, entries] of Object.entries(input.discussions)) {
            if (!circleIds.has(circleId) || !Array.isArray(entries)) continue
            discussions[circleId] = entries
                .filter((entry) =>
                    isRecord(entry) &&
                    typeof entry.person === "string" &&
                    people.has(entry.person) &&
                    typeof entry.text === "string"
                )
                .map((entry) => ({ person: entry.person, text: entry.text }))
        }
    }
    for (const [circleId, entries] of Object.entries(seed.discussions)) {
        discussions[circleId] ??= entries.map((entry) => ({ ...entry }))
    }

    const comments: SocialState["comments"] = {}
    if (isRecord(input.comments)) {
        for (const [activityId, entries] of Object.entries(input.comments)) {
            if (!activityIds.has(activityId) || !Array.isArray(entries)) continue
            comments[activityId] = entries
                .filter((entry) =>
                    isRecord(entry) &&
                    typeof entry.person === "string" &&
                    people.has(entry.person) &&
                    typeof entry.text === "string"
                )
                .map((entry) => ({ person: entry.person, text: entry.text }))
        }
    }
    for (const [activityId, entries] of Object.entries(seed.comments)) {
        comments[activityId] ??= entries.map((entry) => ({ ...entry }))
    }

    const rawPrivacy = isRecord(input.privacy) ? input.privacy : {}
    const privacy: SocialPrivacy = {
        profile: validPrivacy(rawPrivacy.profile) || seed.privacy.profile,
        wishlist: validPrivacy(rawPrivacy.wishlist) || seed.privacy.wishlist,
        activity: validPrivacy(rawPrivacy.activity) || seed.privacy.activity,
    }

    return {
        circles,
        reactions: uniqueStrings(input.reactions, activityIds),
        comments,
        savedRecs: uniqueStrings(input.savedRecs, activityIds),
        privacy,
        sent: Array.isArray(input.sent)
            ? input.sent
                .map((item, index) => normalizeRecommendation(item, people, circleIds, allowedGames, index))
                .filter((item): item is SocialRecommendation => Boolean(item))
            : [],
        shares: Array.isArray(input.shares)
            ? input.shares
                .map((item, index) => normalizeShare(item, people, circleIds, allowedGames, index))
                .filter((item): item is SocialWishlistShare => Boolean(item))
            : [],
        activity,
        discussions,
        invites,
        circleVotes: Array.isArray(input.circleVotes)
            ? input.circleVotes.filter(
                (v: any) =>
                    typeof v.id === "string" &&
                    typeof v.circleId === "string" &&
                    Number.isInteger(v.gameId) &&
                    allowedGames.has(v.gameId) &&
                    typeof v.nominatedBy === "string" &&
                    people.has(v.nominatedBy) &&
                    typeof v.nominatedAt === "string"
            )
            : [],
        circlePlans: Array.isArray(input.circlePlans)
            ? input.circlePlans.filter(
                (p: any) =>
                    typeof p.id === "string" &&
                    typeof p.circleId === "string" &&
                    Number.isInteger(p.gameId) &&
                    allowedGames.has(p.gameId) &&
                    typeof p.title === "string" &&
                    typeof p.scheduledAt === "string" &&
                    typeof p.createdBy === "string" &&
                    people.has(p.createdBy) &&
                    typeof p.createdAt === "string"
            )
            : [],
        circleGroupRecommendations: Array.isArray(input.circleGroupRecommendations)
            ? input.circleGroupRecommendations.filter(
                (r: any) =>
                    typeof r.id === "string" &&
                    typeof r.circleId === "string" &&
                    Number.isInteger(r.gameId) &&
                    allowedGames.has(r.gameId) &&
                    typeof r.recommendedBy === "string" &&
                    people.has(r.recommendedBy) &&
                    typeof r.recommendedAt === "string" &&
                    typeof r.text === "string"
            )
            : [],
        circleGoals: Array.isArray(input.circleGoals)
            ? input.circleGoals.filter(
                (g: any) =>
                    typeof g.id === "string" &&
                    typeof g.circleId === "string" &&
                    typeof g.title === "string" &&
                    typeof g.description === "string" &&
                    typeof g.completed === "boolean" &&
                    typeof g.createdBy === "string" &&
                    people.has(g.createdBy) &&
                    typeof g.createdAt === "string" &&
                    Number.isFinite(g.progress) &&
                    g.progress >= 0 &&
                    g.progress <= 100 &&
                    (g.targetGameId == null ||
                        (Number.isInteger(g.targetGameId) && allowedGames.has(g.targetGameId)))
            )
            : [],
    }
}

/* ------------------------------------------------------------------------- */
/* Versioned local-storage persistence                                        */
/* ------------------------------------------------------------------------- */

function readStorage(key: string) {
    try {
        if (typeof window === "undefined") return { available: false, raw: null as string | null }
        return { available: true, raw: window.localStorage.getItem(key) }
    } catch {
        return { available: false, raw: null as string | null }
    }
}

function parseObject(raw: string | null) {
    if (!raw) return null
    try {
        const value: unknown = JSON.parse(raw)
        return isRecord(value) ? value : null
    } catch {
        return null
    }
}

type VersionedRecord = {
    available: boolean
    exists: boolean
    valid: boolean
    version: number
    state: unknown
}

function readVersioned(key: string): VersionedRecord {
    const storage = readStorage(key)
    if (!storage.raw) {
        return { available: storage.available, exists: false, valid: true, version: 0, state: null }
    }
    const parsed = parseObject(storage.raw)
    if (!parsed) {
        return { available: storage.available, exists: true, valid: false, version: 0, state: null }
    }
    const version = Number.isInteger(parsed.version) ? parsed.version : 0
    const hasEnvelope = Object.prototype.hasOwnProperty.call(parsed, "state")
    const state = hasEnvelope ? parsed.state : parsed
    return {
        available: storage.available,
        exists: true,
        valid: isRecord(state),
        version,
        state,
    }
}

/** Legacy drafts used `pendingInvites`; accept that shape during migration. */
function prepareLegacyShape(raw: unknown): Record<string, any> {
    const input = isRecord(raw) ? { ...raw } : {}
    const pending = Array.isArray(input.pendingInvites) ? input.pendingInvites : null
    return {
        ...createEmptySocialState(),
        ...input,
        invites: Array.isArray(input.invites) ? input.invites : pending || [],
    }
}

/** v1/v2 stored circles did not always keep `joined` and `members` in sync. */
function prepareV2Shape(raw: Record<string, any>): Record<string, any> {
    const circles = Array.isArray(raw.circles)
        ? raw.circles.map((circle: unknown) => {
            if (!isRecord(circle) || !Array.isArray(circle.members)) return circle
            const members = uniqueStrings(circle.members)
            if (circle.joined === true && !members.includes("you")) members.push("you")
            return { ...circle, members, joined: members.includes("you") }
        })
        : raw.circles
    return { ...raw, circles }
}

/**
 * Applies each known schema migration in order, then runs the canonical
 * normalizer. Unknown future versions are never silently downgraded.
 */
export function migrateSocialState(
    version: number,
    raw: unknown,
    games: GameRecord[] = gameCatalog
): SocialState {
    if (version > SOCIAL_STORAGE_VERSION) return createEmptySocialState()
    let shaped = prepareLegacyShape(raw)
    if (version <= 2) shaped = prepareV2Shape(shaped)
    return normalizeSocialState(shaped, games)
}

function mergeState(primary: unknown, fallback: unknown) {
    const preferred = isRecord(primary) ? primary : {}
    const secondary = isRecord(fallback) ? fallback : {}
    const merged: Record<string, unknown> = {}
    let usedFallback = false
    for (const key of [
        "circles", "reactions", "comments", "savedRecs", "privacy",
        "sent", "shares", "activity", "discussions", "invites",
    ]) {
        if (preferred[key] !== undefined) {
            merged[key] = preferred[key]
        } else {
            merged[key] = secondary[key]
            if (secondary[key] !== undefined) usedFallback = true
        }
    }
    return { state: merged, usedFallback }
}

export type SocialHydration = {
    state: SocialState
    canPersist: boolean
    shouldPersist: boolean
    source: "current" | "legacy" | "seed"
    version: number
}

/**
 * Reads the current key first and the legacy key second. Legacy data is never
 * deleted or overwritten; its fields fill gaps in the current record before a
 * versioned migration is written to the current key.
 */
export function loadSocialState(games: GameRecord[] = gameCatalog): SocialHydration {
    const current = readVersioned(SOCIAL_STORAGE_KEY)
    const legacy = readVersioned(LEGACY_SOCIAL_STORAGE_KEY)
    const blockedByNewerVersion = current.exists && current.version > SOCIAL_STORAGE_VERSION
    const hasLegacyData = legacy.exists && legacy.valid
    const hasCurrentData = current.exists && current.valid

    let source: unknown = null
    let version = 0
    let origin: SocialHydration["source"] = "seed"
    let migratedFromLegacy = false
    if (hasCurrentData) {
        const merged = mergeState(current.state, hasLegacyData ? legacy.state : null)
        source = merged.state
        migratedFromLegacy = merged.usedFallback
        version = current.version
        origin = "current"
    } else if (hasLegacyData) {
        source = legacy.state
        version = legacy.version
        origin = "legacy"
        migratedFromLegacy = true
    }

    return {
        state: source
            ? migrateSocialState(version, source, games)
            : createEmptySocialState(),
        canPersist: current.available && !blockedByNewerVersion,
        shouldPersist: !blockedByNewerVersion &&
            (migratedFromLegacy || !current.exists || !current.valid ||
                current.version < SOCIAL_STORAGE_VERSION),
        source: origin,
        version: current.version,
    }
}

/**
 * Shared low-level accessors. Feature modules use these instead of touching
 * browser storage directly; each feature still owns its own key and schema.
 */
export const readVersionedRecord = readVersioned

function writeVersioned(key: string, version: number, state: unknown) {
    try {
        if (typeof window === "undefined") return false
        const existing = readVersioned(key)
        if (existing.exists && existing.valid && existing.version > version) return false
        window.localStorage.setItem(key, JSON.stringify({ version, state }))
        return true
    } catch {
        return false
    }
}

/** Generic versioned writer shared by feature-owned records. */
export const writeVersionedRecord = writeVersioned

/** Generic writer retained for older callers; new writes use the typed helpers. */
export function saveState(key: string, value: unknown) {
    const record = isRecord(value) ? value : {}
    const hasEnvelope = Number.isInteger(record.version) &&
        Object.prototype.hasOwnProperty.call(record, "state")
    return writeVersioned(
        key,
        hasEnvelope ? record.version : 0,
        hasEnvelope ? record.state : value
    )
}

export function saveSocialState(state: SocialState) {
    return writeVersioned(SOCIAL_STORAGE_KEY, SOCIAL_STORAGE_VERSION, state)
}

export function loadAppState(games: GameRecord[] = gameCatalog): AppPreferences {
    const stored = readVersioned(APP_STORAGE_KEY)
    const raw = stored.exists && stored.valid ? stored.state : {}
    return {
        saved: uniqueGameIds(isRecord(raw) ? raw.saved : [], getAllowedGameIds(games)),
        atmos: isRecord(raw) && typeof raw.atmos === "string" ? raw.atmos : "Autumn",
        auto: isRecord(raw) && typeof raw.auto === "boolean" ? raw.auto : false,
    }
}

/**
 * The wishlist key predates social-state versioning. Keep its original raw
 * shape so older prototype builds can still read it; validation happens on
 * load via `loadAppState` and no social envelope is introduced here.
 */
export function saveAppState(value: AppPreferences) {
    try {
        if (typeof window === "undefined") return false
        window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(value))
        return true
    } catch {
        return false
    }
}

export function loadLegacyWishlist() {
    return loadAppState()
}

export function loadLegacyCommunity(): Partial<SocialState> | null {
    const stored = readVersioned(LEGACY_SOCIAL_STORAGE_KEY)
    return stored.exists && stored.valid ? stored.state as Partial<SocialState> : null
}

export function migrateLegacyState(
    legacy: Partial<SocialState>,
    games: GameRecord[] = gameCatalog
) {
    return migrateSocialState(LEGACY_SOCIAL_VERSION, legacy, games)
}

export function migrateCurrent(
    version: number,
    state: Partial<SocialState>,
    games: GameRecord[] = gameCatalog
) {
    return migrateSocialState(version, state, games)
}

/* ------------------------------------------------------------------------- */
/* Shared derived data and operations                                         */
/* ------------------------------------------------------------------------- */

/** Seed activity plus locally generated activity, validated for every feature. */
export function resolveActivity(state: SocialState, games: GameRecord[] = gameCatalog) {
    const gameIds = getAllowedGameIds(games)
    const people = new Set(socialPeople.map((person) => person.id))
    const circleIds = new Set(state.circles.map((circle) => circle.id))
    return [...state.activity, ...initialActivity]
        .filter((item) => people.has(item.person) && gameIds.has(item.game))
        .filter((item, index, list) =>
            list.findIndex((entry) => entry.id === item.id) === index
        )
        .map((item) => ({
            ...item,
            circle: item.circle && circleIds.has(item.circle) ? item.circle : null,
        }))
}

function isValidRecipient(recipient: string, circles: SocialCircle[]) {
    return isPersonRecipient(recipient) || getRecipientId(recipient, circles) !== null
}

function makeActivity(
    id: string,
    game: number,
    action: string,
    quote: string,
    circle: string | null,
    why = "A personal recommendation from you."
): SocialActivity {
    return {
        id,
        person: "you",
        game,
        category: "Recommendations",
        action,
        time: "Just now",
        quote,
        why,
        circle,
        likes: 0,
    }
}

export function useSocialState(
    games: GameRecord[],
    saved: number[],
    toggle: (id: number) => void,
    openGame: (game: GameRecord | number | null | undefined) => void,
    go: (destination: string, id?: string) => void,
    useFinder: (prefs: Record<string, string>) => void
): SocialContextValue {
    const [hydration] = React.useState(() => loadSocialState(games))
    const [state, setState] = React.useState<SocialState>(hydration.state)
    const [dialog, setDialog] = React.useState<{ type: string; [key: string]: any } | null>(null)
    const [message, setMessage] = React.useState("")
    const mounted = React.useRef(false)

    React.useEffect(() => {
        if (!hydration.canPersist) return
        if (!mounted.current) {
            mounted.current = true
            if (hydration.shouldPersist && !saveSocialState(state)) {
                setMessage("Social changes could not be saved in this browser.")
            }
            return
        }
        if (!saveSocialState(state)) {
            setMessage("Social changes could not be saved in this browser.")
        }
    }, [state, hydration])

    React.useEffect(() => {
        if (!message) return
        const timer = window.setTimeout(() => setMessage(""), 3500)
        return () => window.clearTimeout(timer)
    }, [message])

    function update(updater: (prev: SocialState) => SocialState) {
        setState((prev) => normalizeSocialState(updater(prev), games))
    }

    function react(id: string) {
        update((prev) => ({
            ...prev,
            reactions: prev.reactions.includes(id)
                ? prev.reactions.filter((entry) => entry !== id)
                : [...prev.reactions, id],
        }))
    }

    function comment(id: string, text: string) {
        if (!text.trim()) return
        update((prev) => ({
            ...prev,
            comments: {
                ...prev.comments,
                [id]: [
                    ...(prev.comments[id] || []),
                    { person: "you", text: text.trim() },
                ],
            },
        }))
    }

    function toggleSavedRecommendation(id: string) {
        update((prev) => ({
            ...prev,
            savedRecs: prev.savedRecs.includes(id)
                ? prev.savedRecs.filter((entry) => entry !== id)
                : [...prev.savedRecs, id],
        }))
    }

    function setPrivacy(privacy: SocialPrivacy) {
        update((prev) => ({ ...prev, privacy }))
        setMessage("Your privacy choices have been saved.")
    }

    function shortlist(circleId: string, gameId: number) {
        const circle = state.circles.find((entry) => entry.id === circleId)
        if (!circle || !circle.joined) {
            setMessage("Join this Gaming Circle to add to its wishlist.")
            return false
        }
        if (!games.some((game) => game.id === gameId)) {
            setMessage("Choose a game from the catalog first.")
            return false
        }
        const removing = circle.wishlist.includes(gameId)
        update((prev) => ({
            ...prev,
            circles: prev.circles.map((entry) =>
                entry.id !== circleId
                    ? entry
                    : {
                        ...entry,
                        wishlist: removing
                            ? entry.wishlist.filter((id) => id !== gameId)
                            : [...entry.wishlist, gameId],
                    }
            ),
        }))
        setMessage(removing
            ? "Removed from the circle’s shared wishlist."
            : "Added to the circle’s shared wishlist.")
        return true
    }

    function join(id: string) {
        update((prev) => ({
            ...prev,
            circles: prev.circles.map((circle) => {
                if (circle.id !== id) return circle
                const members = circle.joined
                    ? circle.members.filter((member) => member !== "you")
                    : [...new Set([...circle.members, "you"])]
                return { ...circle, joined: members.includes("you"), members }
            }),
        }))
    }

    function createCircle(name: string) {
        const trimmed = name.trim()
        if (!trimmed) {
            setMessage("Give your circle a name first.")
            return null
        }
        const id = `circle-${Date.now()}`
        update((prev) => ({
            ...prev,
            circles: [
                ...prev.circles,
                {
                    id,
                    name: trimmed,
                    tag: "A shared world starts here.",
                    desc: "A new circle for your friends and your next discoveries.",
                    members: ["you"],
                    wishlist: [],
                    playing: [],
                    topic: "Your interests · Your friends",
                    joined: true,
                },
            ],
        }))
        setMessage("Your circle is ready. Invite a friend to get started.")
        return id
    }

    function getInviteSuggestions(circleId: string) {
        return buildInviteSuggestions(state.circles, socialPeople, circleId, state.invites)
    }

    function inviteToCircle(circleId: string, personId: string) {
        const id = `invite-${Date.now()}`
        const decision = createCircleInvite(state.invites, state.circles, circleId, personId, id)
        const messages: Record<CircleInviteResult, string> = {
            added: "Invitation saved as pending. No notification was sent, and your friend has not joined yet.",
            member: "They’re already in this circle.",
            pending: "An invitation is already pending for this friend.",
            invalid: "That circle invitation could not be created.",
        }
        setMessage(messages[decision.result])
        if (decision.result !== "added") return false

        update((prev) => {
            const next = createCircleInvite(prev.invites, prev.circles, circleId, personId, id)
            return next.result === "added" ? { ...prev, invites: next.invites } : prev
        })
        return true
    }

    function respondToInvite(inviteId: string, decision: InviteStatus) {
        const invite = state.invites.find((entry) => entry.id === inviteId)
        if (!invite || invite.status !== "pending") return
        const result = applyInviteDecision(state.invites, state.circles, inviteId, decision)
        update((prev) => ({ ...prev, invites: result.invites, circles: result.circles }))
        setMessage(
            decision === "accepted"
                ? "Invitation accepted. The friend is now part of the circle."
                : "Invitation declined. The circle stays unchanged."
        )
    }

    function recommend(gameId: number, recipient: string, text: string) {
        if (!games.some((game) => game.id === gameId) || !isValidRecipient(recipient, state.circles)) {
            setMessage("Choose a valid game and friend or Gaming Circle.")
            return false
        }
        const circleId = getRecipientId(recipient, state.circles)
        const recipientName = socialPeople.find((person) => person.id === recipient)?.name ||
            state.circles.find((circle) => circle.id === circleId)?.name ||
            "the circle"
        const id = `rec-${Date.now()}`
        const recommendation: SocialRecommendation = {
            id,
            sender: "you",
            recipient,
            game: gameId,
            text: text.trim() || "I thought this could be your next favorite.",
            createdAt: new Date().toISOString(),
        }
        update((prev) => ({
            ...prev,
            sent: [...prev.sent, recommendation],
            activity: [
                makeActivity(
                    id,
                    gameId,
                    `recommended a game to ${recipientName}`,
                    recommendation.text,
                    circleId
                ),
                ...prev.activity,
            ],
            circles: circleId
                ? prev.circles.map((circle) =>
                    circle.id === circleId
                        ? { ...circle, wishlist: [...new Set([...circle.wishlist, gameId])] }
                        : circle
                )
                : prev.circles,
        }))
        setMessage("Recommendation shared in this prototype.")
        return true
    }

    function shareWishlist(recipient: string, gameIds: number[]) {
        const validGames = [...new Set(gameIds.filter((id) => games.some((game) => game.id === id)))]
        if (!validGames.length || !isValidRecipient(recipient, state.circles)) {
            setMessage("Choose a valid recipient and save a game before sharing.")
            return false
        }
        const circleId = getRecipientId(recipient, state.circles)
        const recipientName = socialPeople.find((person) => person.id === recipient)?.name ||
            state.circles.find((circle) => circle.id === circleId)?.name ||
            "a circle"
        const titles = validGames
            .map((id) => games.find((game) => game.id === id)?.title)
            .filter((title): title is string => Boolean(title))
        const id = `wishlist-${Date.now()}`
        const share: SocialWishlistShare = {
            id: `shared-${Date.now()}`,
            sender: "you",
            recipient,
            games: validGames,
            createdAt: new Date().toISOString(),
        }
        update((prev) => ({
            ...prev,
            shares: [...prev.shares, share],
            activity: [
                makeActivity(
                    id,
                    validGames[0],
                    `shared a wishlist with ${recipientName}`,
                    `A few worlds I’d like to explore together: ${titles.join(", ")}.`,
                    circleId,
                    "A shared wishlist from you. Keep the conversation going."
                ),
                ...prev.activity,
            ],
            circles: circleId
                ? prev.circles.map((circle) =>
                    circle.id === circleId
                        ? { ...circle, wishlist: [...new Set([...circle.wishlist, ...validGames])] }
                        : circle
                )
                : prev.circles,
        }))
        setMessage("Your wishlist was shared within this prototype.")
        return true
    }

    const activity = React.useMemo(() => resolveActivity(state, games), [state, games])
    const graph = React.useMemo(
        () => buildSocialGraph({
            people: socialPeople,
            friendships: initialFriendships,
            circles: state.circles,
            recommendations: state.sent,
            shares: state.shares,
            games,
        }),
        [state.circles, state.sent, state.shares, games]
    )

    return {
        games,
        saved,
        toggle,
        openGame,
        go,
        useFinder,
        state,
        update,
        dialog,
        setDialog,
        message,
        setMessage,
        react,
        comment,
        toggleSavedRecommendation,
        setPrivacy,
        shortlist,
        join,
        createCircle,
        getInviteSuggestions,
        inviteToCircle,
        respondToInvite,
        recommend,
        shareWishlist,
        people: socialPeople,
        activity,
        graph,
    }
}
