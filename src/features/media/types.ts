/**
 * Presentation-layer aliases for the canonical media contracts declared in
 * `src/data/games.ts`. Keeping the definitions in the catalog avoids duplicate
 * metadata definitions across features.
 */

export type {
    GameMedia,
    GameMediaType,
} from "../../data/games"

export const MEDIA_FALLBACK_LABEL = "No gameplay preview available"
