/** Inventory rows: list and PATCH quantity/reserved levels. */
import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { InventoryRecord, Warehouse } from '../types/inventory'
import type { SortOrder } from '../types/pagination'

export interface InventoryQuery {
  page?: number
  limit?: number
  search?: string
  warehouseId?: string
  status?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export async function getInventory(
  query: InventoryQuery = {},
): Promise<PaginatedResult<InventoryRecord>> {
  return fetchJson(`/api/inventory${toQuery(query)}`)
}

export async function createInventoryRecord(input: {
  productId: string
  warehouseId: string
  quantity: number
  reservedQuantity?: number
  reorderLevel?: number
}): Promise<InventoryRecord> {
  return fetchJson('/api/inventory', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateInventoryRecord(
  id: string,
  patch: Partial<Pick<InventoryRecord, 'quantity' | 'reservedQuantity' | 'reorderLevel'>>,
): Promise<InventoryRecord> {
  return fetchJson(`/api/inventory/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function getWarehouseOptions(): Promise<Warehouse[]> {
  return fetchJson('/api/warehouses')
}
