import { gameCatalog, type GameRecord } from "../../data/games"
import { readVersionedRecord, writeVersionedRecord } from "../../social"
import { COMPARE_KEYS } from "./types"
import { getUnresolvedComparisonIds, resolveComparisonIds } from "./utils"

/**
 * Comparison selections live in their own versioned key. Social state and the
 * wishlist keep their existing keys; all browser storage access goes through
 * the shared owner in social.ts.
 */
export const COMPARE_STORAGE_KEY = COMPARE_KEYS.storage
export const COMPARE_STORAGE_VERSION = COMPARE_KEYS.version

export type ComparisonHydration = {
    selectedGameIds: number[]
    /** IDs present in storage that could not be resolved through the catalog. */
    ignored: unknown[]
    canPersist: boolean
    exists: boolean
    valid: boolean
    version: number
}

const isRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value)

/** Accepts the versioned envelope and the earlier bare-ID-array shape. */
export const getStoredComparisonIds = (raw: unknown): unknown => {
    if (Array.isArray(raw)) return raw
    if (!isRecord(raw)) return null
    if (isRecord(raw.state) && "selectedGameIds" in raw.state) return raw.state.selectedGameIds
    if ("selectedGameIds" in raw) return raw.selectedGameIds
    return null
}

export const normalizePersistedComparison = (
    raw: unknown,
    games: GameRecord[] = gameCatalog
): { selectedGameIds: number[]; ignored: unknown[] } => {
    const candidate = getStoredComparisonIds(raw)
    return {
        selectedGameIds: resolveComparisonIds(candidate, games),
        ignored: getUnresolvedComparisonIds(candidate, games),
    }
}

export const loadComparisonState = (
    games: GameRecord[] = gameCatalog
): ComparisonHydration => {
    const stored = readVersionedRecord(COMPARE_STORAGE_KEY)
    const hasFutureVersion = stored.version > COMPARE_STORAGE_VERSION
    const candidate = hasFutureVersion ? null : stored.state
    const normalized = normalizePersistedComparison(candidate, games)

    return {
        selectedGameIds: normalized.selectedGameIds,
        ignored: normalized.ignored,
        canPersist: stored.available && !hasFutureVersion,
        exists: stored.exists,
        valid: stored.valid || Array.isArray(stored.state),
        version: stored.version,
    }
}

export const saveComparisonState = (
    selectedGameIds: number[],
    games: GameRecord[] = gameCatalog
): boolean =>
    writeVersionedRecord(
        COMPARE_STORAGE_KEY,
        COMPARE_STORAGE_VERSION,
        { selectedGameIds: resolveComparisonIds(selectedGameIds, games) }
    )
