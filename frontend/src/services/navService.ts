/** Sidebar badge counts (/api/nav-stats). */
import { fetchJson } from '../lib/http'

export async function getNavStats() {
  return fetchJson<{ pendingOrders: number; pendingLeaves: number }>('/api/nav-stats')
}
