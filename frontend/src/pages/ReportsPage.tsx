import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/ui/StatusBadge'
import {
  COLUMN_LABELS,
  DATE_COLUMNS,
  MONEY_COLUMNS,
  REPORT_META,
  STATUS_COLUMNS,
  statusOptionsForReport,
} from '../config/reports'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FilterSelect } from '../components/ui/FilterSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  exportReportCsv,
  getReportColumns,
  getReportData,
  getReportExport,
  type ReportResult,
  type ReportType,
} from '../services/reportService'
import { formatCurrencyInr, formatDate } from '../utils/format'

const REPORT_TYPES = Object.keys(REPORT_META) as ReportType[]

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('2026-09-01')
  const [dateTo, setDateTo] = useState('2026-09-30')
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = REPORT_META[reportType]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(
        await getReportData({
          type: reportType,
          page,
          limit: 25,
          search: debouncedSearch,
          status: statusFilter,
          dateFrom,
          dateTo,
        }),
      )
    } catch {
      setError('Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }, [reportType, page, debouncedSearch, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setStatusFilter('all')
    setPage(1)
  }, [reportType])

  async function exportCsv() {
    setExporting(true)
    try {
      const full = await getReportExport({
        type: reportType,
        search: debouncedSearch,
        status: statusFilter,
        dateFrom,
        dateTo,
      })
      const csv = exportReportCsv(reportType, full.data)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `apexerp-${reportType}-${dateFrom}-to-${dateTo}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export failed. Try again.')
    } finally {
      setExporting(false)
    }
  }

  const columns = getReportColumns(reportType)
  const rows = result?.data ?? []
  const summary = result?.summary
  const pagination = result?.pagination

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader
        breadcrumb={['Analytics', 'Reports']}
        title="Reports Center"
        subtitle="Operational and financial reports with filters and export."
        actions={
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
            onClick={() => void exportCsv()}
            disabled={exporting || !summary?.totalRows}
          >
            <Icon name="download" className={`text-[18px] ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {REPORT_TYPES.map((type) => {
          const item = REPORT_META[type]
          const active = type === reportType
          return (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                active
                  ? 'bg-secondary-container border-primary/20 text-primary shadow-sm'
                  : 'bg-surface-container-lowest border-surface-container-low text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <Icon name={item.icon} className="text-[18px]" />
              {item.label}
            </button>
          )
        })}
      </div>

      <section className="rounded-2xl border border-surface-container-low bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Icon name={meta.icon} className="text-primary text-[22px]" />
              {meta.label} report
            </h2>
            <p className="text-sm text-secondary mt-1 max-w-xl">{meta.description}</p>
          </div>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-w-[280px]">
              <SummaryChip label="Matching rows" value={summary.totalRows.toLocaleString()} />
              {summary.primaryMetric !== undefined && summary.primaryMetricLabel && (
                <SummaryChip
                  label={String(summary.primaryMetricLabel)}
                  value={
                    summary.primaryMetricLabel.includes('INR')
                      ? formatCurrencyInr(summary.primaryMetric)
                      : summary.primaryMetric.toLocaleString()
                  }
                  highlight
                />
              )}
              <SummaryChip label="Date range" value={`${formatDate(dateFrom)} – ${formatDate(dateTo)}`} small />
            </div>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-surface-container-low flex flex-wrap gap-3 items-end">
          <input
            className="h-9 px-3 rounded-lg bg-surface-container-low text-sm flex-1 min-w-[200px] max-w-md"
            placeholder="Search within report…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <FilterSelect
            id="report-status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
            options={statusOptionsForReport(reportType)}
          />
          <label className="text-xs text-secondary flex flex-col gap-1 font-medium">
            From
            <input
              type="date"
              className="h-9 px-2 rounded-lg bg-surface-container-low text-sm"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="text-xs text-secondary flex flex-col gap-1 font-medium">
            To
            <input
              type="date"
              className="h-9 px-2 rounded-lg bg-surface-container-low text-sm"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-surface-container-low text-sm font-semibold hover:bg-surface-container-low"
            onClick={() => void load()}
          >
            Apply
          </button>
        </div>
      </section>

      {loading && <TableSkeleton rows={8} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState icon="monitoring" title="No report rows found" description="Adjust filters or date range." />
      )}

      {!loading && !error && rows.length > 0 && result && pagination && (
        <div className="rounded-2xl border border-surface-container-low bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-container-low flex flex-wrap items-center justify-between gap-2 text-xs text-secondary">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} rows
            </span>
            <span className="font-medium">Page {pagination.page} of {pagination.totalPages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="bg-surface-container-low/80 text-[11px] uppercase tracking-wide text-secondary border-b border-surface-container-low">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className={`px-4 py-3 font-semibold ${MONEY_COLUMNS.has(c) ? 'text-right' : 'text-left'}`}
                    >
                      {COLUMN_LABELS[c] ?? c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/40 transition-colors">
                    {columns.map((c) => (
                      <td
                        key={c}
                        className={`px-4 py-3 align-middle ${MONEY_COLUMNS.has(c) ? 'text-right font-semibold tabular-nums' : ''} ${c === 'orderNumber' || c === 'poNumber' || c === 'invoiceNumber' || c === 'sku' || c === 'employeeId' ? 'font-mono text-xs' : ''}`}
                      >
                        <ReportCell column={c} value={row[c]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function SummaryChip({
  label,
  value,
  highlight,
  small,
}: {
  label: string
  value: string
  highlight?: boolean
  small?: boolean
}) {
  return (
    <div className={`rounded-xl border border-surface-container-low px-3 py-2 ${highlight ? 'bg-secondary-container/30' : 'bg-surface-container-low/40'}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-secondary">{label}</p>
      <p className={`font-semibold tabular-nums mt-0.5 ${small ? 'text-xs leading-snug' : 'text-base'}`}>{value}</p>
    </div>
  )
}

function ReportCell({ column, value }: { column: string; value: string | number | undefined }) {
  if (value === undefined || value === '') return <span className="text-secondary">—</span>

  if (STATUS_COLUMNS.has(column)) {
    return <StatusBadge status={String(value)} />
  }

  if (MONEY_COLUMNS.has(column)) {
    return <span>{formatCurrencyInr(Number(value))}</span>
  }

  if (DATE_COLUMNS.has(column)) {
    const raw = String(value)
    if (raw.includes('T')) return <span className="text-secondary text-xs">{formatDate(raw.slice(0, 10))}</span>
    return <span>{formatDate(raw)}</span>
  }

  if (column === 'customer' || column === 'name' || column === 'product') {
    return <span className="font-medium">{String(value)}</span>
  }

  return <span>{String(value)}</span>
}
