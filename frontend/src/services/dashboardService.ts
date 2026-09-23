import { fetchJson } from '../lib/http'
import type {
  DashboardActivity,
  DashboardApproval,
  DashboardCharts,
  DashboardSummary,
} from '../types/dashboard'
import type { InventoryRecord } from '../types/inventory'
import type { SalesOrder } from '../types/order'

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson('/api/dashboard/summary')
}

export async function getRecentActivities(): Promise<DashboardActivity[]> {
  return fetchJson('/api/dashboard/activities')
}

export async function getPendingApprovals(): Promise<DashboardApproval[]> {
  return fetchJson('/api/dashboard/approvals')
}

export async function getRecentOrdersForDashboard(): Promise<SalesOrder[]> {
  return fetchJson('/api/dashboard/recent-orders')
}

export async function getLowStockAlerts(limit = 6): Promise<InventoryRecord[]> {
  const rows = await fetchJson<InventoryRecord[]>('/api/dashboard/low-stock')
  return rows.slice(0, limit)
}

export async function getDashboardCharts(): Promise<DashboardCharts> {
  return fetchJson('/api/dashboard/charts')
}
