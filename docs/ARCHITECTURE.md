# PLAYSCAPE architecture notes

## Active application entry

`src/main.tsx` mounts `src/PLAYSCAPE-cleaner.tsx`. This is the active prototype implementation and remains the source of truth for application behavior during the initial refactor.

## Current modules

- `src/data/games.ts` — canonical game records, catalog validation, lookup, search, filtering, sorting, wishlist summaries, and comparison helpers.
- `src/socialData.ts` — shared social entity types, sample people/circles/activity/friendships, seed-state factory, and the canonical `buildSocialGraph()` used by The Web.
- `src/socialState.ts` — pure invitation helpers (`createCircleInvite`, `applyInviteDecision`, suggestions, summaries) built on the shared entity contracts.
- `src/social.ts` — the single owner of persisted social state: versioned loading/migration, validation, centralized social operations, derived activity, and the canonical graph instance exposed through context.
- `src/components/Icon.tsx` — shared inline SVG icon component extracted from the active application during Increment 1.
- `src/components/layout/AppLayout.tsx` — shared application shell and `.wrap` page container.
- `src/components/layout/PageContainer.tsx` — reusable semantic page wrapper for primary routes.
- `src/components/navigation/NavigationItem.tsx` — reusable accessible navigation button and active-state rendering.
- `src/components/navigation/MainNavigation.tsx` — primary, mobile, and community navigation destinations.
- `src/index.css` — global page/reset styles.
- `src/PLAYSCAPE-cleaner.tsx` — active feature composition and application/UI state. It consumes `useSocialState()` from `src/social.ts` and publishes the shared value through `CommunityContext`; it no longer owns or writes social state itself.

Increment 2A extracted the shared application shell and route page wrapper. Hash routing, view state, and application UI state remain in `PLAYSCAPE-cleaner.tsx`; `AppLayout`, `MainNavigation`, `NavigationItem`, and `PageContainer` consume existing state and navigation callbacks. Increment 4 moved social state ownership into `src/social.ts`.

## Historical implementations

`archive/legacy-implementations/` contains the previous `Playscape.tsx`, `PLAYSCAPE-002.tsx`, `PLAYSCAPE-003.tsx`, `PLAYSCAPE-004.tsx`, and `PLAYSCAPE-redesign.tsx` snapshots. They are retained for reference but are not imported by the active application or included in the TypeScript source build.

## State and persistence

### Ownership

`src/social.ts` is the only module that reads or writes social storage keys. `PLAYSCAPE-cleaner.tsx` owns only application/UI state (`atmos`, `saved`, `auto`, filters, navigation, dialogs at the app boundary). Feature modules receive the shared social value through `CommunityContext` and call centralized operations rather than mutating storage or duplicating invitation/recommendation logic. `SocialDialog` in the active app now delegates to `createCircle`, `inviteToCircle`, `shortlist`, `setPrivacy`, `shareWishlist`, and `recommend`.

The shared `SocialState` contains circles, reactions, comments, saved recommendations, privacy, sent recommendations, wishlist shares, locally generated activity, circle discussions, and invitations. Shared entity contracts live in `src/socialData.ts`; `src/socialState.ts` holds pure invitation helpers; `src/social.ts` validates and migrates persisted values, reconciles membership, and derives `activity` and `graph`.

### Storage keys and migration behavior

| Key | Shape | Behavior |
| --- | --- | --- |
| `playscape-v1` | Raw `{ atmos, saved, auto }` | Application/wishlist preferences. Kept in its original raw shape for compatibility; loaded with validation and written by `saveAppState()`. |
| `playscape-community-v2` | Raw legacy social state | Read-only legacy source. Never deleted or rewritten. Older `pendingInvites` are accepted as `invites`. |
| `playscape-social-v1` | `{ version, state }` | Current social state. Written at version 3 by `saveSocialState()`. |

Migration rules:

1. `loadSocialState()` reads the current key first, then the legacy key. Legacy fields fill only fields missing from the current record; valid current fields always win.
2. Schema versions 1 and 2 are migrated in order. They reconcile `joined` with the `members` array and accept older field names. Version 3 adds validated recipients and graph relationships for recommendations/shares.
3. Every value passes through `normalizeSocialState()`. Unknown people, circles, games, recipients, and activity are dropped. Seed people (`you`, `jamie`, `alex`, `morgan`), seed circles (`afterhours`, `scenic`, `story`), seed friendships, and seed activity IDs (`a1`–`a7`) are preserved. Seed circle names/descriptions are canonical even if stale storage contains a different name; validated membership and wishlist changes are retained.
4. Accepted invitations add the recipient to circle membership; `joined` is always derived from whether `you` is in `members`. Pending invitations for existing members are removed. New invitations stay pending and never notify or auto-join.
5. Malformed JSON, invalid records, and unavailable storage fall back safely. Unknown future social versions are never downgraded or overwritten.
6. The current key is written on first migration and on later state changes. A valid current version 3 record is not rewritten merely because the read-only legacy key still exists.

### The Web

`buildSocialGraph()` in `src/socialData.ts` is the single graph builder. It validates all game IDs against `gameCatalog`, titles game nodes from the catalog, includes circle/member and shared-wishlist edges, and adds recommendation/share edges from persisted state. `features/the-web/index.tsx` consumes `community.graph` and only supplies visual positions and view filtering; it no longer constructs its own graph.

## Refactoring principles

1. Preserve the current UI and interactions unless a change is explicitly scoped.
2. Keep game identity canonical: feature components should resolve games through `src/data/games.ts` rather than duplicating metadata.
3. Extract components in small, reviewable steps; avoid a large rewrite of the active component.
4. Keep sample data clearly identified as prototype data.
5. Add tests around behavior before changing shared state contracts.
