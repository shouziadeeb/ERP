import type { FormEvent, ReactNode } from 'react'
import type { Department } from '../../types/employee'
import type { Employee, EmployeeStatus, EmploymentType } from '../../types/employee'
import { Icon } from '../Icon'

export interface EmployeeFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  city: string
  departmentId: string
  designation: string
  managerId: string
  employmentType: EmploymentType
  joiningDate: string
  status: EmployeeStatus
  skills: string
}

export interface EmployeeFormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  departmentId?: string
  designation?: string
  country?: string
  city?: string
  joiningDate?: string
  skills?: string
}

interface EmployeeFormDrawerProps {
  open: boolean
  editing: Employee | null
  form: EmployeeFormState
  errors: EmployeeFormErrors
  formError: string | null
  saving: boolean
  departments: Department[]
  onClose: () => void
  onChange: (field: keyof EmployeeFormState, value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function EmployeeFormDrawer({
  open,
  editing,
  form,
  errors,
  formError,
  saving,
  departments,
  onClose,
  onChange,
  onSubmit,
}: EmployeeFormDrawerProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[560px] bg-surface-container-lowest shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between border-b border-surface-container">
          <div>
            <h2 className="text-base font-semibold text-on-surface">
              {editing ? `Edit Employee: ${editing.fullName}` : 'Add Employee'}
            </h2>
            <p className="text-xs text-secondary mt-0.5">Workforce profile and employment details</p>
          </div>
          <button type="button" className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container" onClick={onClose} disabled={saving} aria-label="Close">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <form className="p-6 overflow-y-auto flex-1 flex flex-col gap-4" onSubmit={onSubmit}>
          {formError && (
            <div className="rounded-lg bg-error-container/50 border border-error-container text-on-error-container px-3 py-2 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name *" error={errors.firstName}>
              <input className="field-input" value={form.firstName} onChange={(e) => onChange('firstName', e.target.value)} disabled={saving} />
            </Field>
            <Field label="Last Name *" error={errors.lastName}>
              <input className="field-input" value={form.lastName} onChange={(e) => onChange('lastName', e.target.value)} disabled={saving} />
            </Field>
          </div>

          <Field label="Email *" error={errors.email}>
            <input type="email" className="field-input" value={form.email} onChange={(e) => onChange('email', e.target.value)} disabled={saving} />
          </Field>
          <Field label="Phone *" error={errors.phone}>
            <input className="field-input" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} disabled={saving} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Country *" error={errors.country}>
              <input className="field-input" value={form.country} onChange={(e) => onChange('country', e.target.value)} disabled={saving} />
            </Field>
            <Field label="City *" error={errors.city}>
              <input className="field-input" value={form.city} onChange={(e) => onChange('city', e.target.value)} disabled={saving} />
            </Field>
          </div>

          <Field label="Department *" error={errors.departmentId}>
            <select className="field-input" value={form.departmentId} onChange={(e) => onChange('departmentId', e.target.value)} disabled={saving}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Designation *" error={errors.designation}>
            <input className="field-input" value={form.designation} onChange={(e) => onChange('designation', e.target.value)} disabled={saving} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Employment Type">
              <select className="field-input" value={form.employmentType} onChange={(e) => onChange('employmentType', e.target.value)} disabled={saving}>
                {(['Full Time', 'Part Time', 'Contract', 'Intern'] as EmploymentType[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="field-input" value={form.status} onChange={(e) => onChange('status', e.target.value)} disabled={saving}>
                {(['Active', 'On Leave', 'Probation', 'Suspended', 'Inactive'] as EmployeeStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Joining Date *" error={errors.joiningDate}>
            <input type="date" className="field-input" value={form.joiningDate} onChange={(e) => onChange('joiningDate', e.target.value)} disabled={saving} />
          </Field>

          <Field label="Manager ID" hint="Optional, e.g. EMP-00002">
            <input className="field-input font-mono text-sm" value={form.managerId} onChange={(e) => onChange('managerId', e.target.value)} disabled={saving} placeholder="EMP-00002" />
          </Field>

          <Field label="Skills *" error={errors.skills} hint="Comma-separated">
            <textarea className="field-input min-h-[80px] resize-y" value={form.skills} onChange={(e) => onChange('skills', e.target.value)} disabled={saving} />
          </Field>
        </form>

        <div className="px-6 py-4 bg-surface-container-low flex justify-end gap-2 border-t border-surface-container">
          <button type="button" className="h-9 px-4 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-sm font-semibold disabled:opacity-60" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="h-9 px-6 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold disabled:opacity-60" disabled={saving} onClick={(e) => { e.currentTarget.closest('[role="dialog"]')?.querySelector('form')?.requestSubmit() }}>
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      {hint && <span className="text-xs text-secondary -mt-1">{hint}</span>}
      {children}
      {error && <span className="text-xs text-error">{error}</span>}
    </label>
  )
}
