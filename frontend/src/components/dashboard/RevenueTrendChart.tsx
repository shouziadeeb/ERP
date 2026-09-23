import { formatCompactInr } from '../../utils/format'

interface Point {
  label: string
  revenue: number
}

export function RevenueTrendChart({ series, periodLabel }: { series: Point[]; periodLabel: string }) {
  const max = Math.max(...series.map((p) => p.revenue), 1)
  const width = 560
  const height = 200
  const padX = 48
  const padY = 28
  const chartW = width - padX * 2
  const chartH = height - padY * 2
  const barGap = 16
  const barW = (chartW - barGap * (series.length - 1)) / series.length

  const points = series.map((p, i) => {
    const h = (p.revenue / max) * chartH
    const x = padX + i * (barW + barGap)
    const y = padY + chartH - h
    return { ...p, x, y, h, barW }
  })

  const linePoints = points
    .map((p) => `${p.x + p.barW / 2},${p.y}`)
    .join(' ')

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Revenue trend</h3>
          <p className="text-xs text-secondary mt-0.5">{periodLabel} · weekly buckets</p>
        </div>
        <span className="text-xs font-medium text-secondary px-2 py-1 rounded-md bg-surface-container-low">INR</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Weekly revenue chart">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padY + chartH * (1 - t)
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="var(--color-surface-container)" strokeWidth={1} />
              <text x={padX - 8} y={y + 4} textAnchor="end" className="fill-secondary text-[10px]">
                {formatCompactInr(max * t)}
              </text>
            </g>
          )
        })}
        {points.map((p) => (
          <g key={p.label}>
            <rect x={p.x} y={p.y} width={p.barW} height={p.h} rx={6} fill="#3525cd" fillOpacity={0.15} />
            <rect x={p.x} y={p.y + p.h * 0.35} width={p.barW} height={p.h * 0.65} rx={6} fill="#3525cd" fillOpacity={0.85} />
            <text x={p.x + p.barW / 2} y={height - 8} textAnchor="middle" fill="#565e74" fontSize={10} fontWeight={500}>
              {p.label}
            </text>
            <title>{`${p.label}: ${formatCompactInr(p.revenue)}`}</title>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={linePoints}
        />
        {points.map((p) => (
          <circle key={`dot-${p.label}`} cx={p.x + p.barW / 2} cy={p.y} r={4} className="fill-primary stroke-surface-container-lowest" strokeWidth={2} />
        ))}
      </svg>
    </div>
  )
}
