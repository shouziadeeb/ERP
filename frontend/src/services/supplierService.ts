import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { Supplier } from '../types/supplier'

export async function getSuppliers(): Promise<Supplier[]> {
  return fetchJson('/api/suppliers?all=1')
}

export async function getSuppliersPage(query: {
  page?: number
  limit?: number
  search?: string
}): Promise<PaginatedResult<Supplier>> {
  return fetchJson(`/api/suppliers${toQuery(query)}`)
}

export async function createSupplier(input: {
  companyName: string
  contactPerson: string
  email: string
  phone: string
  country: string
  city: string
  status?: string
  paymentTerms?: string
}): Promise<Supplier> {
  return fetchJson('/api/suppliers', { method: 'POST', body: JSON.stringify(input) })
}
