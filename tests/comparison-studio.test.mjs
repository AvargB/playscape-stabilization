import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { buildComparisonSummary, gameCatalog, getGameById } from '../src/data/games.ts'
import { APP_STORAGE_KEY, SOCIAL_STORAGE_KEY } from '../src/social.ts'
import {
    COMPARE_STORAGE_KEY,
    COMPARE_STORAGE_VERSION,
    loadComparisonState,
    normalizePersistedComparison,
    saveComparisonState,
} from '../src/features/compare/storage.ts'
import {
    MAX_COMPARISON_GAMES,
    MIN_COMPARISON_GAMES,
} from '../src/features/compare/types.ts'
import {
    addGameToComparison,
    buildComparisonRows,
    canAddGame,
    clearComparison,
    filterComparisonRows,
    getComparisonGames,
    getComparisonSummary,
    getMajorDifferences,
    getPlatformSupport,
    getPlayCapabilities,
    getPriceComparison,
    getPriceRow,
    getSharedCharacteristics,
    getUnresolvedComparisonIds,
    hasDuplicates,
    removeGameFromComparison,
    resolveComparisonIds,
    searchComparisonGames,
} from '../src/features/compare/utils.ts'
import ComparePage from '../src/features/compare/ComparePage.tsx'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))
const STARDEW = 413150
const SHORT_HIKE = 1055540
const HADES = 1145360
const MISSING = 999999

function installStorage(initial = {}) {
    const previousWindow = globalThis.window
    const store = new Map(Object.entries(initial))
    globalThis.window = {
        localStorage: {
            getItem: (key) => (store.has(key) ? store.get(key) : null),
            setItem: (key, value) => store.set(key, String(value)),
            removeItem: (key) => store.delete(key),
        },
    }
    return {
        store,
        snapshot: () => Object.fromEntries(store),
        restore: () => {
            if (previousWindow === undefined) delete globalThis.window
            else globalThis.window = previousWindow
        },
    }
}

function withStorage(initial, run) {
    const storage = installStorage(initial)
    try {
        return run(storage)
    } finally {
        storage.restore()
    }
}

function renderPage({
    selectedGameIds = [],
    saved = [],
    games = gameCatalog,
} = {}) {
    return renderToStaticMarkup(
        React.createElement(ComparePage, {
            games,
            selectedGameIds,
            saved,
            onAdd() {},
            onRemove() {},
            onClear() {},
            onToggleSaved() {},
            onOpenGame() {},
            onBrowse() {},
        })
    )
}

/* ------------------------------------------------------------------ */
/* 1–4. Selection operations                                            */
/* ------------------------------------------------------------------ */

test('adding games appends canonical catalog IDs to the comparison', () => {
    const result = addGameToComparison(SHORT_HIKE, [STARDEW])
    assert.equal(result.success, true)
    assert.deepEqual(result.newIds, [STARDEW, SHORT_HIKE])
    assert.equal(result.error, undefined)
})

test('removing games and clearing the comparison preserves selection order', () => {
    const ids = [STARDEW, SHORT_HIKE, HADES]
    assert.deepEqual(removeGameFromComparison(SHORT_HIKE, ids), [STARDEW, HADES])
    assert.deepEqual(removeGameFromComparison(MISSING, ids), ids)
    assert.deepEqual(clearComparison(), [])
})

test('duplicate selections are rejected without mutating the list', () => {
    const original = [STARDEW]
    const result = addGameToComparison(STARDEW, original)
    assert.equal(result.success, false)
    assert.match(result.error, /already in comparison/i)
    assert.deepEqual(result.newIds, original)
    assert.equal(hasDuplicates([STARDEW, STARDEW]), true)
    assert.equal(hasDuplicates([STARDEW, SHORT_HIKE]), false)
})

test('comparison capacity is capped at four games with a clear message', () => {
    assert.equal(MIN_COMPARISON_GAMES, 2)
    assert.equal(MAX_COMPARISON_GAMES, 4)
    let ids = []
    for (const id of [STARDEW, SHORT_HIKE, HADES, 504230]) {
        const result = addGameToComparison(id, ids)
        assert.equal(result.success, true)
        ids = result.newIds
    }
    assert.equal(canAddGame(ids), false)
    const rejected = addGameToComparison(972660, ids)
    assert.equal(rejected.success, false)
    assert.match(rejected.error, /Maximum of 4 games/i)
    assert.match(rejected.error, /Remove a game/i)
    assert.deepEqual(rejected.newIds, ids)
})

