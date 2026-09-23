import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FilterSelect } from '../components/ui/FilterSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getInventory, getWarehouseOptions, updateInventoryRecord } from '../services/inventoryService'
import type { InventoryRecord, Warehouse } from '../types/inventory'
import type { PaginatedResult } from '../types/pagination'
import { formatDate } from '../utils/format'

export function InventoryPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [result, setResult] = useState<PaginatedResult<InventoryRecord> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustRow, setAdjustRow] = useState<InventoryRecord | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await getInventory({ page, limit: 25, search: debouncedSearch, warehouseId: warehouseFilter, status: statusFilter, sortBy: 'productName' }))
    } catch {
      setError('Failed to load inventory records.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, warehouseFilter, statusFilter])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void getWarehouseOptions().then(setWarehouses) }, [])

  async function saveAdjust(event: FormEvent) {
    event.preventDefault()
    if (!adjustRow) return
    setSaving(true)
    try {
      await updateInventoryRecord(adjustRow.id, { quantity: Number(adjustQty) })
      setAdjustRow(null)
      await load()
    } catch {
      setError('Could not update stock.')
    } finally {
      setSaving(false)
    }
  }

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader breadcrumb={['Operations', 'Inventory']} title="Inventory Management" subtitle="Track warehouse stock levels, reservations, and replenishment thresholds." />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap gap-2">
        <input className="h-9 px-3 rounded-lg bg-surface-container-low text-sm flex-1 min-w-[220px]" placeholder="Search product, SKU, warehouse..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <FilterSelect id="inv-wh" value={warehouseFilter} onChange={(v) => { setWarehouseFilter(v); setPage(1) }} options={[['all', 'Warehouse: All'], ...warehouses.map((w) => [w.id, w.name] as [string, string])]} />
        <FilterSelect id="inv-status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={[['all', 'Status: All'], ['In Stock', 'In Stock'], ['Low Stock', 'Low Stock'], ['Out of Stock', 'Out of Stock'], ['Overstocked', 'Overstocked']]} />
      </div>
      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="warehouse" title="No inventory records found" description="Adjust filters to view stock positions." />}
      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1050px]">
              <thead><tr className="bg-surface-container-low text-xs uppercase text-secondary"><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">SKU</th><th className="px-3 py-2.5">Warehouse</th><th className="px-3 py-2.5 text-right">Qty</th><th className="px-3 py-2.5 text-right">Reserved</th><th className="px-3 py-2.5 text-right">Available</th><th className="px-3 py-2.5 text-right">Reorder</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Updated</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-semibold">{row.productName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{row.sku}</td>
                    <td className="px-3 py-2.5">{row.warehouseName}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.quantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.reservedQuantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.availableQuantity}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{row.reorderLevel}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-2.5 text-secondary text-xs">{formatDate(row.lastUpdated.slice(0, 10))}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" className="h-8 px-2 rounded-lg text-xs font-semibold bg-surface-container-low" onClick={() => { setAdjustRow(row); setAdjustQty(String(row.quantity)) }}>Adjust</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={result.pagination} onPageChange={setPage} />
        </div>
      )}

      {adjustRow && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 flex items-center justify-center p-4" onClick={() => !saving && setAdjustRow(null)}>
          <form className="w-full max-w-sm bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-3" onClick={(e) => e.stopPropagation()} onSubmit={saveAdjust}>
            <h3 className="font-semibold">Adjust stock</h3>
            <p className="text-sm text-secondary">{adjustRow.productName} · {adjustRow.warehouseName}</p>
            <label className="text-sm flex flex-col gap-1">On-hand quantity
              <input className="field-input" type="number" min={0} required value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
            </label>
            <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary text-on-primary font-semibold">{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
