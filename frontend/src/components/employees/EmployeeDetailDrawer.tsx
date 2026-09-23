import type { EmployeeDetail } from '../../services/employeeService'
import { formatCurrencyInr } from '../../utils/format'
import { Icon } from '../Icon'
import { StatusBadge } from '../ui/StatusBadge'

interface EmployeeDetailDrawerProps {
  detail: EmployeeDetail | null
  loading: boolean
  onClose: () => void
}

export function EmployeeDetailDrawer({ detail, loading, onClose }: EmployeeDetailDrawerProps) {
  if (!detail && !loading) return null

  return (
    <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50" onClick={onClose}>
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[640px] bg-surface-container-lowest shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between border-b border-surface-container">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Employee Profile</h2>
            <p className="text-xs text-secondary mt-0.5">Workforce details and HR summary</p>
          </div>
          <button type="button" className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container" onClick={onClose} aria-label="Close">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {loading || !detail ? (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-8 bg-surface-container-low rounded-lg w-2/3" />
              <div className="h-24 bg-surface-container-low rounded-lg" />
              <div className="h-24 bg-surface-container-low rounded-lg" />
            </div>
          ) : (
            <>
              <section className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="person" className="text-[24px]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{detail.employee.fullName}</h3>
                  <p className="text-sm text-secondary">{detail.employee.designation} · {detail.employee.departmentName}</p>
                  <div className="mt-2"><StatusBadge status={detail.employee.status} /></div>
                </div>
              </section>

              <Section title="Contact">
                <InfoRow label="Email" value={detail.employee.email} />
                <InfoRow label="Phone" value={detail.employee.phone} />
                <InfoRow label="Location" value={`${detail.employee.city}, ${detail.employee.country}`} />
              </Section>

              <Section title="Employment">
                <InfoRow label="Employee ID" value={detail.employee.id} mono />
                <InfoRow label="Employment Type" value={detail.employee.employmentType} />
                <InfoRow label="Joining Date" value={detail.employee.joiningDate} />
                <InfoRow label="Manager" value={detail.manager?.fullName ?? '—'} />
              </Section>

              <Section title="Skills">
                <div className="flex flex-wrap gap-1">
                  {detail.employee.skills.map((skill) => (
                    <span key={skill} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{skill}</span>
                  ))}
                </div>
              </Section>

              <Section title="Attendance Summary (Sep 2026)">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Present" value={detail.attendanceSummary.present} />
                  <Metric label="Absent" value={detail.attendanceSummary.absent} />
                  <Metric label="Late" value={detail.attendanceSummary.late} />
                  <Metric label="On Leave" value={detail.attendanceSummary.onLeave} />
                </div>
              </Section>

              <Section title="Leave Summary">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Pending" value={detail.leaveSummary.pending} />
                  <Metric label="Approved" value={detail.leaveSummary.approved} />
                </div>
              </Section>

              {detail.payroll && (
                <Section title="Payroll (Sep 2026)">
                  <InfoRow label="Net Salary" value={formatCurrencyInr(detail.payroll.netSalary)} />
                  <InfoRow label="Status" value={detail.payroll.status} />
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-surface-container-low/50 p-4 flex flex-col gap-2">
      <h4 className="text-xs uppercase tracking-wider font-semibold text-secondary">{title}</h4>
      {children}
    </section>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-secondary">{label}</span>
      <span className={`font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-container-lowest px-3 py-2">
      <div className="text-xs text-secondary">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}
