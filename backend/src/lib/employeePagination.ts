import { and, asc, desc, eq, ilike, or, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import { db } from '../db/index.js'
import { employees } from '../db/schema.js'

export interface EmployeeListQuery {
  page?: number
  limit?: number
  search?: string
  departmentId?: string
  status?: string
  country?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface EmployeeListPage {
  data: Array<typeof employees.$inferSelect & { joiningDate: string }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function parseSort(sortBy: string, sortOrder: string): { column: AnyColumn; isAsc: boolean } {
  const isAsc = sortOrder !== 'desc'
  switch (sortBy) {
    case 'employeeCode':
      return { column: employees.employeeCode, isAsc }
    case 'joiningDate':
      return { column: employees.joiningDate, isAsc }
    case 'id':
      return { column: employees.id, isAsc }
    default:
      return { column: employees.fullName, isAsc }
  }
}

function buildFilters(query: EmployeeListQuery): SQL | undefined {
  const search = String(query.search ?? '').trim()
  const departmentId = String(query.departmentId ?? 'all')
  const status = String(query.status ?? 'all')
  const country = String(query.country ?? 'all')

  const filters: SQL[] = []
  if (search) {
    filters.push(
      or(
        ilike(employees.fullName, `%${search}%`),
        ilike(employees.id, `%${search}%`),
        ilike(employees.employeeCode, `%${search}%`),
        ilike(employees.email, `%${search}%`),
        ilike(employees.departmentName, `%${search}%`),
        ilike(employees.designation, `%${search}%`),
      )!,
    )
  }
  if (departmentId !== 'all') filters.push(eq(employees.departmentId, departmentId))
  if (status !== 'all') filters.push(eq(employees.status, status))
  if (country !== 'all') filters.push(eq(employees.country, country))

  return filters.length ? and(...filters) : undefined
}

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListPage> {
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 25))
  const page = Math.max(1, Number(query.page) || 1)
  const offset = (page - 1) * limit
  const whereBase = buildFilters(query)
  const { column: sortCol, isAsc } = parseSort(String(query.sortBy ?? 'fullName'), String(query.sortOrder ?? 'asc'))
  const order = isAsc ? [asc(sortCol), asc(employees.id)] : [desc(sortCol), desc(employees.id)]

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employees)
    .where(whereBase)

  const totalPages = Math.max(1, Math.ceil(count / limit))
  const safePage = Math.min(page, totalPages)
  const safeOffset = (safePage - 1) * limit

  const rows = await db
    .select()
    .from(employees)
    .where(whereBase)
    .orderBy(...order)
    .limit(limit)
    .offset(safeOffset)

  return {
    data: rows.map((row) => ({ ...row, joiningDate: String(row.joiningDate) })),
    pagination: {
      page: safePage,
      limit,
      total: count,
      totalPages,
    },
  }
}
