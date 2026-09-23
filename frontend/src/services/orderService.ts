import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { SortOrder } from '../types/pagination'
import type { OrderStatus, PaymentStatus, SalesOrder } from '../types/order'

export interface OrderQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  paymentStatus?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export async function getOrders(query: OrderQuery = {}): Promise<PaginatedResult<SalesOrder>> {
  return fetchJson(`/api/orders${toQuery(query)}`)
}

export async function getOrderById(id: string): Promise<SalesOrder | null> {
  try {
    return await fetchJson<SalesOrder>(`/api/orders/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function createOrder(input: {
  customerId: string
  orderDate?: string
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  discount?: number
  items: Array<{ productId: string; quantity: number }>
}): Promise<SalesOrder> {
  return fetchJson('/api/orders', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<SalesOrder> {
  return fetchJson(`/api/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateOrderPaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
): Promise<SalesOrder> {
  return fetchJson(`/api/orders/${encodeURIComponent(id)}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentStatus }),
  })
}

export async function getRecentOrders(limit = 8): Promise<SalesOrder[]> {
  const result = await getOrders({ limit, page: 1, sortBy: 'orderDate', sortOrder: 'desc' })
  return result.data
}
