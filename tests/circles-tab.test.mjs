import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import GamingCircles from '../src/features/circles/index.tsx'
import { gameCatalog, getGameById } from '../src/data/games.ts'
import {
    createEmptySocialState,
    initialActivity,
    socialPeople,
} from '../src/socialData.ts'

function makeSocial(overrides = {}) {
    const { state = createEmptySocialState(), ...rest } = overrides
    return {
        activity: initialActivity,
        state,
        games: gameCatalog,
        saved: [],
        go() {},
        join() {},
        setDialog() {},
        shortlist() {},
        update() {},
        useFinder() {},
        ...rest,
    }
}

function renderCircles({ circleId = '', social = makeSocial() } = {}) {
    return renderToStaticMarkup(
        React.createElement(GamingCircles, {
            circleId,
            social,
            renderSmallGame: ({ id, reason }) =>
                React.createElement(
                    'div',
                    { className: 'small-game', 'data-game': id },
                    `${getGameById(id)?.title || id}${reason ? ` · ${reason}` : ''}`,
                ),
            renderActivityCard: (item) =>
                React.createElement(
                    'article',
                    { className: 'activity-card' },
                    item.action,
                ),
            renderAvatar: ({ id, size = 38 }) =>
                React.createElement(
                    'span',
                    {
                        className: 'avatar',
                        'data-person': id,
                        'data-size': size,
                    },
                    `${id}-${size}`,
                ),
            renderPersonLink: ({ id }) =>
                React.createElement(
                    'button',
                    { className: 'person-link', 'data-person': id },
                    socialPeople.find((person) => person.id === id)?.name || id,
                ),
        }),
    )
}

test('Gaming Circles directory renders every circle with its own topic and membership state', () => {
    const html = renderCircles()

    assert.match(html, /Find your kind of company/)
    assert.match(html, /Create a Gaming Circle/)
    assert.match(html, /Your circles/)
    assert.match(html, /Discover circles/)
    assert.match(html, /The After Hours Club/)
    assert.match(html, /The Scenic Route/)
    assert.match(html, /One More Chapter/)
    assert.match(html, /The Long Game/)
    assert.match(html, /Co-op · Cozy worlds/)
    assert.match(html, /Strategy · Hardcore/)
    assert.match(html, /Explore circle/)
    assert.match(html, /Leave circle/)
    assert.match(html, /Join circle/)
})

test('joined circles come first and pending invitations are labelled', () => {
    const state = createEmptySocialState()
    state.invites.push({
        id: 'invite-scenic',
        circle: 'scenic',
        person: 'you',
        status: 'pending',
    })
    const html = renderCircles({ social: makeSocial({ state }) })

    const yourCircles = html.indexOf('id="your-circles-heading"')
    const discoverCircles = html.indexOf('id="discover-circles-heading"')
    const afterhours = html.indexOf('The After Hours Club')
    const tactics = html.indexOf('The Long Game')
    const scenic = html.indexOf('The Scenic Route')
    const story = html.indexOf('One More Chapter')

    assert.ok(yourCircles >= 0 && discoverCircles > yourCircles)
    assert.ok(afterhours >= 0 && tactics > afterhours)
    assert.ok(scenic > tactics && story > tactics)
    assert.match(html, /Your circle · 4 members/)
    assert.match(html, /Invitation · 2 members/)
    assert.match(html, /circle-card joined/)
    assert.match(html, /circle-card discover/)
})

test('an individual circle renders its cover, sections, activity, games, and members', () => {
    const html = renderCircles({ circleId: 'tactics' })

    assert.match(html, /Gaming Circles \/ The Long Game/)
    assert.match(html, /Strategy · Hardcore/)
    assert.match(html, /Find a game for everyone/)
    assert.match(html, /Invite friends/)
    assert.match(html, /role="group" aria-label="Gaming Circle sections"/)
    for (const tab of ['Overview', 'Shared wishlist', 'Group Finder', 'Discussions', 'Members']) {
        assert.ok(html.includes(tab), `missing ${tab} tab`)
    }
    assert.match(html, /is plotting a colder kind of city/)
    assert.match(html, /data-game="323190"/)
    assert.match(html, /Playing together/)
    assert.match(html, /The friends in it/)
    assert.match(html, /data-person="casey" data-size="30"/)
    assert.match(html, /Shared recommendations/)
    assert.match(html, /Recommend to the circle/)
})

test('Strategy circle members are shown in the circle itself', () => {
    const html = renderCircles({
        circleId: 'tactics',
        social: makeSocial({ initialCircleTab: 'Members' }),
    })

    assert.match(html, /Casey Harper/)
    assert.match(html, /@caseyplays/)
    assert.match(html, /data-person="casey" data-size="54"/)
    assert.match(html, /Explore profile/)
})

test('Shared wishlist and discussions render from the shared social state', () => {
    const wishlist = renderCircles({
        circleId: 'tactics',
        social: makeSocial({ initialCircleTab: 'Shared wishlist' }),
    })
    assert.match(wishlist, /Our next possibilities/)
    assert.match(wishlist, /Frostpunk/)
    assert.match(wishlist, /Bannerlord/)
    assert.match(wishlist, /Slay the Spire/)
    assert.match(wishlist, /Remove from circle/)

    const discussions = renderCircles({
        circleId: 'afterhours',
        social: makeSocial({ initialCircleTab: 'Discussions' }),
    })
    assert.match(discussions, /What should we play next/)
    assert.match(discussions, /A farm night or a pirate crew this weekend/)
    assert.match(discussions, /Join the conversation/)
    assert.match(discussions, /Post to circle/)
    assert.match(discussions, /data-person="alex"/)
})

test('Group Finder respects the current circle size instead of implying absent players', () => {
    const html = renderCircles({
        circleId: 'tactics',
        social: makeSocial({ initialCircleTab: 'Group Finder' }),
    })

    assert.match(html, /One game\. Everyone included\./)
    assert.match(html, /0 group matches/)
    assert.doesNotMatch(html, /data-game="413150"/)
    assert.match(html, /No exact match in this sample collection/)
})

test('unknown circle ids fall back to the directory', () => {
    const html = renderCircles({ circleId: 'missing-circle' })
    assert.match(html, /Find your kind of company/)
    assert.doesNotMatch(html, /Gaming Circles \/ /)
})

test('the app gates Gaming Circles to its own route', () => {
    const shell = readFileSync(
        new URL('../src/PLAYSCAPE-cleaner.tsx', import.meta.url),
        'utf8',
    )
    const module = readFileSync(
        new URL('../src/features/circles/index.tsx', import.meta.url),
        'utf8',
    )

    assert.match(shell, /view === "Gaming Circles" && \(\s*<GamingCircles/)
    assert.doesNotMatch(module, /return null/)
})
