# Development workflow

## Requirements

- Node.js 20.19+ or 22.12+
- npm version compatible with the lockfile

## Install and run

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run typecheck
npm test
npm run build
```

Run all three validation commands after each structural refactor. `npm ci` uses the committed lockfile; dependency versions in `package.json` are pinned to the versions resolved in that lockfile.

`npm test` now includes `tests/social-state.test.mjs`, which covers centralized storage ownership, legacy/current migration, malformed data, invalid references, invitation/membership consistency, catalog-valid graph relationships, and safe app-preference loading. When changing `SocialState`, add or update those tests alongside the schema change.

## Archive and generated files

- Do not commit `node_modules/` or `dist/`.
- Historical application snapshots belong in `archive/legacy-implementations/`, not `src/`.
- Keep the active application import in `src/main.tsx` explicit.

## Safe incremental refactoring

Before extracting a feature from `PLAYSCAPE-cleaner.tsx`:

1. Identify its props, context dependencies, state ownership, and imported helpers.
2. Extract the smallest cohesive unit first.
3. Preserve public behavior and existing local-storage keys. Social state must be read/written only through `src/social.ts`; feature modules consume the shared context value and centralized operations.
4. If the social schema changes, bump `SOCIAL_STORAGE_VERSION`, add a forward migration, update `docs/ARCHITECTURE.md`, and test both legacy and current storage shapes.
5. Run typecheck, tests, and build.
6. Compare the affected route against the pre-refactor prototype.
