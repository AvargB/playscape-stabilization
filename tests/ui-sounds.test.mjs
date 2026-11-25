import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { playUiSound, resolveSound } from "../src/features/sound/uiSounds.ts"

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8")

function fakeControl({ attrs = {}, contexts = [] } = {}) {
    const has = (name) => Object.prototype.hasOwnProperty.call(attrs, name)
    const control = {
        closest(selector) {
            if (
                selector ===
                "button, a, [role='button'], select, input[type='checkbox'], input[type='radio']"
            ) {
                return control
            }
            if (selector === "[data-checkout-complete='true']") {
                return contexts.includes("complete") ? control : null
            }
            if (selector === ".checkout-modal") {
                return contexts.includes("checkout") ? control : null
            }
            if (selector === ".media-gallery") {
                return contexts.includes("media") ? control : null
            }
            if (selector === ".nav, .global-footer") {
                return contexts.includes("nav") ? control : null
            }
            return null
        },
        hasAttribute(name) {
            return has(name) && attrs[name] !== false && attrs[name] !== null
        },
        getAttribute(name) {
            return has(name) ? String(attrs[name]) : null
        },
    }
    return control
}

test("sound cues are synthesized locally without assets, storage, or network", () => {
    const moduleSource = source("../src/features/sound/uiSounds.ts")
    assert.match(moduleSource, /createOscillator/)
    assert.match(moduleSource, /createGain/)
    assert.doesNotMatch(moduleSource, /fetch\(/)
    assert.doesNotMatch(moduleSource, /localStorage/)
    assert.doesNotMatch(moduleSource, /\.(?:mp3|wav|ogg|m4a)\b/i)
    assert.doesNotThrow(() => playUiSound("success"))
})

test("sound resolution maps controls to subtle cue families", () => {
    assert.equal(resolveSound(null), null)
    assert.equal(resolveSound(fakeControl()), "ui")
    assert.equal(resolveSound(fakeControl({ contexts: ["nav"] })), "navigation")
    assert.equal(resolveSound(fakeControl({ contexts: ["media"] })), "media")
    assert.equal(resolveSound(fakeControl({ contexts: ["checkout"] })), "checkout")
    assert.equal(
        resolveSound(fakeControl({ contexts: ["checkout", "complete"] })),
        "success",
    )
})

test("sound resolution honors opt-out, overrides, and disabled controls", () => {
    assert.equal(
        resolveSound(fakeControl({ attrs: { disabled: true }, contexts: ["checkout"] })),
        null,
    )
    assert.equal(
        resolveSound(
            fakeControl({
                attrs: { "aria-disabled": "true" },
                contexts: ["checkout"],
            }),
        ),
        null,
    )
    assert.equal(
        resolveSound(
            fakeControl({ attrs: { "data-sound": "none" }, contexts: ["checkout"] }),
        ),
        null,
    )
    assert.equal(
        resolveSound(
            fakeControl({ attrs: { "data-sound": "media" }, contexts: ["checkout"] }),
        ),
        "media",
    )
})

test("one delegated listener is installed at the app entry point", () => {
    const main = source("../src/main.tsx")
    const moduleSource = source("../src/features/sound/uiSounds.ts")
    assert.match(main, /import \{ installUiSounds \} from "\.\/features\/sound\/uiSounds"/)
    assert.match(main, /installUiSounds\(\)/)
    assert.match(moduleSource, /document\.addEventListener\("click", handleClick, true\)/)
    assert.match(moduleSource, /document\.removeEventListener\("click", handleClick, true\)/)
})

test("checkout plays its confirmation cue only when the receipt appears", () => {
    const checkout = source("../src/features/checkout/CheckoutDialog.tsx")
    assert.match(checkout, /import \{ playUiSound \} from "\.\.\/sound\/uiSounds"/)
    assert.match(checkout, /playUiSound\("success"\)/)
    assert.match(checkout, /data-sound="none"/)
})
