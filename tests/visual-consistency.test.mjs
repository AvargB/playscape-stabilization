import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { Icon } from '../src/components/Icon.tsx'
import GamePicker from '../src/features/compare/GamePicker.tsx'
import ComparisonTable from '../src/features/compare/ComparisonTable.tsx'
import { buildComparisonRows, filterComparisonRows, getPlayCapabilities } from '../src/features/compare/utils.ts'
import { gameCatalog } from '../src/data/games.ts'

const srcRoot = new URL('../src/', import.meta.url)
const readSrc = (path) => readFileSync(new URL(path, srcRoot), 'utf8')

test('heart icons have distinct outlined and filled states', () => {
    const outline = renderToStaticMarkup(React.createElement(Icon, { name: 'heart', size: 14 }))
    const filled = renderToStaticMarkup(React.createElement(Icon, { name: 'heart-filled', size: 14 }))

    assert.match(outline, /<svg[^>]*fill="none"/)
    assert.doesNotMatch(outline, /fill="currentColor"/)
    assert.match(filled, /<svg[^>]*fill="none"/)
    assert.match(filled, /fill="currentColor"/)
    assert.match(filled, /M20 5c-3-3-7-1-8 1/)
})

test('active favorites color only the filled heart, not the whole control', () => {
    const css = readSrc('PLAYSCAPE-cleaner.tsx')

    assert.match(css, /\.ps button\[aria-pressed="true"\] svg path\[fill="currentColor"\]/)
    assert.match(css, /color:var\(--favorite\)/)
    assert.doesNotMatch(css, /\.ps \.primary\[aria-pressed="true"\]/)
    assert.doesNotMatch(css, /\.ps \.save\.saved\s*\{\s*color:var\(--favorite\)/)
})

test('favorite heart red is darker than the Autumn red', () => {
    const css = readSrc('PLAYSCAPE-cleaner.tsx')
    const favorite = css.match(/--favorite:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase()
    const autumnAccents = [...css.matchAll(/\.ps\.autumn\s*\{\s*--accent:\s*(#[0-9a-f]{6})/gi)]
        .map((match) => match[1].toLowerCase())
    const autumnRed = '#d56a67'
    const luminance = (hex) => {
        const channels = [1, 3, 5].map((offset) => {
            const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }

    assert.ok(favorite)
    assert.ok(autumnAccents.includes(autumnRed))
    assert.ok(
        luminance(favorite) < luminance(autumnRed),
        `favorite ${favorite} must be darker than Autumn red ${autumnRed}`,
    )
})

test('compare badge stays clear of the thumbnail explore label', () => {
    const css = readSrc('PLAYSCAPE-cleaner.tsx')
    const rule = css.match(/\.ps \.compare-card\{([^}]*)\}/)?.[1] || ''

    assert.match(rule, /position:absolute/)
    assert.match(rule, /top:9px/)
    assert.match(rule, /bottom:auto/)
    assert.doesNotMatch(rule, /bottom:9px/)
})

test('every saved-heart call site uses the filled heart instead of a checkmark', () => {
    const files = [
        'PLAYSCAPE-cleaner.tsx',
        'components/ui/GameCard.tsx',
        'features/discover/index.tsx',
        'features/compare/ComparisonTable.tsx',
        'features/compare/ComparisonSummary.tsx',
        'features/game-details/index.tsx',
        'features/the-web/index.tsx',
    ]
    for (const file of files) {
        const source = readSrc(file)
        assert.doesNotMatch(source, /"check"\s*:\s*"heart"/, `${file} keeps a checkmark heart`)
        assert.match(source, /heart-filled/, `${file} renders the filled heart`)
    }
})

test('store footer actions share one aligned flex row instead of inline offsets', () => {
    const browse = readSrc('features/browse/index.tsx')
    const css = readSrc('PLAYSCAPE-cleaner.tsx')

    assert.match(browse, /className="finder-foot-actions"/)
    assert.doesNotMatch(browse, /style=\{\{[\s\S]*alignItems:\s*"center"/)

    const sharedControls = css.match(/\.ps \.text-button,\s*\.ps \.reset \{([^}]*)\}/)?.[1] || ''
    assert.match(sharedControls, /display:inline-flex/)
    assert.match(sharedControls, /align-items:center/)
    assert.match(sharedControls, /min-height:32px/)
    assert.match(sharedControls, /padding:0/)
    assert.match(sharedControls, /line-height:1\.55/)

    const actions = css.match(/\.ps \.browse-controls \.finder-foot-actions \{([^}]*)\}/)?.[1] || ''
    assert.match(actions, /display:flex/)
    assert.match(actions, /align-items:center/)
    assert.match(actions, /flex-wrap:wrap/)
    assert.match(actions, /gap:12px/)
})

test('comparison info is a document-layer popover with edge placement and touch fallback', () => {
    const popover = readSrc('features/compare/GameInfoPopover.tsx')
    const picker = readSrc('features/compare/GamePicker.tsx')
    const table = readSrc('features/compare/ComparisonTable.tsx')
    const css = readSrc('features/compare/compare.css')

    assert.match(popover, /createPortal/)
    assert.match(popover, /const portalTarget = document\.body/)
    assert.match(popover, /const candidates: Array<\{ placement: Placement; left: number; top: number \}>/)
    assert.match(popover, /rect\.right \+ gap/)
    assert.match(popover, /rect\.left - width - gap/)
    assert.match(popover, /rect\.bottom \+ gap/)
    assert.match(popover, /const controlOverlap = obstacles\.reduce/)
    assert.match(popover, /viewportWidth - width - margin/)
    assert.match(popover, /viewportHeight - height - margin/)
    assert.match(popover, /event\.key === "Escape"/)
    assert.match(popover, /role="tooltip"/)

    for (const source of [picker, table]) {
        assert.match(source, /event\.pointerType !== "touch"/)
        assert.match(source, /onFocus=/)
        assert.match(source, /onPointerLeave=/)
        assert.match(source, /onGameInfoToggle/)
    }
    assert.match(css, /\.game-info-popover \{[\s\S]*position: fixed[\s\S]*z-index: 80/)
})

test('differing rows keep their badge while partial overlap is shown once', () => {
    const source = readSrc('features/compare/ComparisonTable.tsx')
    assert.doesNotMatch(source, /row\.status === "different" && row\.sharedValues\.length === 0/)
    assert.match(source, /row\.status === "different" && \(\s*<span className="cmp-tag cmp-tag-different">\s*Differs/)

    const [first, second] = gameCatalog
    const html = renderToStaticMarkup(
        React.createElement(ComparisonTable, {
            games: [first, second],
            rows: [{
                id: 'genre',
                label: 'Genre',
                values: ['Cozy', 'Cozy · Strategy'],
                status: 'different',
                sharedValues: ['Cozy'],
                description: 'Genres differ.',
            }],
            filter: 'all',
            onFilterChange: () => {},
            priceComparison: { lowestPrice: 0, lowestPriceIds: [], differences: [], hasDifference: false },
            saved: [],
            onRemove: () => {},
            onToggleSaved: () => {},
            onOpenGame: () => {},
            onGameHover: () => {},
            onGameLeave: () => {},
            onGameInfoToggle: () => {},
        }),
    )
    assert.match(html, /cmp-tag-different">Differs</)
    assert.match(html, /Shared: Cozy/)
})

test('same, differ, and unavailable filters use the comparison status only', () => {
    const rows = [
        { id: 'same', label: 'Same', values: ['A', 'A'], status: 'shared', sharedValues: ['A'], description: '' },
        { id: 'diff', label: 'Diff', values: ['A', 'B'], status: 'different', sharedValues: ['A'], description: '' },
        { id: 'missing', label: 'Missing', values: ['A', 'Not listed'], status: 'unavailable', sharedValues: [], description: '' },
    ]
    assert.deepEqual(filterComparisonRows(rows, 'shared').map((row) => row.id), ['same'])
    assert.deepEqual(filterComparisonRows(rows, 'differences').map((row) => row.id), ['diff'])
    assert.deepEqual(filterComparisonRows(rows, 'all').map((row) => row.id), ['same', 'diff', 'missing'])
    assert.equal(rows.find((row) => row.id === 'missing').status, 'unavailable')
})

test('unlisted capability values are unavailable, not same or different', () => {
    const first = gameCatalog.find((game) =>
        Object.values(getPlayCapabilities(game)).some(Boolean)
    )
    assert.ok(first)
    const games = [first, { ...first, players: '', playerModes: [] }]
    const rows = buildComparisonRows(games)
    const capabilities = getPlayCapabilities(first)
    const capabilityIds = [
        capabilities.local && 'localPlay',
        capabilities.online && 'onlinePlay',
        capabilities.coop && 'coop',
        capabilities.multiplayer && 'multiplayer',
    ].filter(Boolean)

    assert.ok(capabilityIds.length > 0)
    for (const id of capabilityIds) {
        const row = rows.find((entry) => entry.id === id)
        assert.ok(row, `${id} row should be present`)
        assert.equal(row.status, 'unavailable')
        assert.ok(row.values.includes('Not listed'))
        assert.ok(!filterComparisonRows(rows, 'shared').some((entry) => entry.id === id))
        assert.ok(!filterComparisonRows(rows, 'differences').some((entry) => entry.id === id))
    }
})

test('differ is emphasized and same is neutral in the comparison stylesheet', () => {
    const css = readSrc('features/compare/compare.css')
    const different = css.match(/\.ps \.cmp-tag-different \{([^}]*)\}/)?.[1] || ''
    const shared = css.match(/\.ps \.cmp-tag-shared \{([^}]*)\}/)?.[1] || ''

    assert.match(different, /var\(--cmp-difference\)/)
    assert.match(shared, /var\(--muted\)/)
    assert.doesNotMatch(shared, /var\(--accent\)/)
    assert.match(css, /\.ps \.cmp-page \{[\s\S]*--cmp-difference: #d56a67/)
    assert.match(css, /tr\[data-status="different"\] \.cmp-label-col[\s\S]*var\(--cmp-difference\)/)
})

test('catalog picker still renders real game metadata and accessible controls', () => {
    const html = renderToStaticMarkup(
        React.createElement(GamePicker, {
            games: gameCatalog.slice(0, 2),
            selectedGameIds: [],
            onAdd: () => {},
            onRemove: () => {},
            onGameHover: () => {},
            onGameLeave: () => {},
            onGameInfoToggle: () => {},
        }),
    )
    assert.match(html, /Search games to compare by title/)
    assert.match(html, /Add .* to comparison/)
    assert.match(html, /About .*/)
})
