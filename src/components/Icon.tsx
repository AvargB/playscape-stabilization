import * as React from "react"

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
    const paths: any = {
        search: (
            <>
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 5 5" />
            </>
        ),
        arrow: (
            <>
                <path d="M4 12h15M13 6l6 6-6 6" />
            </>
        ),
        heart: (
            <path d="M20 5c-3-3-7-1-8 1-2-3-6-4-8-1-5 5 2 10 8 15 6-5 13-10 8-15Z" />
        ),
        "heart-filled": (
            <path
                d="M20 5c-3-3-7-1-8 1-2-3-6-4-8-1-5 5 2 10 8 15 6-5 13-10 8-15Z"
                fill="currentColor"
            />
        ),
        sun: (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
            </>
        ),
        leaf: (
            <>
                <path d="M20 3C7 1 0 12 7 18S22 14 20 3ZM5 21 16 8" />
            </>
        ),
        flower: (
            <>
                <circle cx="12" cy="12" r="2.25" />
                <circle cx="12" cy="6.25" r="3.25" />
                <circle cx="17.75" cy="12" r="3.25" />
                <circle cx="12" cy="17.75" r="3.25" />
                <circle cx="6.25" cy="12" r="3.25" />
            </>
        ),
        snow: (
            <>
                <path d="M12 2v20M3 7l18 10M3 17 21 7M9 3l3 3 3-3M9 21l3-3 3 3" />
            </>
        ),
        close: <path d="m6 6 12 12M6 18 18 6" />,
        sliders: (
            <>
                <path d="M4 7h16M4 17h16" />
                <circle cx="9" cy="7" r="3" />
                <circle cx="16" cy="17" r="3" />
            </>
        ),
        spark: <circle cx="12" cy="12" r="9" strokeWidth="3" />,
        check: <path d="m5 12 4 4L19 6" />,
        menu: <path d="M4 6h16M4 12h16M4 18h16" />,
        play: <path d="m8 4 12 8-12 8Z" />,
        pause: <path d="M8 5v14M16 5v14" strokeWidth="3" />,
        volume: (
            <>
                <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
            </>
        ),
        expand: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
        image: (
            <>
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="9" cy="10" r="2" />
                <path d="m4 18 5-5 4 4 3-3 4 4" />
            </>
        ),
        "chevron-left": <path d="m15 5-7 7 7 7" />,
        "chevron-right": <path d="m9 5 7 7-7 7" />,
        user: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
            </>
        ),
    }
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name] || paths.spark}
        </svg>
    )
}
