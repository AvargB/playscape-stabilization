import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { gameCatalog, getGameById } from "../src/data/games.ts"
import GameDetails from "../src/features/game-details/index.tsx"
import Discover from "../src/features/discover/index.tsx"
import GameMediaGallery from "../src/features/media/GameMediaGallery.tsx"
import GameMediaPreview from "../src/features/media/GameMediaPreview.tsx"
import {
    filterMedia,
    getFeaturedPreview,
    getGameMedia,
    isVideoMedia,
} from "../src/features/media/model.ts"

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

const baseGame = getGameById(413150)
const noMediaGame = {
    ...baseGame,
    media: [],
    trailerUrl: undefined,
    screenshots: undefined,
}
const fixtureGame = {
    ...baseGame,
    media: [
        {
            id: "test-gameplay",
            type: "gameplay",
            url: "https://media.example.test/stardew-gameplay.webm",
            thumbnail: "https://media.example.test/stardew-poster.jpg",
            title: "Farming and exploring",
            description: "A synthetic preview fixture, not catalog footage.",
            source: "Test fixture",
            duration: "1:12",
            featured: true,
        },
        {
            id: "test-screenshot",
            type: "screenshot",
            url: "https://media.example.test/stardew-screenshot.jpg",
            title: "Village scene",
        },
    ],
}

test("media contracts are declared once in the central catalog", () => {
    const catalogSource = source("../src/data/games.ts")
    assert.match(catalogSource, /export type GameMediaType/)
    assert.match(catalogSource, /export type GameMedia = \{/)
    assert.match(catalogSource, /media\?: GameMedia\[\]/)
    assert.match(catalogSource, /trailerUrl\?: string/)
    assert.match(catalogSource, /screenshots\?: string\[\]/)
})

test("catalog uses only verified Steam media sources", () => {
    const withMedia = gameCatalog.filter((game) => game.media?.length)
    assert.ok(withMedia.length > 0)
    const urls = withMedia.flatMap((game) => game.media.map((item) => item.url))
    assert.ok(urls.length > 0)
    assert.equal(
        urls.every(
            (url) =>
                url.startsWith("https://cdn.akamai.steamstatic.com/") ||
                url.startsWith("https://shared.akamai.steamstatic.com/"),
        ),
        true,
    )
    assert.equal(JSON.stringify(gameCatalog).includes("example.test"), false)
    assert.equal(getGameById(381210)?.media?.length ?? 0, 0)

    const stardewTypes = new Set(getGameById(413150)?.media?.map((item) => item.type))
    assert.equal(stardewTypes.has("screenshot"), true)
    assert.equal(stardewTypes.has("trailer"), true)

    const catalogTypes = new Set(
        withMedia.flatMap((game) => game.media.map((item) => item.type)),
    )
    assert.deepEqual([...catalogTypes].sort(), ["screenshot", "trailer"])
    assert.equal(
        gameCatalog.some((game) => game.media?.some((item) => item.type === "gameplay")),
        false,
    )
    assert.equal(
        gameCatalog.some((game) => game.media?.some((item) => item.featured)),
        false,
    )
})

test("games without footage keep one cover-art fallback", () => {
    const media = getGameMedia(noMediaGame)
    assert.equal(media.length, 1)
    assert.equal(media[0].type, "cover")
    assert.equal(getFeaturedPreview(noMediaGame), null)
})

test("legacy trailer and screenshot fields are folded into normalized media", () => {
    const game = {
        ...noMediaGame,
        trailerUrl: "https://media.example.test/trailer.mp4",
        screenshots: ["https://media.example.test/one.jpg"],
    }
    const media = getGameMedia(game)
    assert.deepEqual(
        media.map((item) => item.type),
        ["trailer", "screenshot", "cover"],
    )
    assert.equal(getFeaturedPreview(game)?.id, `${game.id}-trailer-legacy`)
})

test("gameplay stays preferred and trailers are used when it is absent", () => {
    const gameplay = getFeaturedPreview(fixtureGame)
    assert.equal(gameplay?.id, "test-gameplay")
    const trailerOnly = {
        ...noMediaGame,
        media: [
            {
                id: "featured-trailer",
                type: "trailer",
                url: "https://media.example.test/trailer.mp4",
                featured: true,
            },
        ],
    }
    assert.equal(getFeaturedPreview(trailerOnly)?.id, "featured-trailer")
    assert.equal(getFeaturedPreview(baseGame)?.type, "trailer")
})

test("a featured screenshot does not displace real gameplay footage", () => {
    const game = {
        ...noMediaGame,
        media: [
            {
                id: "featured-shot",
                type: "screenshot",
                url: "https://media.example.test/shot.jpg",
                featured: true,
            },
            {
                id: "gameplay",
                type: "gameplay",
                url: "https://media.example.test/gameplay.webm",
            },
        ],
    }
    assert.equal(getFeaturedPreview(game)?.id, "gameplay")
})

test("media categories remain distinct", () => {
    const media = getGameMedia(fixtureGame)
    assert.equal(isVideoMedia(media[0]), true)
    assert.deepEqual(
        filterMedia(media, "gameplay").map((item) => item.id),
        ["test-gameplay"],
    )
    assert.deepEqual(
        filterMedia(media, "screenshot").map((item) => item.id),
        ["test-screenshot"],
    )
})

test("game cards render a static cover with no eager video", () => {
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaPreview, { game: fixtureGame }),
    )
    assert.match(markup, /game-media-preview-toggle/)
    assert.match(markup, /Play gameplay preview for Stardew Valley/)
    assert.doesNotMatch(markup, /<video/)
})

