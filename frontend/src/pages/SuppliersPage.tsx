import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { createSupplier, getSuppliersPage } from '../services/supplierService'
import type { PaginatedResult } from '../types/pagination'
import type { Supplier } from '../types/supplier'

const emptyForm = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  country: 'India',
  city: '',
  paymentTerms: 'Net 30',
}

export function SuppliersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [result, setResult] = useState<PaginatedResult<Supplier> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await getSuppliersPage({ page, limit: 25, search: debouncedSearch }))
    } catch {
      setError('Failed to load suppliers.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { void load() }, [load])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await createSupplier(form)
      setDrawerOpen(false)
      setForm(emptyForm)
      await load()
    } catch {
      setError('Could not save supplier.')
    } finally {
      setSaving(false)
    }
  }

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader
        breadcrumb={['Procurement', 'Suppliers']}
        title="Supplier Management"
        subtitle="Vendor master data for purchasing and product sourcing."
        actions={
          <button type="button" className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold" onClick={() => setDrawerOpen(true)}>
            Add Supplier
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <input className="h-9 px-3 rounded-lg bg-surface-container-low text-sm w-full max-w-md" placeholder="Search supplier..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="local_shipping" title="No suppliers found" description="Add a supplier or change search." />}
      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead><tr className="bg-surface-container-low text-xs uppercase text-secondary"><th className="px-3 py-2.5">Code</th><th className="px-3 py-2.5">Company</th><th className="px-3 py-2.5">Contact</th><th className="px-3 py-2.5">Location</th><th className="px-3 py-2.5">Terms</th><th className="px-3 py-2.5">Status</th></tr></thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-mono text-xs">{s.supplierCode}</td>
                    <td className="px-3 py-2.5 font-semibold">{s.companyName}</td>
                    <td className="px-3 py-2.5">{s.contactPerson}</td>
                    <td className="px-3 py-2.5">{s.city}, {s.country}</td>
                    <td className="px-3 py-2.5">{s.paymentTerms}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={result.pagination} onPageChange={setPage} />
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 flex justify-end" onClick={() => !saving && setDrawerOpen(false)}>
          <form className="w-full max-w-md h-full bg-surface-container-lowest p-6 flex flex-col gap-3 overflow-y-auto" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h3 className="text-lg font-semibold">New Supplier</h3>
            {(['companyName', 'contactPerson', 'email', 'phone', 'city', 'country', 'paymentTerms'] as const).map((field) => (
              <label key={field} className="text-sm flex flex-col gap-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}
                <input className="field-input" required value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
              </label>
            ))}
            <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary text-on-primary font-semibold mt-2">{saving ? 'Saving…' : 'Save Supplier'}</button>
          </form>
        </div>
      )}
    </div>
  )
}
