import { Icon } from '../Icon'
import type { PaginationMeta } from '../../types/pagination'

interface PaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, totalPages, total, limit } = pagination
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="px-4 py-3 bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-secondary">
      <span>
        Showing <strong className="text-on-surface">{start}-{end}</strong> of{' '}
        <strong className="text-on-surface">{total.toLocaleString()}</strong>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-8 px-2 rounded-lg hover:bg-surface-container disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevron_left" className="text-[18px]" />
        </button>
        <span className="px-2 text-xs font-semibold">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="h-8 px-2 rounded-lg hover:bg-surface-container disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
    </div>
  )
}
