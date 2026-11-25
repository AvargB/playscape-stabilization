import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text" | "icon"
  size?: "sm" | "md" | "lg"
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const cls = ["btn", `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(" ")
  return <button className={cls} {...props} />
}

export interface BadgeProps {
  children: React.ReactNode
  tone?: "neutral" | "success" | "warning" | "info"
  className?: string
}

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return <span className={["badge", `badge-${tone}`, className].filter(Boolean).join(" ")}>{children}</span>
}

export interface SectionHeadingProps {
  kicker?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function SectionHeading({ kicker, title, description, action }: SectionHeadingProps) {
  return (
    <div className="section-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export interface EmptyStateProps {
  title?: string
  message: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="empty">
      {icon}
      {title && <strong>{title}</strong>}
      <p>{message}</p>
      {action}
    </div>
  )
}

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  kicker?: string
}

export function Panel({ title, kicker, children, className = "", ...props }: PanelProps) {
  return (
    <div className={["side-card", className].filter(Boolean).join(" ")} {...props}>
      {kicker && <div className="kicker">{kicker}</div>}
      {title && <h2>{title}</h2>}
      {children}
    </div>
  )
}
