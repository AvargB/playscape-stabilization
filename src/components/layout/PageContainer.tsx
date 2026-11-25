import * as React from "react"

interface PageContainerProps {
    id?: string
    className?: string
    hidden?: boolean
    style?: React.CSSProperties
    children: React.ReactNode
}

export function PageContainer({
    id,
    className,
    hidden = false,
    style,
    children,
}: PageContainerProps) {
    return (
        <main id={id} className={className} hidden={hidden} style={style}>
            {children}
        </main>
    )
}