/* ------------------------------------------------------------------ */
/* 5–6. Catalog resolution and missing records                          */
/* ------------------------------------------------------------------ */

test('comparison IDs resolve through the centralized catalog', () => {
    const resolved = resolveComparisonIds(
        [HADES, STARDEW, HADES, MISSING, '413150', null],
        gameCatalog
    )
    assert.deepEqual(resolved, [HADES, STARDEW])
    assert.deepEqual(
        getComparisonGames([STARDEW, SHORT_HIKE], gameCatalog).map((game) => game.title),
        [getGameById(STARDEW).title, getGameById(SHORT_HIKE).title]
    )
    const summary = getComparisonSummary([STARDEW, SHORT_HIKE], gameCatalog)
    assert.equal(summary.cheapest.id, SHORT_HIKE)
    assert.equal(summary.gameCount, 2)
    assert.ok(summary.platforms.length > 0)
})

test('missing catalog records are ignored and never become comparison columns', () => {
    assert.deepEqual(
        getUnresolvedComparisonIds([STARDEW, MISSING, 'nope', null], gameCatalog),
        [MISSING, 'nope', null]
    )
    assert.deepEqual(getComparisonGames([MISSING], gameCatalog), [])
    assert.deepEqual(buildComparisonRows(getComparisonGames([MISSING], gameCatalog)), [])
    const html = renderPage({ selectedGameIds: [MISSING] })
    assert.doesNotMatch(html, /Unknown game/)
})

test('catalog picker search reflects selection state without duplicating metadata', () => {
    const results = searchComparisonGames('Stardew Valley', [STARDEW], gameCatalog)
    assert.equal(results.length, 1)
    assert.equal(results[0].game.id, STARDEW)
    assert.equal(results[0].selected, true)
    const unselected = searchComparisonGames('Stardew Valley', [], gameCatalog)
    assert.equal(unselected[0].selected, false)
    assert.equal(unselected[0].game.title, getGameById(STARDEW).title)
})

/* ------------------------------------------------------------------ */
/* 7–9. Price, shared/different analysis, and filtering                 */
/* ------------------------------------------------------------------ */

test('price comparison uses stored catalog prices and flags only the lowest', () => {
    const games = getComparisonGames([STARDEW, HADES], gameCatalog)
    const prices = getPriceComparison(games)
    assert.equal(prices.lowestPrice, getGameById(STARDEW).price)
    assert.deepEqual(prices.lowestPriceIds, [STARDEW])
    assert.equal(prices.hasDifference, true)
    const hadesDifference = prices.differences.find((entry) => entry.gameId === HADES)
    assert.equal(hadesDifference.amount, Number((getGameById(HADES).price - getGameById(STARDEW).price).toFixed(2)))

    const row = getPriceRow(games, prices)
    assert.equal(row.values[0], '$14.99')
    assert.match(row.values[1], /\+\$10\.00 vs lowest/)
    assert.equal(row.status, 'different')

    const summary = buildComparisonSummary(games, gameCatalog)
    assert.equal(summary.lowestPrice, prices.lowestPrice)
    assert.equal(summary.bestValue.id, STARDEW)
})

test('shared and differing catalog characteristics are detected from real fields', () => {
    const cozyGames = getComparisonGames([STARDEW, SHORT_HIKE], gameCatalog)
    const cozyRows = buildComparisonRows(cozyGames)
    const cozyPlatforms = cozyRows.find((row) => row.id === 'platforms')
    const cozyMoods = cozyRows.find((row) => row.id === 'moods')
    assert.equal(cozyRows.find((row) => row.id === 'difficulty').status, 'shared')
    assert.ok(cozyPlatforms.sharedValues.includes('pc'))
    assert.ok(cozyMoods.sharedValues.includes('relaxing'))
    assert.ok(getSharedCharacteristics(cozyGames, cozyRows).some((entry) => entry.value === 'relaxing'))

    const mixedGames = getComparisonGames([STARDEW, HADES], gameCatalog)
    const mixedRows = buildComparisonRows(mixedGames)
    assert.equal(mixedRows.find((row) => row.id === 'difficulty').status, 'different')
    assert.equal(mixedRows.find((row) => row.id === 'moods').sharedValues.length, 0)
    assert.ok(getMajorDifferences(mixedGames, mixedRows).some((row) => row.id === 'difficulty'))
})

