import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ProductFormDrawer, type ProductFormState } from '../components/products/ProductFormDrawer'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FilterSelect } from '../components/ui/FilterSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { createProduct, deleteProduct, getCategoryOptions, getProducts, type ProductWithStock } from '../services/productService'
import { getSuppliers } from '../services/supplierService'
import type { ProductCategory } from '../types/product'
import type { Supplier } from '../types/supplier'
import type { PaginatedResult } from '../types/pagination'
import { formatCurrencyInr } from '../utils/format'

const emptyProductForm: ProductFormState = {
  sku: '',
  name: '',
  categoryId: '',
  brand: '',
  costPrice: '',
  sellingPrice: '',
  supplierId: '',
  reorderLevel: '10',
}

export function ProductsPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyProductForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [result, setResult] = useState<PaginatedResult<ProductWithStock> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await getProducts({ page, limit: 25, search: debouncedSearch, categoryId: categoryFilter, status: statusFilter, stock: stockFilter, sortBy: 'name' }))
    } catch {
      setError('Failed to load products.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, categoryFilter, statusFilter, stockFilter])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    void getCategoryOptions().then(setCategories)
    void getSuppliers().then(setSuppliers)
  }, [])

  async function handleCreateProduct(event: FormEvent) {
    event.preventDefault()
    const category = categories.find((c) => c.id === form.categoryId)
    if (!category) {
      setFormError('Pick a category')
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      await createProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        categoryId: category.id,
        categoryName: category.name,
        brand: form.brand.trim(),
        unit: 'Piece',
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        taxRate: 18,
        status: 'Active',
        supplierId: form.supplierId,
        reorderLevel: Number(form.reorderLevel),
      })
      setDrawerOpen(false)
      setForm(emptyProductForm)
      await load()
    } catch {
      setFormError('Could not save product')
    } finally {
      setSaving(false)
    }
  }

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader breadcrumb={['Inventory', 'Products']} title="Product Management" subtitle="Manage catalog SKUs, pricing, brands, and stock availability." actions={<button type="button" className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold flex items-center gap-1" onClick={() => setDrawerOpen(true)}><Icon name="add" className="text-[18px]" /> Add Product</button>} />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap gap-2">
        <input className="h-9 px-3 rounded-lg bg-surface-container-low text-sm flex-1 min-w-[220px]" placeholder="Search name, SKU, brand..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <FilterSelect id="prod-cat" value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPage(1) }} options={[['all', 'Category: All'], ...categories.map((c) => [c.id, c.name] as [string, string])]} />
        <FilterSelect id="prod-status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={[['all', 'Status: All'], ['Active', 'Active'], ['Inactive', 'Inactive'], ['Discontinued', 'Discontinued']]} />
        <FilterSelect id="prod-stock" value={stockFilter} onChange={(v) => { setStockFilter(v); setPage(1) }} options={[['all', 'Stock: All'], ['in_stock', 'In Stock'], ['low_stock', 'Low Stock'], ['out_of_stock', 'Out of Stock']]} />
      </div>
      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="inventory_2" title="No products match your filters" description="Try adjusting search or filters." />}
      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead><tr className="bg-surface-container-low text-xs uppercase text-secondary"><th className="px-3 py-2.5">SKU</th><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Brand</th><th className="px-3 py-2.5 text-right">Cost</th><th className="px-3 py-2.5 text-right">Selling</th><th className="px-3 py-2.5 text-right">Stock</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-mono text-xs text-primary">{p.sku}</td>
                    <td className="px-3 py-2.5 font-semibold">{p.name}</td>
                    <td className="px-3 py-2.5">{p.categoryName}</td>
                    <td className="px-3 py-2.5">{p.brand}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrencyInr(p.costPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatCurrencyInr(p.sellingPrice)}</td>
                    <td className="px-3 py-2.5 text-right">{p.stockAvailable} <span className="text-xs text-secondary">({p.stockStatus})</span></td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-3 py-2.5 text-right"><button type="button" className="w-8 h-8 rounded-lg hover:bg-error-container inline-flex items-center justify-center" onClick={() => void deleteProduct(p.id).then(load)} aria-label="Delete"><Icon name="delete" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={result.pagination} onPageChange={setPage} />
        </div>
      )}

      <ProductFormDrawer
        open={drawerOpen}
        categories={categories}
        suppliers={suppliers}
        form={form}
        saving={saving}
        error={formError}
        onClose={() => !saving && setDrawerOpen(false)}
        onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleCreateProduct}
      />
    </div>
  )
}
