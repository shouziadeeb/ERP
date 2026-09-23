import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { PurchaseOrder } from '../types/order'

export async function getPurchaseOrders(query: {
  page?: number
  limit?: number
  search?: string
  status?: string
} = {}): Promise<PaginatedResult<PurchaseOrder>> {
  return fetchJson(`/api/purchase-orders${toQuery(query)}`)
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  try {
    return await fetchJson<PurchaseOrder>(`/api/purchase-orders/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}