test('play capabilities are derived only from catalog player metadata', () => {
    const stardew = getPlayCapabilities(getGameById(STARDEW))
    assert.equal(stardew.coop, true)
    assert.equal(stardew.online, false)
    assert.equal(stardew.multiplayer, false)
    const hades = getPlayCapabilities(getGameById(HADES))
    assert.equal(hades.local, false)
    assert.equal(hades.online, false)
    assert.equal(hades.coop, false)
    assert.deepEqual(getPlatformSupport(getComparisonGames([STARDEW, HADES], gameCatalog), 'PC'), [STARDEW, HADES])
})

test('differences-only and shared filters return the expected rows', () => {
    const games = getComparisonGames([STARDEW, HADES], gameCatalog)
    const rows = [getPriceRow(games), ...buildComparisonRows(games)]
    const differences = filterComparisonRows(rows, 'differences')
    const shared = filterComparisonRows(rows, 'shared')

    assert.equal(filterComparisonRows(rows, 'all').length, rows.length)
    assert.ok(differences.length > 0)
    assert.ok(differences.every((row) => row.status === 'different'))
    assert.ok(differences.some((row) => row.id === 'price'))
    assert.ok(differences.some((row) => row.id === 'difficulty'))
    assert.ok(shared.length > 0)
    assert.ok(shared.every((row) => row.status === 'shared' || row.sharedValues.length > 0))
    assert.ok(shared.some((row) => row.id === 'platforms'))
})

/* ------------------------------------------------------------------ */
/* 10. Wishlist integration                                             */
/* ------------------------------------------------------------------ */

test('comparison workspace renders existing wishlist state and actions', () => {
    const html = renderPage({ selectedGameIds: [STARDEW, SHORT_HIKE], saved: [STARDEW] })
    assert.match(html, /aria-label="Remove Stardew Valley from wishlist"/)
    assert.match(html, /aria-label="Add A Short Hike to wishlist"/)
    assert.match(html, /Wishlisted/)
    assert.match(html, /Add to wishlist/)
    assert.match(html, /aria-pressed="true"/)

    const compareSource = readFileSync(
        path.join(srcRoot, 'features/compare/ComparePage.tsx'), 'utf8')
    assert.doesNotMatch(compareSource, /localStorage|saveAppState|createContext/)
})

test('comparison game presentations open the product details view', () => {
    const html = renderPage({ selectedGameIds: [STARDEW, HADES], saved: [] })
    const stardewLabel = `View ${getGameById(STARDEW).title} product details`
    assert.ok(html.includes(stardewLabel))
    assert.match(html, /class="cmp-selection-open"/)
    assert.match(html, /class="cmp-result-art"/)
    assert.match(html, /class="cmp-result-title"/)
    assert.match(html, /class="cmp-game-art"/)
    assert.match(html, /class="cmp-summary-game"/)

    const compareSource = readFileSync(
        path.join(srcRoot, 'features/compare/ComparePage.tsx'), 'utf8')
    const pickerSource = readFileSync(
        path.join(srcRoot, 'features/compare/GamePicker.tsx'), 'utf8')
    const tableSource = readFileSync(
        path.join(srcRoot, 'features/compare/ComparisonTable.tsx'), 'utf8')
    const summarySource = readFileSync(
        path.join(srcRoot, 'features/compare/ComparisonSummary.tsx'), 'utf8')

    assert.match(compareSource, /className="cmp-selection-open"[\s\S]*?onOpenGame\(game\)/)
    assert.match(compareSource, /<GamePicker[\s\S]*?onOpenGame=\{onOpenGame\}/)
    assert.match(pickerSource, /onOpenGame\?: \(game: GameRecord \| number\) => void/)
    assert.match(pickerSource, /onOpenGame\?\.\(game\)/)
    assert.match(tableSource, /className="cmp-game-art"[\s\S]*?onOpenGame\(game\)/)
    assert.match(summarySource, /className="cmp-summary-game"[\s\S]*?onOpenGame\(game\)/)
})

/* ------------------------------------------------------------------ */
/* 11–12. Persistence and invalid stored data                           */
/* ------------------------------------------------------------------ */

test('comparison selections persist and restore from their own key', () => {
    withStorage({}, (storage) => {
        assert.equal(saveComparisonState([STARDEW, SHORT_HIKE]), true)
        const record = JSON.parse(storage.snapshot()[COMPARE_STORAGE_KEY])
        assert.equal(record.version, COMPARE_STORAGE_VERSION)
        assert.deepEqual(record.state.selectedGameIds, [STARDEW, SHORT_HIKE])

        const hydrated = loadComparisonState()
        assert.deepEqual(hydrated.selectedGameIds, [STARDEW, SHORT_HIKE])
        assert.equal(hydrated.canPersist, true)
        assert.equal(hydrated.exists, true)

        assert.equal(storage.snapshot()[APP_STORAGE_KEY], undefined)
        assert.equal(storage.snapshot()[SOCIAL_STORAGE_KEY], undefined)
    })
})