test("a game without footage renders no preview overlay", () => {
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaPreview, { game: noMediaGame }),
    )
    assert.equal(markup, "")
})

test("catalog trailers are labeled as trailers on card previews", () => {
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaPreview, { game: baseGame }),
    )
    assert.match(markup, /game-media-preview-toggle/)
    assert.match(markup, /Play trailer preview for Stardew Valley/)
    assert.doesNotMatch(markup, /Play gameplay preview/)
    assert.doesNotMatch(markup, /<video/)
})

test("store and discovery cards share the hover preview component", () => {
    const discoverSource = source("../src/features/discover/index.tsx")
    const appSource = source("../src/PLAYSCAPE-cleaner.tsx")
    const browseSource = source("../src/features/browse/index.tsx")
    assert.match(discoverSource, /<GameMediaPreview game=\{g\} \/>/)
    assert.match(appSource, /<GameMediaPreview game=\{g\} \/>/)
    assert.match(appSource, /renderCard=\{card\}/)
    assert.match(browseSource, /browseResults\.map\(renderCard\)/)
})

test("card preview waits before activating and stops on pointer exit", () => {
    const previewSource = source("../src/features/media/GameMediaPreview.tsx")
    assert.match(previewSource, /window\.setTimeout\(activate, 500\)/)
    assert.match(previewSource, /onPointerLeave=\{stop\}/)
    assert.match(previewSource, /pointerType === "touch"/)
    assert.match(previewSource, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/)
    assert.match(previewSource, /closest<HTMLElement>\("\.game-art"\)/)
    assert.match(previewSource, /art\.addEventListener\("pointerenter"/)
    assert.match(previewSource, /art\.addEventListener\("pointerleave"/)
    assert.match(previewSource, /art\.addEventListener\("focusin"/)
})

test("card preview is muted, poster-backed, and does not load eagerly", () => {
    const previewSource = source("../src/features/media/GameMediaPreview.tsx")
    assert.match(previewSource, /muted/)
    assert.match(previewSource, /loop/)
    assert.match(previewSource, /playsInline/)
    assert.match(previewSource, /preload="none"/)
    assert.match(previewSource, /poster=\{media\.thumbnail/)
})

test("only one card preview can play at a time", () => {
    const previewSource = source("../src/features/media/GameMediaPreview.tsx")
    assert.match(previewSource, /const activePreviews = new Map/)
    assert.match(previewSource, /claimPreview/)
    assert.match(previewSource, /other\(\)/)
})

test("card previews pause offscreen and clean up resources", () => {
    const previewSource = source("../src/features/media/GameMediaPreview.tsx")
    assert.match(previewSource, /new IntersectionObserver/)
    assert.match(previewSource, /if \(!visible\) stop\(\)/)
    assert.match(previewSource, /observer\.disconnect\(\)/)
    assert.match(previewSource, /video\.pause\(\)/)
})

test("failed preview sources fall back to the cover", () => {
    const previewSource = source("../src/features/media/GameMediaPreview.tsx")
    assert.match(previewSource, /onError=\{\(\) =>/)
    assert.match(previewSource, /Preview unavailable/)
})

test("Discover cards retain navigation and do not block it with the preview", () => {
    const markup = renderToStaticMarkup(
        React.createElement(Discover, {
            games: [fixtureGame],
            saved: [],
            toggle() {},
            openGame() {},
            changeView() {},
            mood: "Spring",
            setMood() {},
            prefs: {},
            setPrefs() {},
            active: false,
            setActive() {},
            query: "",
            setQuery() {},
            socialDiscovery: false,
            setSocialDiscovery() {},
            panel: "",
            setPanel() {},
            find() {},
            title: "What are you in the mood for?",
            seasons: [],
            resultRef: React.createRef(),
            reviews: [],
        }),
    )
    assert.match(markup, /aria-label="Explore Stardew Valley"/)
    assert.match(markup, /game-media-preview-toggle/)
    assert.doesNotMatch(markup, /<video/)
    const mediaCss = source("../src/features/media/media.css")
    assert.match(mediaCss, /\.game-media-preview \{[\s\S]*?pointer-events: none/)
})

test("product gallery renders video controls for video media", () => {
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaGallery, { game: fixtureGame }),
    )
    assert.match(markup, /media-gallery/)
    assert.match(markup, /<video/)
    assert.match(markup, /controls=""/)
    assert.match(markup, /aria-label="Play video"/)
    assert.match(markup, /aria-label="Open fullscreen"/)
    assert.match(markup, /1:12/)
    assert.match(markup, /media-filter/)
    assert.match(markup, /media-thumb/)
    assert.match(markup, /aria-label="Previous media item"/)
})

test("product gallery only offers Trailers and Screenshots filters", () => {
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaGallery, { game: baseGame }),
    )
    assert.match(markup, />Trailers</)
    assert.match(markup, />Screenshots</)
    assert.doesNotMatch(markup, />Gameplay</)
    assert.doesNotMatch(markup, /gameplay/i)
})

test("image swaps keep the previous picture visible until the next one is ready", () => {
    const gallerySource = source("../src/features/media/GameMediaGallery.tsx")
    assert.match(gallerySource, /new window\.Image\(\)/)
    assert.match(gallerySource, /setDisplayedImageUrl\(selectedImageUrl\)/)
    assert.match(gallerySource, /src=\{displayedImageUrl \?\? selected\.url\}/)
    assert.match(
        gallerySource,
        /selectedImageUrl \?\? steam\(game\.steamAppId \|\| game\.id\)/,
    )
    assert.doesNotMatch(gallerySource, /<img\s+key=\{selected\.id\}/)
})

test("product gallery renders screenshots as images with a larger view", () => {
    const game = {
        ...noMediaGame,
        media: [
            {
                id: "shot",
                type: "screenshot",
                url: "https://media.example.test/scene.jpg",
                title: "Village scene",
            },
        ],
    }
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaGallery, { game }),
    )
    assert.match(markup, /<img/)
    assert.match(markup, /aria-label="Enlarge Village scene"/)
    assert.match(markup, /media-type-badge/)
    assert.doesNotMatch(markup, /<video/)
})

