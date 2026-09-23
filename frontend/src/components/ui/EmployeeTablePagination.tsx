import { useState, type FormEvent } from 'react'
import type { PaginationMeta } from '../../types/pagination'

interface EmployeeTablePaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
}

export function EmployeeTablePagination({ pagination, onPageChange }: EmployeeTablePaginationProps) {
  const { page, totalPages, total, limit } = pagination
  const [goToValue, setGoToValue] = useState('')

  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  function submitGoTo(event: FormEvent) {
    event.preventDefault()
    const n = Number(goToValue)
    if (!Number.isFinite(n) || n < 1) return
    onPageChange(Math.min(totalPages, Math.max(1, Math.floor(n))))
    setGoToValue('')
  }

  const pageItems = buildPageItems(page, totalPages)

  return (
    <div className="px-4 py-4 bg-surface-container-low/40 border-t border-surface-container-low flex flex-col gap-4 text-sm text-secondary">
      <div className="text-center sm:text-left">
        Showing <strong className="text-on-surface">{start.toLocaleString()}</strong>
        {' – '}
        <strong className="text-on-surface">{end.toLocaleString()}</strong>
        {' of '}
        <strong className="text-on-surface">{total.toLocaleString()}</strong>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-1">
          <PageTextButton label="First" disabled={page <= 1} onClick={() => onPageChange(1)} />
          <PageTextButton label="‹" disabled={page <= 1} onClick={() => onPageChange(page - 1)} ariaLabel="Previous page" />
          {pageItems.map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`e-${index}`} className="px-2 text-secondary select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-semibold ${
                  item === page
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                {item.toLocaleString()}
              </button>
            ),
          )}
          <PageTextButton label="›" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} ariaLabel="Next page" />
          <PageTextButton label="Last" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} />
        </div>

        <form onSubmit={submitGoTo} className="flex items-center gap-2 text-sm">
          <span className="text-secondary whitespace-nowrap">Go to page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={goToValue}
            onChange={(e) => setGoToValue(e.target.value)}
            className="w-20 h-9 px-2 rounded-lg border border-surface-container-low bg-surface-container-lowest text-sm text-center"
            placeholder={String(page)}
            aria-label="Page number"
          />
          <button
            type="submit"
            className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface font-semibold hover:bg-surface-container"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  )
}

function PageTextButton({
  label,
  disabled,
  onClick,
  ariaLabel,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="h-9 px-3 rounded-lg font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none"
    >
      {label}
    </button>
  )
}

/** e.g. 1  2  3  …  4040  4041 when near the start; adapts near middle and end */
export function buildPageItems(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: Array<number | 'ellipsis'> = []

  if (current <= 4) {
    for (let p = 1; p <= 3; p++) items.push(p)
    items.push('ellipsis')
    items.push(totalPages - 1)
    items.push(totalPages)
    return items
  }

  if (current >= totalPages - 3) {
    items.push(1)
    items.push('ellipsis')
    for (let p = totalPages - 2; p <= totalPages; p++) items.push(p)
    return items
  }

  items.push(1)
  items.push('ellipsis')
  items.push(current - 1)
  items.push(current)
  items.push(current + 1)
  items.push('ellipsis')
  items.push(totalPages)
  return items
}
