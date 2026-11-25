import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import TheWeb, {
    buildWebGraphModel,
    jaccardSimilarity,
} from '../src/features/the-web/index.tsx'
import { gameCatalog } from '../src/data/games.ts'
import {
    createPrototypeTransaction,
    getOwnedGameIdsByPerson,
    respondToGift,
} from '../src/features/checkout/index.ts'
import {
    buildSocialGraph,
    createEmptySocialState,
    directFriendIds,
    initialFriendships,
    socialPeople,
} from '../src/socialData.ts'

function renderWeb(state, focus = 'casey', ownedIdsByPerson = undefined) {
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
                ownedIdsByPerson,
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
    { id: 219760, title: 'Beyond Divinity', kind: 'wishlist' },
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

test('The Web does not show a transaction activity blurb', () => {
    const html = decodeHtml(renderWeb(createEmptySocialState()))
    const source = readFileSync(new URL('../src/features/the-web/index.tsx', import.meta.url), 'utf8')

    assert.doesNotMatch(html, /Prototype purchase activity/)
    assert.doesNotMatch(html, /data-web-activity/)
    assert.doesNotMatch(html, /Acquired games/)
    assert.doesNotMatch(source, /prototypeActivity/)
    assert.doesNotMatch(source, /webgraph-activity/)
    assert.match(html, /Drag to pan/)
})

test('accepted gifts create owned Web connections and only owned/wishlist lines are highlighted', () => {
    const gift = createPrototypeTransaction(
        {
            id: 'web-gift',
            gameId: 383870,
            purchaseType: 'gift',
            recipientId: 'jamie',
            giftMessage: '',
            paymentMethod: 'prototype',
        },
        { id: 'txn-web-gift', now: '2026-11-24T12:00:00.000Z' },
    )
    assert.equal(gift.ok, true)
    const accepted = respondToGift(gift.transaction, 'accepted')
    assert.equal(accepted.ok, true)
    const ownedIdsByPerson = getOwnedGameIdsByPerson({
        transactions: [accepted.transaction],
        ownedGameIds: [],
    })

    const model = buildWebGraphModel(buildSocialGraph(), ownedIdsByPerson, gameCatalog)
    assert.ok(model.games.some((node) => node.id === '383870'))
    assert.ok(
        model.edges.some(
            (edge) => edge.person === 'jamie' && edge.game === '383870' && edge.kind === 'owned',
        ),
    )
    assert.equal(
        model.edges.some(
            (edge) =>
                edge.person === 'jamie' &&
                edge.game === '383870' &&
                (edge.kind === 'wishlist' || edge.kind === 'shared'),
        ),
        false,
    )

    const sparseGraph = {
        nodes: buildSocialGraph().nodes.filter((node) => node.type !== 'Game'),
        relationships: [],
    }
    const sparseModel = buildWebGraphModel(sparseGraph, { jamie: [383870] }, gameCatalog)
    assert.ok(sparseModel.games.some((node) => node.id === '383870'))
    assert.ok(sparseModel.edges.some((edge) => edge.person === 'jamie' && edge.kind === 'owned'))

    const html = decodeHtml(renderWeb(createEmptySocialState(), 'jamie', ownedIdsByPerson))
    const lines = Array.from(
        html.matchAll(/<line[^>]*data-web-edge-kind="([^"]+)"[^>]*stroke="([^"]+)"/g),
        (match) => ({ kind: match[1], stroke: match[2] }),
    )
    assert.ok(lines.length > 0)
    for (const line of lines) {
        const expected = line.kind === 'owned'
            ? '#8EDCC0'
            : ['wishlist', 'shared'].includes(line.kind)
                ? '#A99BCB'
                : '#566174'
        assert.equal(line.stroke, expected)
    }
    assert.ok(lines.some((line) => line.kind === 'owned' && line.stroke === '#8EDCC0'))
    assert.ok(lines.some((line) => line.stroke === '#A99BCB'))

    const dotFills = Array.from(
        html.matchAll(/<circle class="webgraph-dot"[^>]*fill="([^"]+)"/g),
        (match) => match[1],
    )
    assert.ok(dotFills.length > 0)
    assert.deepEqual([...new Set(dotFills)], ['#C9D3E2'])
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
