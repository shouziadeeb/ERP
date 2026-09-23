import type { ReactNode } from 'react'
import { Icon } from '../Icon'

interface PageHeaderProps {
  breadcrumb: [string, string]
  title: string
  subtitle: string
  actions?: ReactNode
}

export function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-1 text-secondary text-xs uppercase tracking-wider font-semibold">
          <span>{breadcrumb[0]}</span>
          <Icon name="chevron_right" className="text-[14px]" />
          <span className="text-primary">{breadcrumb[1]}</span>
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <h1 className="text-3xl font-semibold text-on-surface tracking-tight">{title}</h1>
          <span className="hidden sm:inline px-2 py-0.5 rounded text-xs bg-surface-container text-secondary font-mono">
            v4.19-PROD
          </span>
        </div>
        <p className="text-sm text-secondary mt-1">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
