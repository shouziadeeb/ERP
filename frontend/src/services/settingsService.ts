/** GET/PATCH /api/settings; dispatches SETTINGS_UPDATED_EVENT for AppShell refresh. */
import { fetchJson } from '../lib/http'

export interface AppSettings {
  companyName: string
  legalEntityName: string
  siteName: string
  taxId: string
  currency: string
  timezone: string
  dateFormat: string
  fiscalYearStartMonth: string
  supportEmail: string
  phone: string
  website: string
  addressLine: string
  addressCity: string
  addressCountry: string
  notifyLowStock: boolean
  notifyApprovals: boolean
  notifyNewOrders: boolean
  notifyOverdueInvoices: boolean
  sessionUserName: string
  sessionUserRole: string
  reportingMonthLabel: string
  requireStrongPassword: boolean
  sessionTimeoutMinutes: number
  maintenanceMode: boolean
}

export type SettingsResponse = AppSettings & {
  settingsUpdatedAt: string | null
  settingsUpdatedBy: string | null
}

export const SETTINGS_UPDATED_EVENT = 'apex-settings-updated'

export async function getSettings(): Promise<SettingsResponse> {
  return fetchJson('/api/settings')
}

export async function saveSettings(settings: AppSettings): Promise<SettingsResponse> {
  const saved = await fetchJson<SettingsResponse>('/api/settings', { method: 'PATCH', body: JSON.stringify(settings) })
  window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT))
  return saved
}

export async function getSystemHealth(): Promise<{ ok: boolean; database: boolean }> {
  return fetchJson('/api/health')
}
