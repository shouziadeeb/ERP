/**
 * Employee directory list: server-side search, filters, sort, count + page query.
 * Designed for large tables (100k+ rows) with indexed columns.
 */
import type { Employee, Prisma } from '@prisma/client'
import { prisma } from '../db/index.js'
import { toDateOnlyString } from './dates.js'

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

/** API serializes `joiningDate` as YYYY-MM-DD strings (Postgres `@db.Date` is a Date in Prisma). */
export type EmployeeListRow = Omit<Employee, 'joiningDate'> & { joiningDate: string }

export interface EmployeeListPage {
  data: EmployeeListRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** Maps API sort fields to Prisma `orderBy` (secondary sort on id keeps pages stable). */
function parseOrderBy(sortBy: string, sortOrder: string): Prisma.EmployeeOrderByWithRelationInput[] {
  const dir = sortOrder === 'desc' ? 'desc' : 'asc'
  switch (sortBy) {
    case 'employeeCode':
      return [{ employeeCode: dir }, { id: 'asc' }]
    case 'joiningDate':
      return [{ joiningDate: dir }, { id: 'asc' }]
    case 'id':
      return [{ id: dir }]
    default:
      return [{ fullName: dir }, { id: 'asc' }]
  }
}

/** Builds a Prisma `where` clause; empty object means no filters. */
function buildFilters(query: EmployeeListQuery): Prisma.EmployeeWhereInput {
  const search = String(query.search ?? '').trim()
  const departmentId = String(query.departmentId ?? 'all')
  const status = String(query.status ?? 'all')
  const country = String(query.country ?? 'all')

  const and: Prisma.EmployeeWhereInput[] = []
  if (search) {
    and.push({
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { departmentName: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ],
    })
  }
  if (departmentId !== 'all') and.push({ departmentId })
  if (status !== 'all') and.push({ status })
  if (country !== 'all') and.push({ country })

  return and.length ? { AND: and } : {}
}

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListPage> {
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 25))
  const page = Math.max(1, Number(query.page) || 1)
  const offset = (page - 1) * limit
  const where = buildFilters(query)
  const orderBy = parseOrderBy(String(query.sortBy ?? 'fullName'), String(query.sortOrder ?? 'asc'))

  const count = await prisma.employee.count({ where })

  const totalPages = Math.max(1, Math.ceil(count / limit))
  // If client asks for page 9999 after filters shrink, clamp instead of returning empty by mistake.
  const safePage = Math.min(page, totalPages)
  const safeOffset = (safePage - 1) * limit

  const rows = await prisma.employee.findMany({
    where,
    orderBy,
    take: limit,
    skip: safeOffset,
  })

  return {
    data: rows.map((row) => ({ ...row, joiningDate: toDateOnlyString(row.joiningDate) })),
    pagination: {
      page: safePage,
      limit,
      total: count,
      totalPages,
    },
  }
}
