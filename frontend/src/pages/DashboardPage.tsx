/** Executive home: KPIs, charts, low stock, activity feed, leave approvals. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardPanel } from '../components/dashboard/DashboardPanel'
import { OrderStatusBars } from '../components/dashboard/OrderStatusBars'
import { RevenueTrendChart } from '../components/dashboard/RevenueTrendChart'
import { Icon } from '../components/Icon'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import {
  getDashboardCharts,
  getDashboardSummary,
  getLowStockAlerts,
  getPendingApprovals,
  getRecentActivities,
  getRecentOrdersForDashboard,
} from '../services/dashboardService'
import { updateLeaveStatus } from '../services/leaveService'
import { getSettings } from '../services/settingsService'
import type { DashboardActivity, DashboardApproval, DashboardCharts, DashboardSummary } from '../types/dashboard'
import type { InventoryRecord } from '../types/inventory'
import type { SalesOrder } from '../types/order'
import { formatCurrencyInr, formatDate, formatRelativeTime } from '../utils/format'

function activityIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes('order')) return 'local_shipping'
  if (t.includes('stock') || t.includes('inventory')) return 'inventory_2'
  if (t.includes('leave')) return 'event_busy'
  if (t.includes('invoice')) return 'receipt_long'
  return 'notifications'
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [charts, setCharts] = useState<DashboardCharts | null>(null)
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [alerts, setAlerts] = useState<InventoryRecord[]>([])
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [approvals, setApprovals] = useState<DashboardApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthLabel, setMonthLabel] = useState('September 2026')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function loadDashboard(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [s, chartData, recentOrders, lowStock, activityRows, approvalRows, settings] = await Promise.all([
        getDashboardSummary(),
        getDashboardCharts(),
        getRecentOrdersForDashboard(),
        getLowStockAlerts(),
        getRecentActivities(),
        getPendingApprovals(),
        getSettings(),
      ])
      setSummary(s)
      setCharts(chartData)
      setOrders(recentOrders)
      setAlerts(lowStock)
      setActivities(activityRows.slice(0, 8))
      setApprovals(approvalRows)
      setMonthLabel(settings.reportingMonthLabel)
      setLastUpdated(new Date())
    } catch {
      setError('Failed to load dashboard analytics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  async function handleLeave(id: string, status: 'Approved' | 'Rejected') {
    await updateLeaveStatus(id, status)
    await loadDashboard(true)
  }

  function exportSnapshot() {
    if (!summary) return
    const lines = [
      'Metric,Value',
      `Active Employees,${summary.activeEmployees}`,
      `Monthly Revenue,${summary.monthlyRevenue}`,
      `Monthly Expenses,${summary.monthlyExpenses}`,
      `Pending Orders,${summary.pendingOrders}`,
      `Low Stock SKUs,${summary.lowStockProducts}`,
      `Overdue Invoices,${summary.overdueInvoices}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `apexerp-dashboard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const headerActions = (
    <>
      {lastUpdated && (
        <span className="text-xs text-secondary hidden md:inline">
          Updated {formatRelativeTime(lastUpdated.toISOString())}
        </span>
      )}
      <button
        type="button"
        className="h-9 px-3 rounded-lg border border-surface-container-low bg-surface-container-lowest text-sm font-semibold text-on-surface inline-flex items-center gap-1.5 hover:bg-surface-container-low"
        onClick={() => void loadDashboard(true)}
        disabled={refreshing}
      >
        <Icon name="refresh" className={`text-[18px] ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </button>
      <button
        type="button"
        className="h-9 px-3 rounded-lg border border-surface-container-low bg-surface-container-lowest text-sm font-semibold text-on-surface inline-flex items-center gap-1.5 hover:bg-surface-container-low"
        onClick={exportSnapshot}
        disabled={!summary}
      >
        <Icon name="download" className="text-[18px]" />
        Export
      </button>
    </>
  )

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader
        breadcrumb={['Enterprise', 'Dashboard']}
        title="Operations Dashboard"
        subtitle="Executive overview of workforce, inventory, revenue, and fulfillment."
        actions={headerActions}
      />

      {error && <ErrorBanner message={error} onRetry={() => void loadDashboard()} />}

      {loading && <TableSkeleton rows={6} />}

      {summary && charts && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Active employees"
              value={summary.activeEmployees.toLocaleString()}
              hint={`${summary.totalEmployees.toLocaleString()} total · +${summary.newEmployeesThisMonth} this month`}
              icon="group"
              tone="primary"
            />
            <KpiCard
              title="Monthly revenue"
              value={formatCurrencyInr(summary.monthlyRevenue)}
              hint={`${monthLabel} closed sales`}
              icon="payments"
              tone="primary"
              trend={summary.revenueChangePercent}
            />
            <KpiCard
              title="Pending orders"
              value={summary.pendingOrders.toLocaleString()}
              hint={`${summary.pendingInvoices} open invoices · ${summary.totalCustomers} customers`}
              icon="local_shipping"
              tone="neutral"
            />
            <KpiCard
              title="Inventory risk"
              value={summary.lowStockProducts.toLocaleString()}
              hint={`${summary.outOfStockProducts} SKUs out of stock`}
              icon="warning"
              tone="danger"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-surface-container-low bg-surface-container-lowest shadow-sm p-5">
              <RevenueTrendChart series={charts.revenueSeries} periodLabel={monthLabel} />
            </div>
            <div className="rounded-2xl border border-surface-container-low bg-surface-container-lowest shadow-sm p-5">
              <OrderStatusBars rows={charts.orderStatusBreakdown} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DashboardPanel title="Recent sales orders" subtitle="Latest confirmed transactions" viewAllHref="/orders">
              <div className="overflow-x-auto -mx-1 flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-secondary uppercase tracking-wide border-b border-surface-container-low">
                      <th className="text-left font-semibold py-2 pr-2">Order</th>
                      <th className="text-left font-semibold py-2 pr-2">Customer</th>
                      <th className="text-left font-semibold py-2 pr-2">Date</th>
                      <th className="text-right font-semibold py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-surface-container-low/80 last:border-0 hover:bg-surface-container-low/40">
                        <td className="py-2.5 pr-2 font-mono text-xs text-primary">{o.orderNumber}</td>
                        <td className="py-2.5 pr-2 max-w-[140px] truncate">{o.customerName}</td>
                        <td className="py-2.5 pr-2 text-secondary whitespace-nowrap">{formatDate(o.orderDate)}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">{formatCurrencyInr(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Low stock alerts" subtitle="Warehouses needing replenishment" viewAllHref="/inventory">
              <ul className="flex flex-col gap-2 flex-1">
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low/50 border border-surface-container-low"
                  >
                    <div className="min-w-0 flex items-start gap-2">
                      <span className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
                        <Icon name="warehouse" className="text-[16px] text-primary" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{a.productName}</div>
                        <div className="text-xs text-secondary truncate">{a.warehouseName} · {a.availableQuantity} available</div>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DashboardPanel title="Recent activity" subtitle="System and user events">
              <ul className="flex flex-col gap-0 flex-1 divide-y divide-surface-container-low">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-9 h-9 rounded-full bg-secondary-container/60 flex items-center justify-center shrink-0">
                      <Icon name={activityIcon(a.type)} className="text-[18px] text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{a.message}</p>
                      <p className="text-xs text-secondary mt-0.5">
                        {a.actor} · {a.type} · {formatRelativeTime(a.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </DashboardPanel>

            <DashboardPanel title="Pending approvals" subtitle={`${approvals.length} items need action`} viewAllHref="/employees">
              {approvals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-secondary text-sm py-8">
                  <Icon name="task_alt" className="text-[32px] text-tertiary mb-2" />
                  All caught up — no pending leave requests.
                </div>
              ) : (
                <ul className="flex flex-col gap-2 flex-1">
                  {approvals.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-surface-container-low bg-surface-container-low/40"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{a.requestedBy}</div>
                        <div className="text-xs text-secondary">
                          {a.type} · {a.reference} · {formatDate(a.date)}
                        </div>
                      </div>
                      {a.type === 'Leave' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg bg-tertiary text-on-primary text-xs font-semibold hover:opacity-90"
                            onClick={() => void handleLeave(a.id, 'Approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg border border-error/30 text-error text-xs font-semibold hover:bg-error-container/40"
                            onClick={() => void handleLeave(a.id, 'Rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>

          <section className="rounded-2xl border border-surface-container-low bg-gradient-to-r from-surface-container-lowest via-surface-container-low/30 to-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-semibold">Finance snapshot</h3>
              <Link to="/reports" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
                Open reports <Icon name="arrow_forward" className="text-[14px]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FinanceTile
                label="Monthly expenses"
                value={formatCurrencyInr(summary.monthlyExpenses)}
                trend={summary.expenseChangePercent}
                invertTrend
              />
              <FinanceTile label="Overdue invoices" value={summary.overdueInvoices.toLocaleString()} sub="Requires collections follow-up" alert />
              <FinanceTile label="Pending purchase orders" value={summary.pendingPurchaseOrders.toLocaleString()} sub="Procurement queue" />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function KpiCard({
  title,
  value,
  hint,
  icon,
  tone,
  trend,
}: {
  title: string
  value: string
  hint: string
  icon: string
  tone: 'primary' | 'neutral' | 'danger'
  trend?: number
}) {
  const iconBg =
    tone === 'danger' ? 'bg-error-container text-error' : tone === 'primary' ? 'bg-secondary-container text-primary' : 'bg-surface-container-low text-primary'

  return (
    <article className="rounded-2xl border border-surface-container-low bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon name={icon} className="text-[20px]" />
        </div>
        {trend !== undefined && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
              trend >= 0 ? 'bg-tertiary-fixed-dim/20 text-tertiary' : 'bg-error-container text-error'
            }`}
          >
            {trend >= 0 ? '+' : ''}
            {trend}% vs last month
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{title}</p>
        <p className={`text-2xl font-semibold tracking-tight mt-1 tabular-nums ${tone === 'danger' ? 'text-error' : 'text-on-surface'}`}>{value}</p>
        <p className="text-xs text-secondary mt-1.5 leading-relaxed">{hint}</p>
      </div>
    </article>
  )
}

function FinanceTile({
  label,
  value,
  sub,
  trend,
  invertTrend,
  alert,
}: {
  label: string
  value: string
  sub?: string
  trend?: number
  invertTrend?: boolean
  alert?: boolean
}) {
  let trendGood = trend !== undefined && trend >= 0
  if (invertTrend) trendGood = !trendGood

  return (
    <div className="rounded-xl bg-surface-container-lowest/80 border border-surface-container-low p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${alert ? 'text-error' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs font-medium mt-2 ${trendGood ? 'text-tertiary' : 'text-error'}`}>
          {trend >= 0 ? '+' : ''}
          {trend}% vs prior month
        </p>
      )}
    </div>
  )
}
