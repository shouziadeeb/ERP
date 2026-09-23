import type { ReactNode } from 'react'
import { Icon } from '../Icon'

export function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-surface-container-low bg-surface-container-lowest/80 p-5">
      <div className="flex items-start gap-3 mb-4 pb-3 border-b border-surface-container-low">
        {icon && (
          <span className="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center shrink-0 text-primary">
            <Icon name={icon} className="text-[20px]" />
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          {description && <p className="text-xs text-secondary mt-1 leading-relaxed max-w-2xl">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">{children}</div>
}

export function Field({
  label,
  hint,
  required,
  fullWidth,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  fullWidth?: boolean
  children: ReactNode
}) {
  return (
    <label className={`text-sm flex flex-col gap-1.5 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <span className="font-medium text-on-surface text-xs uppercase tracking-wide">
        {label}
        {required && <span className="text-error normal-case tracking-normal ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-secondary leading-snug">{hint}</span>}
    </label>
  )
}

export function settingsInputClassName() {
  return 'settings-input w-full max-w-none h-10 px-3 rounded-lg border border-surface-container-low bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-shadow'
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-surface-container-low last:border-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-on-surface">{label}</p>
        <p className="text-xs text-secondary mt-1 max-w-lg leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors mt-0.5 ${checked ? 'bg-primary' : 'bg-surface-container-high'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2.5 border-b border-surface-container-low last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</span>
      <span className="text-sm font-medium text-on-surface sm:text-right break-all">{value}</span>
    </div>
  )
}
