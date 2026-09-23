import { fetchJson } from '../lib/http'

export async function updateLeaveStatus(id: string, status: 'Approved' | 'Rejected', approvedBy?: string) {
  return fetchJson(`/api/leaves/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, approvedBy: approvedBy ?? 'System Admin' }),
  })
}
