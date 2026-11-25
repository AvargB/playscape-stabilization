import test from 'node:test'
import assert from 'node:assert/strict'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import TheWeb, {
    buildWebGraphModel,
    jaccardSimilarity,
} from '../src/features/the-web/index.tsx'
import { gameCatalog } from '../src/data/games.ts'
import {
    buildSocialGraph,
    createEmptySocialState,
    directFriendIds,
    initialFriendships,
    socialPeople,
} from '../src/socialData.ts'

function renderWeb(state, focus = 'casey') {
    return renderToStaticMarkup(
        React.createElement(TheWeb, {
            games: gameCatalog,
            saved: [],
            toggle() {},
            openGame() {},
            community: {
                activeView: 'The Web',
                webFocus: focus,
                go() {},
                setDialog() {},
                graph: buildSocialGraph({ circles: state.circles }),
                state,
            },
        }),
    )
}

function decodeHtml(value) {
    return value
        .replaceAll('&amp;', '&')
        .replaceAll('&#x27;', "'")
        .replaceAll('&quot;', '"')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
}

const caseyGames = [
    { id: 646570, title: 'Slay the Spire', kind: 'wishlist' },
    { id: 219760, title: 'Pillars of Eternity II: Deadfire', kind: 'wishlist' },
    { id: 1086940, title: "Baldur's Gate 3", kind: 'wishlist' },
    { id: 323190, title: 'Frostpunk', kind: 'owned' },
    { id: 261550, title: 'Mount & Blade II: Bannerlord', kind: 'owned' },
]

test('The Web renders Casey as a direct friend from the shared social graph', () => {
    const graph = buildSocialGraph({ circles: createEmptySocialState().circles })
    assert.ok(graph.nodes.some((node) => node.id === 'casey' && node.type === 'Friend'))
    assert.ok(graph.relationships.some(([from, to, label]) =>
        from === 'you' && to === 'casey' && label === 'Friends'))

    const html = decodeHtml(renderWeb(createEmptySocialState()))
    assert.match(html, /Casey Harper, Friend, select to explore/)
    assert.match(html, /aria-pressed="true"/)
})

test('review-authored friends are canonical Friend nodes, not a separate Web fixture', () => {
    const graph = buildSocialGraph({ circles: createEmptySocialState().circles })
    const html = decodeHtml(renderWeb(createEmptySocialState()))

    for (const id of directFriendIds) {
        const person = socialPeople.find((entry) => entry.id === id)
        assert.ok(graph.nodes.some((node) => node.id === id && node.type === 'Friend'))
        assert.ok(graph.relationships.some(([from, to, label]) =>
            from === 'you' && to === id && label === 'Friends'))
        assert.ok(html.includes(`${person.name}, Friend, select to explore`))
    }
})

test('Casey’s wishlisted and owned games appear as nodes, edges, and inspector links', () => {
    const model = buildWebGraphModel(buildSocialGraph())
    const html = decodeHtml(renderWeb(createEmptySocialState()))

    for (const game of caseyGames) {
        assert.ok(model.nodes.some((node) => node.id === String(game.id) && node.type === 'Game'))
        assert.ok(model.edges.some((edge) =>
            edge.person === 'casey' && edge.game === String(game.id) && edge.kind === game.kind))
        assert.ok(html.includes(`${game.title}, Game, select to explore`), `${game.title} must be a Web node`)
        assert.match(html, new RegExp(`data-webgame-link="casey-${game.kind}-${game.id}"`))
        assert.ok(html.includes(game.title), `${game.title} must appear in the compact inspector`)
    }

    assert.match(html, /<strong>Collections<\/strong>/)
    assert.match(html, />Wishlisted</)
    assert.match(html, />Owned</)
    assert.match(html, /<strong>Closest overlap<\/strong>/)
})

test('only the active node shows a permanent label in the spacious graph', () => {
    const html = decodeHtml(renderWeb(createEmptySocialState()))
    const visibleLabels = Array.from(
        html.matchAll(/<text class="webgraph-label"[^>]*opacity="1">([^<]+)<\/text>/g),
        (match) => match[1],
    )
    assert.deepEqual(visibleLabels, ['Casey Harper'])

    assert.match(html, /class="webgraph-canvas"/)
    assert.match(html, /aria-label="Find a person or game in the network"/)
    assert.match(html, /aria-label="Zoom out"/)
    assert.match(html, /aria-label="Zoom in"/)
    assert.match(html, /Reset view/)
})

test('person similarity uses Jaccard overlap and layout is deterministic', () => {
    assert.equal(jaccardSimilarity(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3)
    assert.equal(jaccardSimilarity(new Set(), new Set(['a'])), 0)

    const graph = buildSocialGraph()
    const first = buildWebGraphModel(graph)
    const second = buildWebGraphModel(graph)
    assert.deepEqual(
        first.nodes.map((node) => [node.id, Number(node.x.toFixed(4)), Number(node.y.toFixed(4))]),
        second.nodes.map((node) => [node.id, Number(node.x.toFixed(4)), Number(node.y.toFixed(4))]),
    )

    const people = first.people
    for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
            const distance = Math.hypot(people[i].x - people[j].x, people[i].y - people[j].y)
            assert.ok(distance > 180, `${people[i].name} and ${people[j].name} are too close`)
        }
    }
})

test('every direct friend is present in the Web and nodes are spread out', () => {
    const html = decodeHtml(renderWeb(createEmptySocialState()))

    for (const id of directFriendIds) {
        const friend = socialPeople.find((person) => person.id === id)
        assert.ok(html.includes(`${friend.name}, Friend, select to explore`))
    }

    const positions = Array.from(
        html.matchAll(/data-webnode="true"[^>]*transform="translate\(([-\d.]+),([-\d.]+)\)"/g),
        (match) => ({ x: Number(match[1]), y: Number(match[2]) }),
    )
    assert.equal(positions.length, 39, 'the Web should render every connected friend and game')

    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const distance = Math.hypot(
                positions[i].x - positions[j].x,
                positions[i].y - positions[j].y,
            )
            assert.ok(distance > 28, `nodes ${i} and ${j} are too close (${distance.toFixed(1)})`)
        }
    }
})
