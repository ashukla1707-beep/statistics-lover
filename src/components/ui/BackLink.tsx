import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function BackLink({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  const classes = ['back-link', className].filter(Boolean).join(' ')
  return (
    <Link className={classes} to={to}>
      <span className="back-link-icon" aria-hidden="true">←</span>
      <span>{children}</span>
    </Link>
  )
}
