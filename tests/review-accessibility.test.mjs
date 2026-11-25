import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import FriendReviews from '../src/features/reviews/FriendReviews.tsx'
import ReviewForm from '../src/features/reviews/ReviewForm.tsx'
import ReviewBreakdown from '../src/features/reviews/ReviewBreakdown.tsx'
import {
    REVIEW_CATEGORIES,
    buildReviewBreakdown,
    prototypeReviews,
} from '../src/features/reviews/index.ts'

const srcRoot = path.resolve(fileURLToPath(new URL('../src', import.meta.url)))
const STARDEW = 413150

test('review form uses native labelled controls and explicit status regions', () => {
    const html = renderToStaticMarkup(
        React.createElement(ReviewForm, {
            gameId: STARDEW,
            canReview: true,
            saved: true,
            onSubmit: () => ({ ok: false, errors: [] }),
        }),
    )

    assert.match(html, /<form class="rvw-panel"[^>]*aria-labelledby="rvw-heading-413150"/)
    assert.match(html, /<fieldset class="rvw-categories">/)
    assert.match(html, /<legend>Category ratings \(optional, 1–10\)<\/legend>/)
    assert.match(html, /aria-label="Overall rating"/)
    assert.match(html, /min="1" max="10" step="1"/)
    assert.match(html, /aria-label="Your review text"/)
    assert.match(html, /maxLength="600"/)
    for (const category of REVIEW_CATEGORIES) {
        assert.match(html, new RegExp(`aria-label="${category} rating"`))
    }
    assert.match(html, /type="submit"/)
})

test('friend reviews keep keyboard-accessible profile buttons and named rating lists', () => {
    const html = renderToStaticMarkup(
        React.createElement(FriendReviews, {
            gameId: STARDEW,
            reviews: prototypeReviews,
            onOpenProfile() {},
        }),
    )

    assert.match(html, /<button type="button" class="person-link"/)
    assert.match(html, /role="list" aria-label="Category ratings"/)
    assert.match(html, /aria-label="Overall 9 out of 10 from Alex Kim"/)
    assert.match(html, /aria-labelledby="rvw-friends-heading-413150"/)
})

test('community ratings expose complete labels without relying on color', () => {
    const breakdown = buildReviewBreakdown(prototypeReviews, STARDEW)
    const html = renderToStaticMarkup(
        React.createElement(ReviewBreakdown, { breakdown }),
    )

    assert.match(html, /aria-label="Overall community rating 8\.5 out of 10"/)
    assert.match(html, /Story: 8\.0 out of 10 from 2 ratings/)
    for (const category of REVIEW_CATEGORIES) {
        assert.match(html, new RegExp(`class="rvw-category-name">${category}<`))
    }

    const sparseHtml = renderToStaticMarkup(
        React.createElement(ReviewBreakdown, {
            breakdown: buildReviewBreakdown(
                [{ ...prototypeReviews[0], categories: { Story: 9 } }],
                STARDEW,
            ),
        }),
    )
    assert.match(sparseHtml, /not enough ratings/)
    assert.match(sparseHtml, /no ratings/)
})

test('review controls have visible focus styles and responsive layouts', () => {
    const css = readFileSync(path.join(srcRoot, 'features/reviews/reviews.css'), 'utf8')

    assert.match(css, /\.rvw-panel button:focus-visible/)
    assert.match(css, /\.rvw-discover-filter button:focus-visible/)
    assert.match(css, /\.rvw-compare-note button:focus-visible/)
    assert.match(css, /\.profile-review button:focus-visible/)
    assert.match(css, /\.rvw-field (input|textarea):focus-visible/)
    assert.match(css, /@media \(max-width: 700px\)/)
    assert.match(css, /@media \(max-width: 480px\)/)
    assert.match(css, /\.rvw-category-row\s*\{[^}]*grid-template-columns: 1fr auto/s)
})

test('review form focus stays stable within one game and resets across games', () => {
    const details = readFileSync(path.join(srcRoot, 'features/game-details/index.tsx'), 'utf8')
    assert.match(details, /key={`review-form-\$\{detailGame\.id\}`}/)
    assert.doesNotMatch(details, /key=\{`\$\{detailGame\.id\}-\$\{existingReview/)
})

test('review interactions use buttons and groups rather than clickable containers', () => {
    const files = [
        'features/reviews/FriendReviews.tsx',
        'features/reviews/ReviewBreakdown.tsx',
        'features/reviews/ReviewInsights.tsx',
        'features/discover/index.tsx',
        'features/compare/ComparePage.tsx',
        'features/profiles/index.tsx',
    ]
    for (const file of files) {
        const source = readFileSync(path.join(srcRoot, file), 'utf8')
        assert.doesNotMatch(source, /<(div|span|li)[^>]+onClick=/, file)
    }

    const discover = readFileSync(path.join(srcRoot, 'features/discover/index.tsx'), 'utf8')
    assert.match(discover, /aria-label="Review filter"/)
    assert.match(discover, /aria-pressed=\{reviewFilter === option\.id\}/)
    assert.match(discover, /type="button"\s+key=\{option\.id\}/)
})
