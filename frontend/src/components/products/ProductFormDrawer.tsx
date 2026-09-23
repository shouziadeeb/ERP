import type { FormEvent } from 'react'
import { Icon } from '../Icon'
import type { ProductCategory } from '../../types/product'
import type { Supplier } from '../../types/supplier'

export interface ProductFormState {
  sku: string
  name: string
  categoryId: string
  brand: string
  costPrice: string
  sellingPrice: string
  supplierId: string
  reorderLevel: string
}

interface ProductFormDrawerProps {
  open: boolean
  categories: ProductCategory[]
  suppliers: Supplier[]
  form: ProductFormState
  saving: boolean
  error: string | null
  onClose: () => void
  onChange: (field: keyof ProductFormState, value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function ProductFormDrawer({
  open,
  categories,
  suppliers,
  form,
  saving,
  error,
  onClose,
  onChange,
  onSubmit,
}: ProductFormDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-inverse-surface/40 z-50" onClick={saving ? undefined : onClose}>
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-surface-container-lowest shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add Product</h2>
          <button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <form className="flex flex-col gap-3 overflow-y-auto" onSubmit={onSubmit}>
          <input className="field-input" placeholder="SKU" value={form.sku} onChange={(e) => onChange('sku', e.target.value)} required />
          <input className="field-input" placeholder="Product name" value={form.name} onChange={(e) => onChange('name', e.target.value)} required />
          <input className="field-input" placeholder="Brand" value={form.brand} onChange={(e) => onChange('brand', e.target.value)} required />
          <select className="field-input" value={form.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} required>
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="field-input" value={form.supplierId} onChange={(e) => onChange('supplierId', e.target.value)} required>
            <option value="">Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.companyName}</option>
            ))}
          </select>
          <input className="field-input" type="number" placeholder="Cost price" value={form.costPrice} onChange={(e) => onChange('costPrice', e.target.value)} required />
          <input className="field-input" type="number" placeholder="Selling price" value={form.sellingPrice} onChange={(e) => onChange('sellingPrice', e.target.value)} required />
          <input className="field-input" type="number" placeholder="Reorder level" value={form.reorderLevel} onChange={(e) => onChange('reorderLevel', e.target.value)} required />
          <button type="submit" className="h-9 rounded-lg bg-primary text-on-primary font-semibold" disabled={saving}>
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </form>
      </div>
    </div>
  )
}
