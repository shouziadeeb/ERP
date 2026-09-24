/** Organization settings tabs; loads/saves via /api/settings (persisted in Postgres). */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import {
  Field,
  FieldGrid,
  ReadOnlyRow,
  SettingsSection,
  settingsInputClassName,
  ToggleRow,
} from '../components/settings/SettingsControls'
import { DEFAULT_APP_SETTINGS } from '../config/settingsDefaults'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { PageHeader } from '../components/ui/PageHeader'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import {
  getSettings,
  getSystemHealth,
  saveSettings,
  type AppSettings,
  type SettingsResponse,
} from '../services/settingsService'
import { formatDate } from '../utils/format'

type SettingsTab = 'general' | 'regional' | 'notifications' | 'security' | 'system'

const TABS: { id: SettingsTab; label: string; icon: string; caption: string }[] = [
  { id: 'general', label: 'Company', icon: 'corporate_fare', caption: 'Legal entity & contacts' },
  { id: 'regional', label: 'Regional', icon: 'language', caption: 'Currency & formats' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications', caption: 'Alerts & reminders' },
  { id: 'security', label: 'Security', icon: 'lock', caption: 'Access policy' },
  { id: 'system', label: 'System', icon: 'dns', caption: 'Environment' },
]

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'UTC']
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']
const FISCAL_MONTHS = ['January', 'April', 'July', 'October']

