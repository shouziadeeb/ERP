import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FilterSelect } from '../components/ui/FilterSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getInvoiceById, getInvoices } from '../services/invoiceService'
import type { Invoice } from '../types/invoice'
import type { PaginatedResult } from '../types/pagination'
import { formatCurrencyInr, formatDate } from '../utils/format'

export function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('all')
  const [result, setResult] = useState<PaginatedResult<Invoice> | null>(null)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await getInvoices({ page, limit: 25, search: debouncedSearch, status: statusFilter }))
    } catch {
      setError('Failed to load invoices.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { void load() }, [load])

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader breadcrumb={['Finance', 'Invoices']} title="Accounts Receivable" subtitle="Customer invoices, payments, and overdue balances." />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap gap-2">
        <input className="h-9 px-3 rounded-lg bg-surface-container-low text-sm flex-1 min-w-[220px]" placeholder="Search invoice, customer, order..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <FilterSelect id="inv-status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={[['all', 'Status: All'], ['Sent', 'Sent'], ['Paid', 'Paid'], ['Partially Paid', 'Partially Paid'], ['Overdue', 'Overdue'], ['Draft', 'Draft']]} />
      </div>
      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="receipt_long" title="No invoices found" description="Adjust filters." />}
      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead><tr className="bg-surface-container-low text-xs uppercase text-secondary"><th className="px-3 py-2.5">Invoice</th><th className="px-3 py-2.5">Customer</th><th className="px-3 py-2.5">Order</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Due</th><th className="px-3 py-2.5 text-right">Total</th><th className="px-3 py-2.5 text-right">Due Amt</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2.5">{inv.customerName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{inv.orderNumber}</td>
                    <td className="px-3 py-2.5">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-3 py-2.5">{formatDate(inv.dueDate)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrencyInr(inv.total)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{formatCurrencyInr(inv.amountDue)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={inv.status} /></td>
                    <td className="px-3 py-2.5 text-right"><button type="button" className="h-8 px-2 rounded-lg text-xs font-semibold bg-surface-container-low" onClick={() => void getInvoiceById(inv.id).then(setSelected)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={result.pagination} onPageChange={setPage} />
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-inverse-surface/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between"><h3 className="text-lg font-semibold">{selected.invoiceNumber}</h3><button type="button" onClick={() => setSelected(null)}><Icon name="close" /></button></div>
            <p className="text-sm text-secondary">{selected.customerName}</p>
            <div className="grid grid-cols-2 gap-2 text-sm mt-4">
              <div>Paid: {formatCurrencyInr(selected.amountPaid)}</div>
              <div>Due: {formatCurrencyInr(selected.amountDue)}</div>
              <div className="col-span-2 font-semibold">Total: {formatCurrencyInr(selected.total)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