test('invalid, missing, duplicate, and future comparison records are handled safely', () => {
    withStorage({
        [COMPARE_STORAGE_KEY]: JSON.stringify({
            version: COMPARE_STORAGE_VERSION,
            state: { selectedGameIds: [STARDEW, STARDEW, MISSING, 'bad', null, SHORT_HIKE, HADES, 504230] },
        }),
        [SOCIAL_STORAGE_KEY]: JSON.stringify({ version: 3, state: {} }),
    }, (storage) => {
        const hydrated = loadComparisonState()
        assert.deepEqual(hydrated.selectedGameIds, [STARDEW, SHORT_HIKE, HADES, 504230])
        assert.deepEqual(hydrated.ignored, [MISSING, 'bad', null])
        assert.equal(storage.snapshot()[SOCIAL_STORAGE_KEY], JSON.stringify({ version: 3, state: {} }))
    })

    withStorage({ [COMPARE_STORAGE_KEY]: '{not json' }, () => {
        const hydrated = loadComparisonState()
        assert.deepEqual(hydrated.selectedGameIds, [])
        assert.equal(hydrated.valid, false)
    })

    withStorage({
        [COMPARE_STORAGE_KEY]: JSON.stringify({ version: 99, state: { selectedGameIds: [STARDEW] } }),
    }, (storage) => {
        const before = storage.snapshot()[COMPARE_STORAGE_KEY]
        const hydrated = loadComparisonState()
        assert.deepEqual(hydrated.selectedGameIds, [])
        assert.equal(hydrated.canPersist, false)
        assert.equal(saveComparisonState([STARDEW]), false)
        assert.equal(storage.snapshot()[COMPARE_STORAGE_KEY], before)
    })

    assert.deepEqual(
        normalizePersistedComparison([STARDEW, MISSING], gameCatalog).selectedGameIds,
        [STARDEW]
    )
})

/* ------------------------------------------------------------------ */
/* 13–14. Empty state, responsive and accessible rendering              */
/* ------------------------------------------------------------------ */

test('empty comparison state invites catalog discovery and exposes the count', () => {
    const html = renderPage({ selectedGameIds: [], saved: [] })
    assert.match(html, /games in comparison/)
    assert.match(html, /Your comparison workspace is empty/)
    assert.match(html, /Find games to compare/)
    assert.match(html, /0\/4/)
    assert.doesNotMatch(html, /class="cmp-table"/)
    assert.match(html, /Clear comparison/)
})

test('comparison UI is keyboard-accessible and responsive in static rendering and CSS', () => {
    const html = renderPage({ selectedGameIds: [STARDEW, HADES], saved: [] })
    assert.match(html, /role="region"/)
    assert.match(html, /tabindex="0"/)
    assert.match(html, /aria-label="Side-by-side game comparison/)
    assert.match(html, /<caption class="sr-only">/)
    assert.match(html, /scope="col"/)
    assert.match(html, /scope="row"/)
    assert.match(html, /aria-label="Comparison categories"/)
    assert.match(html, /Differences only/)
    assert.match(html, /Shared characteristics/)
    assert.match(html, /Lowest listed/)
    assert.match(html, /Differs/)
    assert.match(html, /Prices are sample catalog values, not live store prices/)

    const css = readFileSync(path.join(srcRoot, 'features/compare/compare.css'), 'utf8')
    assert.match(css, /overflow-x:\s*auto/)
    assert.match(css, /@media \(max-width: 700px\)/)
    assert.match(css, /@media \(max-width: 480px\)/)
    assert.match(css, /prefers-reduced-motion/)
    assert.match(css, /:focus-visible/)
    assert.match(css, /position:\s*sticky/)

    const navigation = readFileSync(path.join(srcRoot, 'components/navigation/MainNavigation.tsx'), 'utf8')
    assert.match(navigation, /"Compare"/)
    assert.match(navigation, /aria-label="Store pages"/)
    const browse = readFileSync(path.join(srcRoot, 'features/browse/index.tsx'), 'utf8')
    assert.match(browse, /changeView\("Compare"\)/)
    assert.match(browse, /Compare games/)
    const app = readFileSync(path.join(srcRoot, 'PLAYSCAPE-cleaner.tsx'), 'utf8')
    assert.match(app, /compare:\s*"Compare"/)
    assert.match(app, /view === "Compare"/)
})
