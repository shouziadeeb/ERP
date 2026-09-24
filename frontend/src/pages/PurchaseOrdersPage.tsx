/** Read-only procurement PO list and detail (data from GET /api/purchase-orders). */
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
import { getPurchaseOrderById, getPurchaseOrders } from '../services/purchaseOrderService'
import type { PaginatedResult } from '../types/pagination'
import type { PurchaseOrder } from '../types/order'
import { formatCurrencyInr, formatDate } from '../utils/format'

export function PurchaseOrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('all')
  const [result, setResult] = useState<PaginatedResult<PurchaseOrder> | null>(null)
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await getPurchaseOrders({ page, limit: 25, search: debouncedSearch, status: statusFilter }))
    } catch {
      setError('Failed to load purchase orders.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { void load() }, [load])

  async function openDetail(id: string) {
    setSelected(await getPurchaseOrderById(id))
  }

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader breadcrumb={['Procurement', 'Purchase Orders']} title="Purchase Orders" subtitle="Track supplier POs, delivery dates, and approval status." />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap gap-2">
        <input className="h-9 px-3 rounded-lg bg-surface-container-low text-sm flex-1 min-w-[220px]" placeholder="Search PO or supplier..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <FilterSelect id="po-status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={[['all', 'Status: All'], ['Pending Approval', 'Pending Approval'], ['Approved', 'Approved'], ['Ordered', 'Ordered'], ['Received', 'Received'], ['Cancelled', 'Cancelled']]} />
      </div>
      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="shopping_cart" title="No purchase orders" description="Try different filters." />}
      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead><tr className="bg-surface-container-low text-xs uppercase text-secondary"><th className="px-3 py-2.5">PO Number</th><th className="px-3 py-2.5">Supplier</th><th className="px-3 py-2.5">Order Date</th><th className="px-3 py-2.5">Expected</th><th className="px-3 py-2.5 text-right">Total</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((po) => (
                  <tr key={po.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-mono text-xs">{po.poNumber}</td>
                    <td className="px-3 py-2.5">{po.supplierName}</td>
                    <td className="px-3 py-2.5">{formatDate(po.orderDate)}</td>
                    <td className="px-3 py-2.5">{formatDate(po.expectedDeliveryDate)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{formatCurrencyInr(po.total)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={po.status} /></td>
                    <td className="px-3 py-2.5 text-right"><button type="button" className="h-8 px-2 rounded-lg text-xs font-semibold bg-surface-container-low" onClick={() => void openDetail(po.id)}>Details</button></td>
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
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between gap-2">
              <h3 className="text-lg font-semibold">{selected.poNumber}</h3>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close"><Icon name="close" /></button>
            </div>
            <p className="text-sm text-secondary mt-1">{selected.supplierName}</p>
            <p className="text-sm mt-3 font-semibold">Total: {formatCurrencyInr(selected.total)}</p>
            <ul className="mt-4 text-sm flex flex-col gap-2">
              {selected.items?.map((item) => (
                <li key={item.productId} className="flex justify-between border-t border-surface-container-low pt-2">
                  <span>{item.productName} × {item.quantity}</span>
                  <span>{formatCurrencyInr(item.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
