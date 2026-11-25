# PLAYSCAPE — standalone React prototype

This is the existing PLAYSCAPE Framer code component moved into a standalone Vite + React + TypeScript app. The visual design, sample game data, routes, The Web graph, community feed, profiles, circles, and local prototype interactions are retained. Framer property controls and the Framer runtime dependency have been removed.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm ci
npm run dev
```

Open the local URL Vite prints (usually http://localhost:5173). To create a production build:

```bash
npm run build
npm run preview
```

Run the catalog and social-state tests separately with:

```bash
npm test
```

## What changed in this conversion

- Removed `framer` imports and `addPropertyControls`; the component now runs in a normal React app.
- Fixed season-card selection so it consistently updates the associated mood filter, even after a previous mood was selected.
- Implemented all four playtime options using the sample games’ `session` minute values: 15 minutes, up to 1 hour, several hours (61–120 minutes), and long sessions (over 120 minutes). The sample catalog currently has no title tagged above 120 minutes, so “Long sessions” can correctly return no matches until that metadata exists.
- Group Finder now excludes requested group sizes larger than the selected circle’s member count, preventing ownership calculations from implying that absent members are participating.
- Game cards display each game’s platform metadata rather than the generic “PC + consoles” label.
- Changed the Steam action label to “View on Steam” because it opens a store listing, not a gameplay video.
- Changed circle invitations to remain pending instead of silently adding a friend and reporting that they accepted. The prototype records the pending invitation but does not send a real notification or provide a real acceptance workflow yet.
- Direct recommendations and wishlist shares to individual friends are no longer incorrectly tagged as activity in the After Hours circle.
- The Web now includes circle nodes for all circles in local prototype state, including newly created circles, and its filters include recommendation nodes.
- Social state now has one local owner (`src/social.ts`). Profiles, Community, Gaming Circles, The Web, and wishlist sharing resolve the same people, circles, invitations, recommendations, shares, and activity. Existing local-storage data is migrated in place with versioned, validated schemas; legacy keys are preserved.

## Important prototype limitations

- The included people, games, recommendations, activity, and circle data are sample data.
- Social state is stored in the current browser’s local storage with versioned migrations. It is not a real account system and does not sync between devices or users. Clearing browser storage resets the local prototype state.
- The Web graph is generated from the shared social model and canonical game catalog, but it still starts from the authored sample people/circles and only supports the prototype’s local actions.
- Steam artwork is loaded from Steam’s public CDN. Google Fonts and the editorial background image also require an internet connection.
- No real checkout, Steam purchase, friend invitation delivery, authentication, or backend service is connected.

## Suggested next steps

1. Run it locally and compare every route against the current published Framer version.
2. Test mood, budget, platform, player-count, and playtime filters with edge cases.
3. Decide whether to add a small backend/auth layer or keep this as a local interactive prototype.
4. Decide whether the local pending-invitation/accept-decline model is sufficient, or replace it with a real backend-delivered workflow before presenting it as real social functionality.
5. Extend the shared social schema and `buildSocialGraph()` together when adding new relationship types beyond the current prototype actions.

## Project structure

- `src/main.tsx` — React entry point; mounts the active `PLAYSCAPE-cleaner.tsx` implementation
- `src/PLAYSCAPE-cleaner.tsx` — active application and prototype feature composition
- `src/components/Icon.tsx` — shared SVG icon component
- `src/data/games.ts` — canonical game catalog and shared catalog helpers
- `src/socialData.ts` — shared social entity types, sample people/circles/activity, seed state, and the canonical graph builder
- `src/socialState.ts` — pure invitation and suggestion helpers
- `src/social.ts` — unified social state, versioned migrations, validated persistence, centralized operations, and derived activity/graph
- `src/index.css` — global reset and page styles
- `archive/legacy-implementations/` — retained historical versions; not imported by the active app
- `docs/ARCHITECTURE.md` — current architecture and refactoring constraints
- `docs/INFORMATION_ARCHITECTURE.md` — Mermaid visual of routes, navigation, overlays, and state domains
- `docs/DEVELOPMENT.md` — local development and validation workflow
- `index.html` — Vite page shell

## Unified social state and local storage

All social features share the state owned by `src/social.ts`. Feature modules receive it through context and call centralized operations for circles, invitations, recommendations, wishlist shares, reactions, comments, privacy, and activity. No feature module writes a social storage key directly.

Storage keys:

- `playscape-v1` — raw `{ atmos, saved, auto }` wishlist/application preferences; shape preserved for compatibility.
- `playscape-community-v2` — original community state; read-only legacy source and never deleted or rewritten.
- `playscape-social-v1` — current `{ version, state }` social record, written at version 3.

Migration is versioned and defensive: legacy field names are accepted, existing valid fields win over legacy fallbacks, malformed values are dropped or fall back to seed data, and unknown future versions are never downgraded. Sample identities (`you`, `jamie`, `alex`, `morgan`; `afterhours`, `scenic`, `story`; activity `a1`–`a7`) are preserved. Accepted invitations reconcile circle membership, while new invitations remain pending with no real notification or automatic join. See `docs/ARCHITECTURE.md` for the full migration contract.

## Central game catalog

The canonical catalog lives in `src/data/games.ts`.

- `gameCatalog` is the single source of truth used by the React app.
- `GameRecord` defines the shared game shape used by every feature.
- `getGameById()` and `getGameBySlug()` provide stable lookups.
- `searchGames()` and `filterGames()` provide reusable catalog queries and accept an optional game collection, so supplied/test catalogs work without silently falling back to global data.
- `sortGames()` provides stable featured, title, and price sorting without mutating the filtered results. `getGameById()` and `getGameBySlug()` also accept an optional catalog collection.
- Discover search and Experience Finder filters use these shared functions instead of a separate inline filter implementation. Mood, budget, player mode, platform, difficulty, and session length are combined in one query pipeline.
- Browse is now a dedicated route (`#/browse`) with catalog search, genre and platform filters, and featured/title/price sorting. Its controls read from the same catalog and shared search/filter/sort helpers.
- The one-hour option includes all games with a session estimate of 60 minutes or less; “Several hours” means 61–120 minutes; “Long sessions” means over 120 minutes. The current sample catalog has no games in that last range.
- `npm test` runs focused catalog tests covering stable IDs, validation, search fields, combined filters, player modes, session ranges, lookups, sorting, and custom subsets.
- `validateGameCatalog()` checks duplicate IDs/slugs and basic data integrity.
- `defaultGames` remains as a compatibility alias for any older components.

The current eight records are migrated from the original prototype. Their existing IDs are preserved because social profiles, circles, and activity records refer to those IDs. Several fields (especially prices, platforms, mood tags, difficulty, and session length) are still prototype metadata, not verified live-store facts. Optional enrichment fields are defined in `GameRecord` but intentionally left blank until reliable sources are added.

When the catalog grows, keep game metadata here (or move the same schema to an API/database later). Do not create separate game lists inside Discover, Browse, The Web, or My Library; those features should query this shared catalog.
