/** Paginated /api/reports by type with optional full export. */
import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { SortOrder } from '../types/pagination'

export type ReportType =
  | 'sales'
  | 'revenue'
  | 'inventory'
  | 'employees'
  | 'attendance'
  | 'purchase'
  | 'invoices'

export interface ReportQuery {
  type: ReportType
  page?: number
  limit?: number
  search?: string
  status?: string
  departmentId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: SortOrder
  export?: string
}

type ReportRow = Record<string, string | number>

export interface ReportSummary {
  totalRows: number
  primaryMetric?: number
  primaryMetricLabel?: string
}

export interface ReportResult extends PaginatedResult<ReportRow> {
  summary: ReportSummary
}

export async function getReportData(query: ReportQuery): Promise<ReportResult> {
  return fetchJson(`/api/reports${toQuery(query)}`)
}

export async function getReportExport(query: Omit<ReportQuery, 'page' | 'limit'>): Promise<ReportResult> {
  return fetchJson(`/api/reports${toQuery({ ...query, export: '1' })}`)
}

export function exportReportCsv(_type: ReportType, rows: ReportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ]
  return lines.join('\n')
}

export function getReportColumns(type: ReportType): string[] {
  switch (type) {
    case 'sales':
    case 'revenue':
      return ['orderNumber', 'customer', 'date', 'status', 'paymentStatus', 'total']
    case 'inventory':
      return ['sku', 'product', 'warehouse', 'available', 'status', 'lastUpdated']
    case 'employees':
    case 'attendance':
      return ['employeeId', 'name', 'department', 'designation', 'status', 'joiningDate']
    case 'purchase':
      return ['poNumber', 'supplier', 'date', 'status', 'total']
    case 'invoices':
      return ['invoiceNumber', 'customer', 'orderNumber', 'date', 'status', 'total', 'amountDue']
    default:
      return []
  }
}
