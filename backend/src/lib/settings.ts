/** Organization settings stored as key/value rows in app_meta (merged with defaults on read). */
import { prisma } from '../db/index.js'

export const DEFAULT_SETTINGS = {
  companyName: 'Global Supply Ltd',
  legalEntityName: 'Global Supply Limited',
  siteName: 'HQ Operations',
  taxId: '27AABCG1234F1Z5',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  fiscalYearStartMonth: 'April',
  supportEmail: 'ops@globalsupply.com',
  phone: '+91-22-4000-1200',
  website: 'https://globalsupply.com',
  addressLine: '501 Trade Tower, Bandra Kurla Complex',
  addressCity: 'Mumbai',
  addressCountry: 'India',
  notifyLowStock: true,
  notifyApprovals: true,
  notifyNewOrders: true,
  notifyOverdueInvoices: true,
  sessionUserName: 'Alex Mercer',
  sessionUserRole: 'Lead Controller',
  reportingMonthLabel: 'September 2026',
  requireStrongPassword: true,
  sessionTimeoutMinutes: 480,
  maintenanceMode: false,
}

export type AppSettings = typeof DEFAULT_SETTINGS

export type SettingsResponse = AppSettings & {
  settingsUpdatedAt: string | null
  settingsUpdatedBy: string | null
}

const BOOLEAN_KEYS = new Set([
  'notifyLowStock',
  'notifyApprovals',
  'notifyNewOrders',
  'notifyOverdueInvoices',
  'requireStrongPassword',
  'maintenanceMode',
])

const NUMBER_KEYS = new Set(['sessionTimeoutMinutes'])

function parseValue(key: keyof AppSettings, raw: string): AppSettings[keyof AppSettings] {
  if (BOOLEAN_KEYS.has(key)) return (raw === 'true') as AppSettings[keyof AppSettings]
  if (NUMBER_KEYS.has(key)) return Number(raw) as AppSettings[keyof AppSettings]
  return raw as AppSettings[keyof AppSettings]
}

export async function readSettings(): Promise<SettingsResponse> {
  const rows = await prisma.appMeta.findMany()
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const out = { ...DEFAULT_SETTINGS }

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    const raw = map.get(key)
    if (raw !== undefined) out[key] = parseValue(key, raw) as never
  }

  return {
    ...out,
    settingsUpdatedAt: map.get('settingsUpdatedAt') ?? null,
    settingsUpdatedBy: map.get('settingsUpdatedBy') ?? null,
  }
}

/** Upsert each changed key; Prisma `upsert` is one round-trip per key (same pattern as before). */
export async function saveSettings(patch: Partial<AppSettings>): Promise<SettingsResponse> {
  const allowed = patch as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (allowed[key] === undefined) continue
    const value = allowed[key]
    const text = typeof value === 'boolean' || typeof value === 'number' ? String(value) : String(value)
    await prisma.appMeta.upsert({
      where: { key },
      create: { key, value: text },
      update: { value: text },
    })
  }

  const now = new Date().toISOString()
  const by = String(patch.sessionUserName ?? 'System Admin')
  await prisma.appMeta.upsert({
    where: { key: 'settingsUpdatedAt' },
    create: { key: 'settingsUpdatedAt', value: now },
    update: { value: now },
  })
  await prisma.appMeta.upsert({
    where: { key: 'settingsUpdatedBy' },
    create: { key: 'settingsUpdatedBy', value: by },
    update: { value: by },
  })

  return readSettings()
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await prisma.appMeta.findUnique({ where: { key } })
  return row?.value ?? null
}
