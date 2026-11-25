import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AppLayout } from '../src/components/layout/AppLayout.tsx'

const PRIMARY_VIEWS = [
    'Discover',
    'Browse',
    'Wishlist',
    'The Web',
    'Community',
    'Gaming Circles',
    'Profile',
    'Compare',
]

const srcRoot = new URL('../src/', import.meta.url)

function renderShell(currentView, atmosphere = 'Autumn') {
    return renderToStaticMarkup(
        React.createElement(
            AppLayout,
            {
                currentView,
                atmosphere,
                wishlistCount: 0,
                menuOpen: false,
                query: '',
                onNavigate: () => {},
                onToggleMenu: () => {},
                onQueryChange: () => {},
                onSearchSubmit: () => {},
            },
            React.createElement('main', { 'data-view': currentView }, currentView),
        ),
    )
}

test('one global footer is shared by every primary view', () => {
    for (const view of PRIMARY_VIEWS) {
        const html = renderShell(view)
        assert.equal((html.match(/<footer/g) || []).length, 1, `${view} has one footer`)
        assert.match(html, /<footer class="global-footer"/)
        assert.match(html, /class="app-content"/)
        assert.match(
            html,
            /PLAYSCAPE is a community-driven prototype\. Features and content\s+are subject to change\./,
        )
        assert.match(
            html,
            /<button type="button" class="global-footer-logo" aria-label="Return to PLAYSCAPE home"/,
        )
        assert.match(html, /class="global-footer-title">PLAYSCAPE<\/span>/)
    }
})

test('footer logo is a native home control that uses the shared navigation callback', () => {
    const source = readFileSync(new URL('components/layout/GlobalFooter.tsx', srcRoot), 'utf8')
    assert.match(source, /import type \{ NavigationDestination \}/)
    assert.match(source, /onNavigate: \(destination: NavigationDestination\) => void/)
    assert.match(source, /<button\s+type="button"/)
    assert.match(source, /onClick=\{\(\) => onNavigate\("Discover"\)\}/)
    assert.match(source, /aria-label="Return to PLAYSCAPE home"/)
})

test('footer logo follows the shared atmosphere value', () => {
    const winter = renderShell('Discover', 'Winter')
    assert.match(winter, /<footer class="global-footer"[^>]*data-atmosphere="winter"/)
    assert.match(
        winter,
        /class="global-footer-logo" aria-label="Return to PLAYSCAPE home" data-atmosphere="winter"/,
    )

    const summer = renderShell('The Web', 'Summer')
    assert.match(summer, /<footer class="global-footer"[^>]*data-atmosphere="summer"/)
    assert.match(
        summer,
        /class="global-footer-logo" aria-label="Return to PLAYSCAPE home" data-atmosphere="summer"/,
    )
})

test('footer stays in document flow and keeps the logo mathematically centered', () => {
    const css = readFileSync(new URL('PLAYSCAPE-cleaner.tsx', srcRoot), 'utf8')
    const footerRule = css.match(/\.ps \.global-footer\{([^}]*)\}/)?.[1] || ''
    assert.match(
        footerRule,
        /grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/,
    )
    const logoRule = css.match(/\.ps \.global-footer-logo\{([^}]*)\}/)?.[1] || ''
    assert.match(logoRule, /justify-self:center/)
    assert.doesNotMatch(footerRule, /position:\s*(fixed|sticky)/)
    assert.match(css, /\.ps \.wrap\{[^}]*min-height:100vh;display:flex;flex-direction:column/)
    assert.match(css, /\.ps \.app-content\{flex:1 0 auto;min-width:0\}/)
    assert.match(css, /\.ps \.global-footer-logo:hover \.brand-mark/)
    assert.match(css, /\.ps \.global-footer-logo:focus-visible \.brand-mark/)
    assert.doesNotMatch(css, /\.ps\.web-view footer\s*\{[^}]*display:none/)
})

test('navigation avatar uses the current profile initials on every view', () => {
    for (const view of PRIMARY_VIEWS) {
        const html = renderShell(view)
        const avatar = html.match(/<button[^>]*class="avatar"[^>]*>(.*?)<\/button>/)?.[1]
        assert.equal(avatar, 'SC', `${view} avatar`)
    }
})
