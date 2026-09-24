/** Invoice list and detail from /api/invoices. */
import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { Invoice } from '../types/invoice'

export async function getInvoices(query: {
  page?: number
  limit?: number
  search?: string
  status?: string
} = {}): Promise<PaginatedResult<Invoice>> {
  return fetchJson(`/api/invoices${toQuery(query)}`)
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    return await fetchJson<Invoice>(`/api/invoices/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}
