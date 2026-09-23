const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-tertiary-container/15 text-tertiary',
  Inactive: 'bg-surface-container text-secondary',
  'On Leave': 'bg-secondary-container/40 text-on-surface',
  Probation: 'bg-primary/10 text-primary',
  Suspended: 'bg-error-container text-error',
  'In Stock': 'bg-tertiary-container/15 text-tertiary',
  'Low Stock': 'bg-secondary-container/40 text-on-surface',
  'Out of Stock': 'bg-error-container text-on-error-container',
  Overstocked: 'bg-primary/10 text-primary',
  Paid: 'bg-tertiary-container/15 text-tertiary',
  Pending: 'bg-secondary-container/40 text-on-surface',
  Processing: 'bg-primary/10 text-primary',
  Delivered: 'bg-tertiary-container/15 text-tertiary',
  Cancelled: 'bg-surface-container text-secondary',
  Approved: 'bg-tertiary-container/15 text-tertiary',
  Rejected: 'bg-error-container text-error',
  Shipped: 'bg-primary/10 text-primary',
  Confirmed: 'bg-secondary-container/50 text-primary',
  Draft: 'bg-surface-container text-secondary',
  Sent: 'bg-primary/10 text-primary',
  'Partially Paid': 'bg-secondary-container/40 text-on-surface',
  Refunded: 'bg-surface-container text-secondary',
  Overdue: 'bg-error-container text-error',
  Blocked: 'bg-error-container text-error',
  Received: 'bg-tertiary-container/15 text-tertiary',
  Ordered: 'bg-primary/10 text-primary',
  'Pending Approval': 'bg-secondary-container/40 text-on-surface',
  Failed: 'bg-error-container text-error',
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-surface-container text-secondary'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  )
}
