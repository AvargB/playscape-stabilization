/**
 * Subtle UI sound effects generated with the Web Audio API.
 *
 * Nothing is downloaded, stored, or transmitted. Sounds are created lazily on
 * user interaction so browsers never need to autoplay audio.
 */

export type UiSound = "ui" | "navigation" | "checkout" | "success" | "media"

type Tone = {
    frequency: number
    duration: number
    gain: number
    type?: OscillatorType
    slideTo?: number
}

const UI_SOUNDS: UiSound[] = ["ui", "navigation", "checkout", "success", "media"]

const TONES: Record<UiSound, Tone> = {
    ui: { frequency: 520, duration: 0.06, gain: 0.025, type: "sine" },
    navigation: { frequency: 660, duration: 0.08, gain: 0.03, type: "sine", slideTo: 720 },
    checkout: { frequency: 440, duration: 0.1, gain: 0.035, type: "triangle" },
    success: { frequency: 660, duration: 0.16, gain: 0.035, type: "sine" },
    media: { frequency: 580, duration: 0.06, gain: 0.025, type: "sine" },
}

const SUCCESS_SEQUENCE = [523.25, 783.99]

let audioContext: AudioContext | null = null

function isUiSound(value: string | null | undefined): value is UiSound {
    return Boolean(value && UI_SOUNDS.includes(value as UiSound))
}

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    const LegacyAudioContext = (
        window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext
    const AudioContextClass = window.AudioContext ?? LegacyAudioContext
    if (!AudioContextClass) return null
    if (!audioContext) {
        try {
            audioContext = new AudioContextClass()
        } catch {
            return null
        }
    }
    return audioContext
}

function playTone(context: AudioContext, tone: Tone, delay = 0): void {
    const start = context.currentTime + delay
    const attack = Math.min(0.012, tone.duration / 3)
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = tone.type ?? "sine"
    oscillator.frequency.setValueAtTime(tone.frequency, start)
    if (tone.slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.slideTo, start + tone.duration)
    }

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + tone.duration + 0.02)
}

/** Plays one short synthesized cue. Safe to call when audio is unavailable. */
export function playUiSound(sound: UiSound = "ui"): void {
    const context = getAudioContext()
    if (!context) return
    if (context.state === "suspended") void context.resume()

    if (sound === "success") {
        SUCCESS_SEQUENCE.forEach((frequency, index) => {
            playTone(context, { ...TONES.success, frequency }, index * 0.11)
        })
        return
    }

    playTone(context, TONES[sound])
}

/**
 * Maps a clicked element to a cue. `data-sound="none"` opts a control out,
 * which is useful when another effect will play the confirmation cue later.
 */
export function resolveSound(element: Element | null): UiSound | null {
    if (!element) return null
    const control = element.closest<HTMLElement>(
        "button, a, [role='button'], select, input[type='checkbox'], input[type='radio']",
    )
    if (!control) return null
    if (control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") {
        return null
    }

    const override = control.getAttribute("data-sound")
    if (override === "none") return null
    if (isUiSound(override)) return override

    if (control.closest("[data-checkout-complete='true']")) return "success"
    if (control.closest(".checkout-modal")) return "checkout"
    if (control.closest(".media-gallery")) return "media"
    if (control.closest(".nav, .global-footer")) return "navigation"
    return "ui"
}

/** Installs one delegated listener for every interactive control. */
export function installUiSounds(): () => void {
    if (typeof document === "undefined") return () => {}
    const handleClick = (event: MouseEvent) => {
        const sound = resolveSound(event.target as Element | null)
        if (sound) playUiSound(sound)
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
}
