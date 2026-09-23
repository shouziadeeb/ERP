import type { ReportType } from '../services/reportService'

export interface ReportMeta {
  label: string
  description: string
  icon: string
}

export const REPORT_META: Record<ReportType, ReportMeta> = {
  sales: { label: 'Sales', description: 'Sales orders, fulfillment, and payment status', icon: 'local_shipping' },
  revenue: { label: 'Revenue', description: 'Recognized revenue from closed sales', icon: 'payments' },
  inventory: { label: 'Inventory', description: 'Stock positions across warehouses', icon: 'warehouse' },
  employees: { label: 'Employees', description: 'Workforce roster and employment status', icon: 'group' },
  attendance: { label: 'Attendance', description: 'Employee roster for HR reporting', icon: 'event_available' },
  purchase: { label: 'Purchase', description: 'Supplier purchase orders and spend', icon: 'shopping_cart' },
  invoices: { label: 'Invoices', description: 'Accounts receivable and collections', icon: 'receipt_long' },
}

export const COLUMN_LABELS: Record<string, string> = {
  orderNumber: 'Order',
  customer: 'Customer',
  date: 'Date',
  status: 'Status',
  paymentStatus: 'Payment',
  total: 'Total',
  sku: 'SKU',
  product: 'Product',
  warehouse: 'Warehouse',
  available: 'Available',
  lastUpdated: 'Updated',
  employeeId: 'Employee ID',
  name: 'Name',
  department: 'Department',
  designation: 'Designation',
  joiningDate: 'Joined',
  poNumber: 'PO Number',
  supplier: 'Supplier',
  invoiceNumber: 'Invoice',
  orderNumberInv: 'Order',
  amountDue: 'Amount due',
}

export const STATUS_COLUMNS = new Set(['status', 'paymentStatus'])

export const MONEY_COLUMNS = new Set(['total', 'amountDue'])

export const DATE_COLUMNS = new Set(['date', 'joiningDate', 'lastUpdated'])

export function statusOptionsForReport(type: ReportType): Array<[string, string]> {
  const base: Array<[string, string]> = [['all', 'Status: All']]
  switch (type) {
    case 'sales':
    case 'revenue':
      return [...base, ['Pending', 'Pending'], ['Processing', 'Processing'], ['Shipped', 'Shipped'], ['Delivered', 'Delivered'], ['Cancelled', 'Cancelled']]
    case 'invoices':
      return [...base, ['Sent', 'Sent'], ['Paid', 'Paid'], ['Partially Paid', 'Partially Paid'], ['Overdue', 'Overdue'], ['Draft', 'Draft']]
    case 'inventory':
      return [...base, ['In Stock', 'In Stock'], ['Low Stock', 'Low Stock'], ['Out of Stock', 'Out of Stock']]
    case 'employees':
    case 'attendance':
      return [...base, ['Active', 'Active'], ['Probation', 'Probation'], ['On Leave', 'On Leave'], ['Inactive', 'Inactive']]
    case 'purchase':
      return [...base, ['Pending Approval', 'Pending Approval'], ['Approved', 'Approved'], ['Ordered', 'Ordered'], ['Received', 'Received']]
    default:
      return base
  }
}
