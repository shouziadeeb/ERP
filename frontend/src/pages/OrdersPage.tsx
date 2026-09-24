/** Sales orders: filters, create order with line items, status and payment updates. */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FilterSelect } from '../components/ui/FilterSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getCustomers } from '../services/customerService'
import { createOrder, getOrderById, getOrders, updateOrderPaymentStatus, updateOrderStatus } from '../services/orderService'
import { getProducts } from '../services/productService'
import type { Customer } from '../types/customer'
import type { PaginatedResult } from '../types/pagination'
import type { OrderStatus, PaymentStatus, SalesOrder } from '../types/order'
import type { ProductWithStock } from '../services/productService'
import { formatCurrencyInr, formatDate } from '../utils/format'

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [result, setResult] = useState<PaginatedResult<SalesOrder> | null>(null)
  const [selected, setSelected] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [newOrder, setNewOrder] = useState({ customerId: '', productId: '', quantity: '1' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await getOrders({ page, limit: 25, search: debouncedSearch, status: statusFilter, paymentStatus: paymentFilter, sortBy: 'orderDate', sortOrder: 'desc' }))
    } catch {
      setError('Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter, paymentFilter])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!createOpen) return
    void getCustomers({ limit: 100, page: 1 }).then((r) => setCustomers(r.data))
    void getProducts({ limit: 100, page: 1 }).then((r) => setProducts(r.data))
  }, [createOpen])

  async function openOrder(id: string) {
    setSelected(await getOrderById(id))
  }

  async function handleCreateOrder(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    try {
      await createOrder({
        customerId: newOrder.customerId,
        items: [{ productId: newOrder.productId, quantity: Number(newOrder.quantity) }],
      })
      setCreateOpen(false)
      setNewOrder({ customerId: '', productId: '', quantity: '1' })
      await load()
    } catch {
      setError('Could not create order.')
    } finally {
      setCreating(false)
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    const updated = await updateOrderStatus(id, status)
    setSelected(updated)
    await load()
  }

  async function changePayment(id: string, paymentStatus: PaymentStatus) {
    const updated = await updateOrderPaymentStatus(id, paymentStatus)
    setSelected(updated)
    await load()
  }

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader
        breadcrumb={['Sales', 'Orders']}
        title="Sales Orders"
        subtitle="Monitor customer orders, fulfillment status, and payment collection."
        actions={
          <button type="button" className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold" onClick={() => setCreateOpen(true)}>
            Create Order
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap gap-2">
        <input className="h-9 px-3 rounded-lg bg-surface-container-low text-sm flex-1 min-w-[220px]" placeholder="Search order number or customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <FilterSelect id="ord-status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={[['all', 'Order: All'], ['Pending', 'Pending'], ['Processing', 'Processing'], ['Shipped', 'Shipped'], ['Delivered', 'Delivered'], ['Cancelled', 'Cancelled']]} />
        <FilterSelect id="pay-status" value={paymentFilter} onChange={(v) => { setPaymentFilter(v); setPage(1) }} options={[['all', 'Payment: All'], ['Paid', 'Paid'], ['Pending', 'Pending'], ['Partially Paid', 'Partially Paid'], ['Failed', 'Failed']]} />
      </div>
      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="local_shipping" title="No orders found" description="Try broadening search or create a new order." />}
      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead><tr className="bg-surface-container-low text-xs uppercase text-secondary"><th className="px-3 py-2.5">Order Number</th><th className="px-3 py-2.5">Customer</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5 text-right">Items</th><th className="px-3 py-2.5 text-right">Total</th><th className="px-3 py-2.5">Payment</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-mono text-xs">{o.orderNumber}</td>
                    <td className="px-3 py-2.5">{o.customerName}</td>
                    <td className="px-3 py-2.5">{formatDate(o.orderDate)}</td>
                    <td className="px-3 py-2.5 text-right">{o.items.length}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{formatCurrencyInr(o.total)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={o.paymentStatus} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="px-3 py-2.5 text-right"><button type="button" className="h-8 px-2 rounded-lg text-xs font-semibold bg-surface-container-low" onClick={() => void openOrder(o.id)}>Details</button></td>
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
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selected.orderNumber}</h3>
                <p className="text-sm text-secondary">{selected.customerName}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close"><Icon name="close" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mt-4">
              <div>Subtotal: {formatCurrencyInr(selected.subtotal)}</div>
              <div>Tax: {formatCurrencyInr(selected.tax)}</div>
              <div>Discount: {formatCurrencyInr(selected.discount)}</div>
              <div className="font-semibold">Total: {formatCurrencyInr(selected.total)}</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 text-sm">
              <label className="flex flex-col gap-1">Order status
                <select className="field-input" value={selected.status} onChange={(e) => void changeStatus(selected.id, e.target.value as OrderStatus)}>
                  {['Pending', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">Payment
                <select className="field-input" value={selected.paymentStatus} onChange={(e) => void changePayment(selected.id, e.target.value as PaymentStatus)}>
                  {['Pending', 'Paid', 'Partially Paid', 'Failed'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <table className="w-full text-sm mt-4">
              <thead><tr className="text-xs text-secondary uppercase"><th className="text-left py-1">Product</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Unit</th><th className="text-right py-1">Line Total</th></tr></thead>
              <tbody>{selected.items.map((item) => (<tr key={item.productId} className="border-t border-surface-container-low"><td className="py-2">{item.productName}</td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">{formatCurrencyInr(item.unitPrice)}</td><td className="py-2 text-right">{formatCurrencyInr(item.total)}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 flex justify-end" onClick={() => !creating && setCreateOpen(false)}>
          <form className="w-full max-w-md h-full bg-surface-container-lowest p-6 flex flex-col gap-3" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateOrder}>
            <h3 className="text-lg font-semibold">New Sales Order</h3>
            <label className="text-sm flex flex-col gap-1">Customer
              <select className="field-input" required value={newOrder.customerId} onChange={(e) => setNewOrder({ ...newOrder, customerId: e.target.value })}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </label>
            <label className="text-sm flex flex-col gap-1">Product
              <select className="field-input" required value={newOrder.productId} onChange={(e) => setNewOrder({ ...newOrder, productId: e.target.value })}>
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </label>
            <label className="text-sm flex flex-col gap-1">Quantity
              <input className="field-input" type="number" min={1} required value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })} />
            </label>
            <button type="submit" disabled={creating} className="h-10 rounded-lg bg-primary text-on-primary font-semibold mt-2">{creating ? 'Creating…' : 'Create Order'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
