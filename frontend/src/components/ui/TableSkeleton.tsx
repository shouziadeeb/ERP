export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-sm p-4 flex flex-col gap-3 animate-pulse">
      <div className="h-10 bg-surface-container-low rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-surface-container-low/60 rounded-lg w-full" />
      ))}
    </div>
  )
}