test("product gallery has a graceful no-footage state", () => {
    const markup = renderToStaticMarkup(
        React.createElement(GameMediaGallery, { game: noMediaGame }),
    )
    assert.match(
        markup,
        /No trailers or screenshots are available yet\. Cover artwork is shown instead\./,
    )
    assert.match(markup, /media-thumb/)
})

test("gallery supports keyboard navigation, play/pause, and fullscreen", () => {
    const gallerySource = source("../src/features/media/GameMediaGallery.tsx")
    assert.match(gallerySource, /ArrowLeft/)
    assert.match(gallerySource, /ArrowRight/)
    assert.match(gallerySource, /video\.play\(\)/)
    assert.match(gallerySource, /video\.pause\(\)/)
    assert.match(gallerySource, /requestFullscreen/)
    assert.match(gallerySource, /preload="metadata"/)
})

test("gallery handles failed sources and expanded viewing accessibly", () => {
    const gallerySource = source("../src/features/media/GameMediaGallery.tsx")
    assert.match(gallerySource, /role="alert"/)
    assert.match(gallerySource, /Try again/)
    assert.match(gallerySource, /aria-modal="true"/)
    assert.match(gallerySource, /Close expanded media view/)
    assert.match(gallerySource, /onKeyDown=\{\(event\) =>/)
})

test("game details mounts the shared media gallery", () => {
    const detailSource = source("../src/features/game-details/index.tsx")
    assert.match(detailSource, /import \{ GameMediaGallery \} from "\.\.\/media"/)
    assert.match(detailSource, /<GameMediaGallery game=\{detailGame\} \/>/)
})

test("media styles stay themed, responsive, focus-visible, and reduced-motion aware", () => {
    const mediaCss = source("../src/features/media/media.css")
    assert.match(mediaCss, /^\.ps \.media-gallery/m)
    assert.match(mediaCss, /var\(--accent\)/)
    assert.match(mediaCss, /var\(--surface\)/)
    assert.match(mediaCss, /@media \(max-width: 640px\)/)
    assert.match(mediaCss, /@media \(prefers-reduced-motion: reduce\)/)
    assert.match(mediaCss, /:focus-visible/)
})

test("media stylesheet is imported at the app entry point", () => {
    const main = source("../src/main.tsx")
    assert.match(main, /import "\.\/features\/media\/media\.css"/)
})
