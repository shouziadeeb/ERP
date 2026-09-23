import { Icon } from '../Icon'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-sm p-12 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary">
        <Icon name={icon} className="text-[32px]" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-on-surface">{title}</h3>
        <p className="text-sm text-secondary mt-1 max-w-md">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="h-9 px-4 rounded-lg bg-surface-container text-sm font-semibold flex items-center gap-1"
          onClick={onAction}
        >
          <Icon name="restart_alt" className="text-[16px]" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
