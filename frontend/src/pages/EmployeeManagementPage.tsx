/**
 * HR module: paginated employee table (100k+), filters, CRUD drawers, delete confirm modal.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { DeleteEmployeeModal } from '../components/employees/DeleteEmployeeModal'
import { EmployeeDetailDrawer } from '../components/employees/EmployeeDetailDrawer'
import {
  EmployeeFormDrawer,
  type EmployeeFormErrors,
  type EmployeeFormState,
} from '../components/employees/EmployeeFormDrawer'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FilterSelect } from '../components/ui/FilterSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { EmployeeTablePagination } from '../components/ui/EmployeeTablePagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  createEmployee,
  deleteEmployee,
  getDepartmentOptions,
  getEmployeeDetail,
  getEmployees,
  updateEmployee,
  type EmployeeDetail,
} from '../services/employeeService'
import { getDashboardSummary } from '../services/dashboardService'
import type { Department, Employee } from '../types/employee'
import type { PaginatedResult } from '../types/pagination'
import { formatDate } from '../utils/format'

const emptyForm: EmployeeFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: 'India',
  city: '',
  departmentId: '',
  designation: '',
  managerId: '',
  employmentType: 'Full Time',
  joiningDate: '',
  status: 'Active',
  skills: '',
}

function parseSkills(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function EmployeeManagementPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [result, setResult] = useState<PaginatedResult<Employee> | null>(null)
  const [summary, setSummary] = useState({ total: 0, active: 0, newMonth: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<EmployeeFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Refetch when page or debounced filters change (search waits 300ms after typing).
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [employees, dash] = await Promise.all([
        getEmployees({
          page,
          limit: 25,
          search: debouncedSearch,
          departmentId: departmentFilter,
          status: statusFilter,
          sortBy: 'fullName',
          sortOrder: 'asc',
        }),
        getDashboardSummary(),
      ])
      setResult(employees)
      setSummary({
        total: dash.totalEmployees,
        active: dash.activeEmployees,
        newMonth: dash.newEmployeesThisMonth,
      })
    } catch {
      setError('Failed to load employees. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, departmentFilter, statusFilter])

  function resetFiltersAndList() {
    setSearch('')
    setDepartmentFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, departmentFilter, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void getDepartmentOptions().then(setDepartments)
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(employee: Employee) {
    setEditing(employee)
    setForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      country: employee.country,
      city: employee.city,
      departmentId: employee.departmentId,
      designation: employee.designation,
      managerId: employee.managerId ?? '',
      employmentType: employee.employmentType,
      joiningDate: employee.joiningDate,
      status: employee.status,
      skills: employee.skills.join(', '),
    })
    setFormOpen(true)
  }

  async function openDetail(employee: Employee) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      setDetail(await getEmployeeDetail(employee.id))
    } finally {
      setDetailLoading(false)
    }
  }

  function validate(): EmployeeFormErrors {
    const next: EmployeeFormErrors = {}
    if (!form.firstName.trim()) next.firstName = 'Required'
    if (!form.lastName.trim()) next.lastName = 'Required'
    if (!form.email.trim()) next.email = 'Required'
    if (!form.phone.trim()) next.phone = 'Required'
    if (!form.departmentId) next.departmentId = 'Required'
    if (!form.designation.trim()) next.designation = 'Required'
    if (!form.country.trim()) next.country = 'Required'
    if (!form.city.trim()) next.city = 'Required'
    if (!form.joiningDate) next.joiningDate = 'Required'
    if (parseSkills(form.skills).length === 0) next.skills = 'Add at least one skill'
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    const department = departments.find((d) => d.id === form.departmentId)
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      departmentId: form.departmentId,
      departmentName: department?.name ?? '',
      designationId: editing?.designationId ?? 'DES-004',
      designation: form.designation.trim(),
      managerId: form.managerId.trim() || null,
      employmentType: form.employmentType,
      joiningDate: form.joiningDate,
      status: form.status,
      skills: parseSkills(form.skills),
      avatar: null,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editing) await updateEmployee(editing.id, payload)
      else await createEmployee(payload)
      setFormOpen(false)
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEmployee(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  const rows = result?.data ?? []

  return (
    <div className="px-6 py-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      <PageHeader
        breadcrumb={['People', 'Employees']}
        title="Employee Management"
        subtitle="Manage employees, departments, roles, contact details, and workforce information."
        actions={
          <button type="button" className="h-9 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold flex items-center gap-1" onClick={openCreate}>
            <Icon name="add" className="text-[18px]" /> Add Employee
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi title="Total Employees" value={summary.total.toLocaleString()} icon="group" />
        <Kpi title="Active Employees" value={summary.active.toLocaleString()} icon="check_circle" />
        <Kpi title="New This Month" value={summary.newMonth.toLocaleString()} icon="person_add" />
      </div>

      <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
          <input className="w-full h-9 pl-9 rounded-lg bg-surface-container-low text-sm" placeholder="Search name, ID, email, department..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <FilterSelect id="emp-dept" value={departmentFilter} onChange={(v) => { setDepartmentFilter(v); setPage(1) }} options={[['all', 'Department: All'], ...departments.map((d) => [d.id, d.name] as [string, string])]} />
        <FilterSelect id="emp-status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={[['all', 'Status: All'], ['Active', 'Active'], ['On Leave', 'On Leave'], ['Probation', 'Probation'], ['Suspended', 'Suspended'], ['Inactive', 'Inactive']]} />
      </div>

      {loading && <TableSkeleton />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon="group" title="No employees found" description="No employees match your filters." actionLabel="Reset filters" onAction={resetFiltersAndList} />
      )}

      {!loading && !error && rows.length > 0 && result && (
        <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-secondary text-xs uppercase tracking-wider">
                  <th className="px-3 py-2.5">Employee ID</th>
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5">Designation</th>
                  <th className="px-3 py-2.5">Country</th>
                  <th className="px-3 py-2.5">Employment Type</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Joining Date</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {rows.map((employee) => (
                  <tr key={employee.id} className="hover:bg-surface-container-low/70">
                    <td className="px-3 py-2.5 font-mono text-xs text-secondary">{employee.id}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" className="font-semibold hover:text-primary text-left" onClick={() => void openDetail(employee)}>{employee.fullName}</button>
                    </td>
                    <td className="px-3 py-2.5">{employee.email}</td>
                    <td className="px-3 py-2.5">{employee.departmentName}</td>
                    <td className="px-3 py-2.5">{employee.designation}</td>
                    <td className="px-3 py-2.5">{employee.country}</td>
                    <td className="px-3 py-2.5">{employee.employmentType}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={employee.status} /></td>
                    <td className="px-3 py-2.5">{formatDate(employee.joiningDate)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button type="button" className="w-8 h-8 rounded-lg hover:bg-surface-container inline-flex items-center justify-center" onClick={() => openEdit(employee)} aria-label="Edit"><Icon name="edit" className="text-[18px]" /></button>
                      <button type="button" className="w-8 h-8 rounded-lg hover:bg-error-container inline-flex items-center justify-center" onClick={() => setDeleteTarget(employee)} aria-label="Delete"><Icon name="delete" className="text-[18px]" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EmployeeTablePagination pagination={result.pagination} onPageChange={setPage} />
        </div>
      )}

      <EmployeeFormDrawer open={formOpen} editing={editing} form={form} errors={errors} formError={formError} saving={saving} departments={departments} onClose={() => !saving && setFormOpen(false)} onChange={(field, value) => { setForm((p) => ({ ...p, [field]: value })); setErrors((p) => ({ ...p, [field]: undefined })) }} onSubmit={handleSubmit} />
      <EmployeeDetailDrawer detail={detailOpen ? detail : null} loading={detailLoading} onClose={() => setDetailOpen(false)} />
      <DeleteEmployeeModal employee={deleteTarget} deleting={deleting} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  )
}

function Kpi({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="p-5 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary uppercase tracking-wider font-semibold">{title}</span>
        <Icon name={icon} className="text-primary text-[18px]" />
      </div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  )
}
