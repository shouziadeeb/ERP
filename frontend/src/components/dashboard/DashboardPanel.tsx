import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'

interface DashboardPanelProps {
  title: string
  subtitle?: string
  viewAllHref?: string
  viewAllLabel?: string
  children: ReactNode
  className?: string
}

export function DashboardPanel({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View all',
  children,
  className = '',
}: DashboardPanelProps) {
  return (
    <section className={`rounded-2xl border border-surface-container-low bg-surface-container-lowest shadow-sm flex flex-col min-h-[320px] ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-surface-container-low">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {viewAllLabel}
            <Icon name="arrow_forward" className="text-[14px]" />
          </Link>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">{children}</div>
    </section>
  )
}
