import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { AttendanceRecord } from '../types/attendance'
import type { Department, Employee } from '../types/employee'
import type { LeaveRequest } from '../types/leave'
import type { SortOrder } from '../types/pagination'
import type { PayrollRecord } from '../types/payroll'

export interface EmployeeQuery {
  page?: number
  limit?: number
  search?: string
  departmentId?: string
  status?: string
  country?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface EmployeeDetail {
  employee: Employee
  manager: Employee | null
  attendanceSummary: {
    present: number
    absent: number
    late: number
    onLeave: number
  }
  leaveSummary: {
    pending: number
    approved: number
  }
  recentLeaves: LeaveRequest[]
  payroll?: PayrollRecord
}

export async function getEmployees(query: EmployeeQuery = {}): Promise<PaginatedResult<Employee>> {
  return fetchJson(`/api/employees${toQuery(query)}`)
}

export async function getEmployeeDetail(id: string): Promise<EmployeeDetail | null> {
  try {
    return await fetchJson<EmployeeDetail>(`/api/employees/${encodeURIComponent(id)}/detail`)
  } catch {
    return null
  }
}

export async function getEmployeeAttendance(
  _employeeId: string,
  _year: number,
  _month: number,
): Promise<AttendanceRecord[]> {
  return []
}

export async function createEmployee(
  input: Omit<Employee, 'id' | 'employeeCode' | 'fullName'>,
): Promise<Employee> {
  return fetchJson('/api/employees', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  return fetchJson(`/api/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteEmployee(id: string): Promise<void> {
  await fetchJson(`/api/employees/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getDepartmentOptions(): Promise<Department[]> {
  return fetchJson('/api/departments')
}
