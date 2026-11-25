import * as React from "react"

export interface ModalProps {
  open: boolean
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  onClose: () => void
  className?: string
}

export function Modal({ open, title, children, footer, size = "md", onClose, className = "" }: ModalProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const t = setTimeout(() => ref.current?.focus(), 0)
    return () => {
      document.removeEventListener("keydown", onKey)
      clearTimeout(t)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className={["modal", `modal-${size}`, className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          {title && <h2 id="modal-title">{title}</h2>}
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  )
}
