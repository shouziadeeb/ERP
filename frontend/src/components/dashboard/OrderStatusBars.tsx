interface Row {
  status: string
  count: number
}

export function OrderStatusBars({ rows }: { rows: Row[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1
  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-on-surface">Order pipeline</h3>
        <p className="text-xs text-secondary mt-0.5">{total.toLocaleString()} orders by status</p>
      </div>
      <ul className="flex flex-col gap-3 flex-1">
        {rows.map((row) => {
          const pct = Math.round((row.count / total) * 100)
          const widthPct = (row.count / max) * 100
          return (
            <li key={row.status}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-on-surface">{row.status}</span>
                <span className="text-secondary tabular-nums">{row.count.toLocaleString()} · {pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${widthPct}%`, opacity: 0.35 + (widthPct / 100) * 0.65 }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