function toPayload(data: SettingsResponse): AppSettings {
  const { settingsUpdatedAt: _a, settingsUpdatedBy: _b, ...rest } = data
  return rest
}

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [baseline, setBaseline] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [health, setHealth] = useState<{ ok: boolean; database: boolean } | null>(null)

  const inputClass = settingsInputClassName()

  const dirty = useMemo(() => {
    if (!settings || !baseline) return false
    return JSON.stringify(toPayload(settings)) !== JSON.stringify(baseline)
  }, [settings, baseline])

  useEffect(() => {
    void getSettings()
      .then((data) => {
        setSettings(data)
        setBaseline(toPayload(data))
      })
      .catch(() => setError('Could not load settings.'))
    void getSystemHealth().then(setHealth).catch(() => setHealth({ ok: false, database: false }))
  }, [])

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function discardChanges() {
    if (baseline && settings) setSettings({ ...settings, ...baseline })
  }

  function restoreDefaults() {
    if (settings) setSettings({ ...settings, ...DEFAULT_APP_SETTINGS })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    const payload = toPayload(settings)
    if (!payload.companyName.trim() || !payload.supportEmail.trim() || !payload.taxId.trim()) {
      setError('Company name, tax ID, and support email are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await saveSettings(payload)
      setSettings(saved)
      setBaseline(toPayload(saved))
    } catch {
      setError('Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {settings?.settingsUpdatedAt && !dirty && (
        <span className="text-xs text-secondary hidden lg:inline mr-2">
          Last saved {formatDate(settings.settingsUpdatedAt.slice(0, 10))} by {settings.settingsUpdatedBy ?? 'Admin'}
        </span>
      )}
      {dirty && (
        <span className="text-xs font-semibold text-primary px-2 py-1 rounded-md bg-secondary-container/50">Unsaved changes</span>
      )}
      <button
        type="button"
        className="h-9 px-3 rounded-lg border border-surface-container-low text-sm font-semibold hover:bg-surface-container-low disabled:opacity-40"
        onClick={discardChanges}
        disabled={!dirty || saving}
      >
        Discard
      </button>
      <button
        type="submit"
        form="apex-settings-form"
        className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
        disabled={!dirty || saving}
      >
        <Icon name="save" className="text-[18px]" />
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )

  if (!settings) {
    return (
      <div className="px-6 py-6 max-w-[1280px] mx-auto w-full">
        <PageHeader breadcrumb={['System', 'Settings']} title="Workspace settings" subtitle="Loading…" />
        {error && <ErrorBanner message={error} />}
        {!error && <TableSkeleton rows={6} />}
      </div>
    )
  }

  return (
    <div className="px-6 py-6 flex flex-col gap-5 max-w-[1280px] mx-auto w-full">
      <PageHeader
        breadcrumb={['System', 'Settings']}
        title="Workspace settings"
        subtitle="Configure your tenant profile, compliance data, localization, and security controls for ApexERP."
        actions={headerActions}
      />

      {error && <ErrorBanner message={error} onRetry={() => void getSettings().then((d) => { setSettings(d); setBaseline(toPayload(d)) })} />}
      {settings.maintenanceMode && (
        <div className="rounded-xl border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-error font-medium flex items-center gap-2">
          <Icon name="construction" className="text-[18px]" />
          Maintenance mode is enabled — standard users will see a downtime notice.
        </div>
      )}

      <div className="rounded-2xl border border-surface-container-low bg-surface-container-lowest shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
        <form id="apex-settings-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[640px]">
            <aside className="bg-surface-container-low/40 border-b lg:border-b-0 lg:border-r border-surface-container-low p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary px-2 mb-2">Configuration</p>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
                {TABS.map((item) => {
                  const active = tab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`text-left shrink-0 lg:shrink px-3 py-2.5 rounded-xl transition-colors min-w-[140px] lg:min-w-0 lg:w-full ${
                        active ? 'bg-surface-container-lowest shadow-sm border border-surface-container-low' : 'hover:bg-surface-container-low/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name={item.icon} className={`text-[18px] ${active ? 'text-primary' : 'text-secondary'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-on-surface'}`}>{item.label}</p>
                          <p className="text-[11px] text-secondary hidden lg:block">{item.caption}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </nav>
              <div className="hidden lg:block mt-6 mx-2 p-3 rounded-xl bg-surface-container-low/60 border border-surface-container-low text-xs text-secondary leading-relaxed">
                Changes are stored in <span className="font-mono text-on-surface">app_meta</span> and apply tenant-wide after save.
              </div>
            </aside>

            <div className="p-6 lg:p-8 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/20">
              {tab === 'general' && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
                  <div className="flex flex-col gap-5">
                    <SettingsSection title="Organization profile" description="Legal and commercial identity used on documents and the application shell." icon="apartment">
                      <FieldGrid>
                        <Field label="Trade name" required hint="Short name in navigation and orders.">
                          <input className={inputClass} required value={settings.companyName} onChange={(e) => update({ companyName: e.target.value })} />
                        </Field>
                        <Field label="Legal entity name" required>
                          <input className={inputClass} value={settings.legalEntityName} onChange={(e) => update({ legalEntityName: e.target.value })} />
                        </Field>
                        <Field label="Branch / site" hint="Cost center or operating unit.">
                          <input className={inputClass} value={settings.siteName} onChange={(e) => update({ siteName: e.target.value })} />
                        </Field>
                        <Field label="Tax / GST ID" required hint="Printed on tax invoices (India GSTIN format).">
                          <input className={inputClass} value={settings.taxId} onChange={(e) => update({ taxId: e.target.value })} />
                        </Field>
                        <Field label="Support email" required fullWidth>
                          <input className={inputClass} type="email" required value={settings.supportEmail} onChange={(e) => update({ supportEmail: e.target.value })} />
                        </Field>
                        <Field label="Phone">
                          <input className={inputClass} value={settings.phone} onChange={(e) => update({ phone: e.target.value })} />
                        </Field>
                        <Field label="Website" fullWidth>
                          <input className={inputClass} value={settings.website} onChange={(e) => update({ website: e.target.value })} />
                        </Field>
                      </FieldGrid>
                    </SettingsSection>

                    <SettingsSection title="Registered address" description="Official address for compliance and purchase orders." icon="location_on">
                      <FieldGrid>
                        <Field label="Street / building" fullWidth>
                          <input className={inputClass} value={settings.addressLine} onChange={(e) => update({ addressLine: e.target.value })} />
                        </Field>
                        <Field label="City">
                          <input className={inputClass} value={settings.addressCity} onChange={(e) => update({ addressCity: e.target.value })} />
                        </Field>
                        <Field label="Country">
                          <input className={inputClass} value={settings.addressCountry} onChange={(e) => update({ addressCountry: e.target.value })} />
                        </Field>
                      </FieldGrid>
                    </SettingsSection>

                    <SettingsSection title="Reporting & display" description="Labels shown on dashboards and executive summaries." icon="monitoring">
                      <FieldGrid>
                        <Field label="Dashboard period label">
                          <input className={inputClass} value={settings.reportingMonthLabel} onChange={(e) => update({ reportingMonthLabel: e.target.value })} />
                        </Field>
                        <Field label="Signed-in display name">
                          <input className={inputClass} value={settings.sessionUserName} onChange={(e) => update({ sessionUserName: e.target.value })} />
                        </Field>
                        <Field label="Role title">
                          <input className={inputClass} value={settings.sessionUserRole} onChange={(e) => update({ sessionUserRole: e.target.value })} />
                        </Field>
                      </FieldGrid>
                    </SettingsSection>
                  </div>

                  <aside className="flex flex-col gap-4 xl:sticky xl:top-20">
                    <div className="rounded-xl border border-surface-container-low bg-surface-container-lowest p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-3">Live preview</p>
                      <div className="rounded-lg bg-surface-container-low p-3 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary">
                          <Icon name="corporate_fare" className="text-[18px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{settings.companyName || 'Company'}</p>
                          <p className="text-[11px] text-secondary truncate">{settings.siteName}</p>
                        </div>
                      </div>
                      <ul className="mt-3 text-xs text-secondary space-y-1.5">
                        <li className="flex justify-between gap-2"><span>Legal</span><span className="text-on-surface font-medium text-right truncate">{settings.legalEntityName}</span></li>
                        <li className="flex justify-between gap-2"><span>Tax ID</span><span className="font-mono text-on-surface">{settings.taxId}</span></li>
                        <li className="flex justify-between gap-2"><span>Currency</span><span className="text-on-surface">{settings.currency}</span></li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-surface-container-low bg-surface-container-lowest p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">Change audit</p>
                      {settings.settingsUpdatedAt ? (
                        <>
                          <ReadOnlyRow label="Last update" value={formatDate(settings.settingsUpdatedAt.slice(0, 10))} />
                          <ReadOnlyRow label="Updated by" value={settings.settingsUpdatedBy ?? '—'} />
                        </>
                      ) : (
                        <p className="text-xs text-secondary">No saved changes yet. Defaults are in use.</p>
                      )}
                      <button type="button" className="mt-3 text-xs font-semibold text-primary hover:underline" onClick={restoreDefaults}>
                        Reset all fields to factory defaults
                      </button>
                    </div>
                  </aside>
                </div>
              )}

              {tab === 'regional' && (
                <SettingsSection title="Regional & finance defaults" description="Applied to new documents unless overridden per customer or supplier." icon="payments">
                  <FieldGrid>
                    <Field label="Default currency">
                      <select className={inputClass} value={settings.currency} onChange={(e) => update({ currency: e.target.value })}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Timezone">
                      <select className={inputClass} value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })}>
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date format">
                      <select className={inputClass} value={settings.dateFormat} onChange={(e) => update({ dateFormat: e.target.value })}>
                        {DATE_FORMATS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fiscal year starts">
                      <select className={inputClass} value={settings.fiscalYearStartMonth} onChange={(e) => update({ fiscalYearStartMonth: e.target.value })}>
                        {FISCAL_MONTHS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </Field>
                  </FieldGrid>
                </SettingsSection>
              )}

              {tab === 'notifications' && (
                <SettingsSection title="Notification preferences" description="In-app signals today; email and SMS channels can be connected in a later release." icon="campaign">
                  <ToggleRow label="Low stock alerts" description="Dashboard inventory risk and notification badge." checked={settings.notifyLowStock} onChange={(v) => update({ notifyLowStock: v })} />
                  <ToggleRow label="Approval queue" description="Leave and workflow items awaiting manager action." checked={settings.notifyApprovals} onChange={(v) => update({ notifyApprovals: v })} />
                  <ToggleRow label="New sales orders" description="Highlight pending order volume in navigation." checked={settings.notifyNewOrders} onChange={(v) => update({ notifyNewOrders: v })} />
                  <ToggleRow label="Overdue invoices" description="Finance snapshot and collections follow-ups." checked={settings.notifyOverdueInvoices} onChange={(v) => update({ notifyOverdueInvoices: v })} />
                </SettingsSection>
              )}

              {tab === 'security' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <SettingsSection title="Access policy" description="Tenant-wide rules for authentication hardening." icon="admin_panel_settings">
                    <ToggleRow label="Strong password policy" description="Minimum complexity for administrator accounts." checked={settings.requireStrongPassword} onChange={(v) => update({ requireStrongPassword: v })} />
                    <Field label="Session timeout (minutes)" hint="Idle time before re-login is required.">
                      <input className={`${inputClass} max-w-[140px] mt-2`} type="number" min={30} max={1440} value={settings.sessionTimeoutMinutes} onChange={(e) => update({ sessionTimeoutMinutes: Number(e.target.value) })} />
                    </Field>
                    <ToggleRow label="Maintenance mode" description="Restrict access during upgrades (banner shown in app shell)." checked={settings.maintenanceMode} onChange={(v) => update({ maintenanceMode: v })} />
                  </SettingsSection>
                  <SettingsSection title="Active session" description="Current browser context (read-only)." icon="verified_user">
                    <ReadOnlyRow label="Authentication" value="Bearer token via /api/auth/login" />
                    <ReadOnlyRow label="Token storage" value="sessionStorage" />
                    <ReadOnlyRow label="User display" value={`${settings.sessionUserName} (${settings.sessionUserRole})`} />
                  </SettingsSection>
                </div>
              )}

              {tab === 'system' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <SettingsSection title="Runtime environment" description="Deployment targets and health." icon="cloud">
                    <ReadOnlyRow label="Product" value="ApexERP Enterprise Suite" />
                    <ReadOnlyRow label="Release track" value="v4.19-PROD" />
                    <ReadOnlyRow label="API gateway" value="/api → backend :3010" />
                    <ReadOnlyRow label="Database" value={health?.database ? 'Neon Postgres — connected' : 'Unavailable'} />
                    <ReadOnlyRow label="Health" value={health?.ok ? 'Operational' : 'Degraded'} />
                  </SettingsSection>
                  <SettingsSection title="Documentation" description="Integration and endpoint reference for your IT team." icon="menu_book">
                    <p className="text-sm text-secondary leading-relaxed">
                      All REST endpoints, auth headers, and module routes are documented in{' '}
                      <code className="text-xs px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface">docs/API.md</code>{' '}
                      at the repository root.
                    </p>
                    <ul className="mt-3 text-xs text-secondary list-disc pl-4 space-y-1">
                      <li>Use <span className="font-mono">APEX_API_TOKEN</span> in production</li>
                      <li>Run <span className="font-mono">npm run db:setup</span> for schema + seed</li>
                      <li>Settings persist in <span className="font-mono">app_meta</span> table</li>
                    </ul>
                  </SettingsSection>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
