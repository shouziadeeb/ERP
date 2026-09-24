/**
 * Builds the full in-memory ERP dataset before seed.ts writes batches to Postgres.
 * Uses seeded randomness for names, orders, and ~101k employees.
 */
import departmentsData from './reference/departments.json' with { type: 'json' }
import categoriesData from './reference/categories.json' with { type: 'json' }
import warehousesData from './reference/warehouses.json' with { type: 'json' }
import type { AttendanceRecord, AttendanceStatus } from '../../../frontend/src/types/attendance.js'
import type { Customer } from '../../../frontend/src/types/customer.js'
import type { DashboardActivity, DashboardApproval, DashboardSummary } from '../../../frontend/src/types/dashboard.js'
import type { Department, Designation, Employee, EmployeeStatus, EmploymentType } from '../../../frontend/src/types/employee.js'
import type { InventoryRecord, InventoryStatus, Warehouse } from '../../../frontend/src/types/inventory.js'
import type { Invoice, InvoiceStatus } from '../../../frontend/src/types/invoice.js'
import type { LeaveRequest } from '../../../frontend/src/types/leave.js'
import type { PayrollRecord } from '../../../frontend/src/types/payroll.js'
import type { Product, ProductCategory } from '../../../frontend/src/types/product.js'
import type {
  OrderLineItem,
  OrderStatus,
  PaymentStatus,
  PurchaseOrder,
  PurchaseOrderLineItem,
  PurchaseOrderStatus,
  SalesOrder,
} from '../../../frontend/src/types/order.js'
import type { Supplier } from '../../../frontend/src/types/supplier.js'
import { createSeededRandom, padNum, pick, pickIndex } from './seedRandom.js'

const FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Ananya', 'Isha', 'Rahul', 'Priya', 'Arjun', 'Neha', 'Karan', 'Sneha',
  'Rohan', 'Meera', 'Aditya', 'Kavya', 'Vikram', 'Pooja', 'Sanjay', 'Divya', 'Nikhil', 'Tanvi',
  'Emma', 'Olivia', 'Liam', 'Noah', 'Sophia', 'James', 'Amelia', 'Lucas', 'Mia', 'Ethan',
] as const

const LAST_NAMES = [
  'Mehta', 'Sharma', 'Patel', 'Iyer', 'Kapoor', 'Reddy', 'Singh', 'Gupta', 'Nair', 'Desai',
  'Khan', 'Malhotra', 'Chopra', 'Bose', 'Joshi', 'Verma', 'Agarwal', 'Rao', 'Menon', 'Pillai',
  'Johnson', 'Williams', 'Brown', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
] as const

const CITIES: Record<string, string[]> = {
  India: ['New Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Ahmedabad'],
  UAE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  Netherlands: ['Amsterdam', 'Rotterdam', 'Utrecht'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham'],
  'United States': ['New York', 'San Francisco', 'Chicago', 'Austin'],
  Singapore: ['Singapore'],
}

const DESIGNATIONS: Designation[] = [
  { id: 'DES-001', title: 'Engineering Manager', departmentId: 'DEP-001' },
  { id: 'DES-002', title: 'Senior Software Engineer', departmentId: 'DEP-001' },
  { id: 'DES-003', title: 'Backend Developer', departmentId: 'DEP-001' },
  { id: 'DES-004', title: 'Frontend Developer', departmentId: 'DEP-001' },
  { id: 'DES-005', title: 'QA Engineer', departmentId: 'DEP-001' },
  { id: 'DES-006', title: 'HR Manager', departmentId: 'DEP-002' },
  { id: 'DES-007', title: 'HR Executive', departmentId: 'DEP-002' },
  { id: 'DES-008', title: 'Finance Manager', departmentId: 'DEP-003' },
  { id: 'DES-009', title: 'Accountant', departmentId: 'DEP-003' },
  { id: 'DES-010', title: 'Sales Manager', departmentId: 'DEP-004' },
  { id: 'DES-011', title: 'Account Executive', departmentId: 'DEP-004' },
  { id: 'DES-012', title: 'Marketing Manager', departmentId: 'DEP-005' },
  { id: 'DES-013', title: 'Operations Manager', departmentId: 'DEP-006' },
  { id: 'DES-014', title: 'Procurement Officer', departmentId: 'DEP-007' },
  { id: 'DES-015', title: 'Warehouse Supervisor', departmentId: 'DEP-008' },
  { id: 'DES-016', title: 'Support Lead', departmentId: 'DEP-009' },
  { id: 'DES-017', title: 'Support Specialist', departmentId: 'DEP-009' },
  { id: 'DES-018', title: 'IT Administrator', departmentId: 'DEP-010' },
  { id: 'DES-019', title: 'Office Administrator', departmentId: 'DEP-011' },
  { id: 'DES-020', title: 'Executive Assistant', departmentId: 'DEP-011' },
]

const SKILL_POOL: Record<string, string[]> = {
  'DEP-001': ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Go', 'Java'],
  'DEP-002': ['Recruitment', 'Payroll', 'Compliance', 'Employee Relations'],
  'DEP-003': ['Accounting', 'SAP', 'Financial Reporting', 'Taxation'],
  'DEP-004': ['CRM', 'Negotiation', 'B2B Sales', 'Forecasting'],
  'DEP-005': ['SEO', 'Content Strategy', 'Campaign Analytics'],
  'DEP-006': ['Process Optimization', 'Supply Chain', 'Lean Operations'],
  'DEP-007': ['Vendor Management', 'Procurement', 'Negotiation'],
  'DEP-008': ['Inventory Control', 'WMS', 'Forklift Operations'],
  'DEP-009': ['Customer Support', 'Zendesk', 'SLA Management'],
  'DEP-010': ['Networking', 'Security', 'Azure', 'Linux'],
  'DEP-011': ['Office Management', 'Documentation', 'Scheduling'],
}

const BRANDS = [
  'ScanPro', 'TechNova', 'OfficeLine', 'SafeGuard', 'PackWell', 'InduMax', 'ClearView', 'ProDesk',
  'BluePeak', 'MetroSupply', 'Zenith', 'CoreTech', 'PrimeWare', 'NovaLine',
] as const

const PRODUCT_BASE: Record<string, string[]> = {
  'CAT-001': ['Wireless Barcode Scanner', 'Handheld RFID Reader', 'Label Printer', 'POS Terminal'],
  'CAT-002': ['A4 Copier Paper Box', 'Ballpoint Pen Pack', 'Sticky Notes Bundle', 'File Organizer'],
  'CAT-003': ['Pallet Jack', 'Storage Rack Unit', 'Dock Leveler', 'Warehouse Trolley'],
  'CAT-004': ['Business Laptop', '24-inch Monitor', 'Docking Station', 'Network Switch'],
  'CAT-005': ['Ergonomic Office Chair', 'Standing Desk', 'Conference Table', 'Visitor Chair'],
  'CAT-006': ['Corrugated Carton Box', 'Stretch Wrap Roll', 'Bubble Wrap Roll', 'Shipping Label Roll'],
  'CAT-007': ['Safety Helmet', 'High-Visibility Vest', 'Safety Gloves Pack', 'Fire Extinguisher'],
  'CAT-008': ['Industrial Cleaning Wipes', 'Lubricant Can', 'Maintenance Kit', 'Filter Cartridge'],
  'CAT-009': ['Hydraulic Pump Unit', 'Industrial Motor', 'Control Panel', 'Pressure Valve'],
}

const COMPANY_PREFIX = [
  'Nova', 'Global', 'Prime', 'Metro', 'Blue', 'Summit', 'Vertex', 'Apex', 'Unified', 'Pacific',
] as const

const COMPANY_SUFFIX = [
  'Technologies', 'Industries', 'Solutions', 'Trading', 'Logistics', 'Systems', 'Enterprises',
] as const

const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  'Active',
  'Active',
  'Active',
  'Active',
  'Active',
  'On Leave',
  'Probation',
  'Suspended',
  'Inactive',
]

const EMPLOYMENT_TYPES: EmploymentType[] = ['Full Time', 'Full Time', 'Full Time', 'Part Time', 'Contract', 'Intern']

const ORDER_STATUSES: OrderStatus[] = [
  'Draft',
  'Pending',
  'Confirmed',
  'Processing',
  'Processing',
  'Shipped',
  'Delivered',
  'Delivered',
  'Cancelled',
]

const PAYMENT_STATUSES: PaymentStatus[] = [
  'Pending',
  'Paid',
  'Paid',
  'Partially Paid',
  'Failed',
  'Refunded',
]

const PO_STATUSES: PurchaseOrderStatus[] = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Ordered',
  'Partially Received',
  'Received',
  'Cancelled',
]

const INVOICE_STATUSES: InvoiceStatus[] = [
  'Draft',
  'Sent',
  'Paid',
  'Partially Paid',
  'Overdue',
  'Cancelled',
]

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Casual Leave', 'Maternity Leave', 'Unpaid Leave']

export interface ErpStore {
  departments: Department[]
  designations: Designation[]
  categories: ProductCategory[]
  warehouses: Warehouse[]
  employees: Employee[]
  products: Product[]
  inventory: InventoryRecord[]
  customers: Customer[]
  suppliers: Supplier[]
  orders: SalesOrder[]
  purchaseOrders: PurchaseOrder[]
  invoices: Invoice[]
  leaves: LeaveRequest[]
  payroll: PayrollRecord[]
  dashboardSummary: DashboardSummary
  recentActivities: DashboardActivity[]
  pendingApprovals: DashboardApproval[]
}

function inventoryStatus(
  quantity: number,
  available: number,
  reorderLevel: number,
): InventoryStatus {
  if (quantity === 0 || available === 0) return 'Out of Stock'
  if (available <= reorderLevel) return 'Low Stock'
  if (available > reorderLevel * 6) return 'Overstocked'
  return 'In Stock'
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildStore(): ErpStore {
  const rand = createSeededRandom(20260924)
  const departments = departmentsData as Department[]
  const categories = categoriesData as ProductCategory[]
  const warehouses = warehousesData as Warehouse[]

  const suppliers: Supplier[] = []
  for (let i = 1; i <= 200; i++) {
    const country = pick(rand, ['India', 'India', 'India', 'UAE', 'Singapore'] as const)
    const city = pick(rand, CITIES[country] ?? ['New Delhi'])
    const prefix = pick(rand, COMPANY_PREFIX)
    const suffix = pick(rand, COMPANY_SUFFIX)
    suppliers.push({
      id: `SUP-${padNum(i, 5)}`,
      supplierCode: `SUP${10000 + i}`,
      companyName: `${prefix} ${suffix} ${i % 7 === 0 ? 'LLP' : 'Pvt Ltd'}`,
      contactPerson: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
      email: `sales${i}@supplier${padNum(i, 3)}.com`,
      phone: `+91-98${padNum(10000000 + i, 8)}`.slice(0, 14),
      country,
      city,
      status: i % 17 === 0 ? 'Inactive' : 'Active',
      paymentTerms: i % 3 === 0 ? 'Net 45' : 'Net 30',
    })
  }

  const customers: Customer[] = []
  for (let i = 1; i <= 500; i++) {
    const country = pick(rand, ['India', 'India', 'UAE', 'United Kingdom', 'United States'] as const)
    const city = pick(rand, CITIES[country] ?? ['Mumbai'])
    customers.push({
      id: `CUS-${padNum(i, 5)}`,
      customerCode: `CUS${10000 + i}`,
      companyName: `${pick(rand, COMPANY_PREFIX)} ${pick(rand, COMPANY_SUFFIX)} ${i % 5 === 0 ? 'Ltd' : 'Pvt Ltd'}`,
      contactPerson: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
      email: `contact${i}@${pick(rand, COMPANY_PREFIX).toLowerCase()}${i}.com`,
      phone: `+91-98${padNum(20000000 + i, 8)}`.slice(0, 14),
      country,
      city,
      status: i % 23 === 0 ? 'Blocked' : i % 11 === 0 ? 'Inactive' : 'Active',
      creditLimit: 100000 + (i % 20) * 25000,
      paymentTerms: i % 4 === 0 ? 'Net 15' : 'Net 30',
    })
  }

  const products: Product[] = []
  for (let i = 1; i <= 500; i++) {
    const category = categories[i % categories.length]!
    const baseName = pick(rand, PRODUCT_BASE[category.id] ?? ['Enterprise Supply Item'])
    const brand = pick(rand, BRANDS)
    const costPrice = 500 + (i % 90) * 175 + pickIndex(rand, 400)
    const margin = 1.15 + (i % 7) * 0.05
    const sellingPrice = roundMoney(costPrice * margin)
    products.push({
      id: `PRD-${padNum(i, 5)}`,
      sku: `SKU-${10000 + i}`,
      name: `${brand} ${baseName}`,
      categoryId: category.id,
      categoryName: category.name,
      brand,
      unit: i % 8 === 0 ? 'Box' : 'Piece',
      costPrice,
      sellingPrice,
      taxRate: i % 5 === 0 ? 12 : 18,
      status: i % 29 === 0 ? 'Inactive' : i % 41 === 0 ? 'Discontinued' : 'Active',
      supplierId: suppliers[i % suppliers.length]!.id,
      reorderLevel: 10 + (i % 15) * 2,
    })
  }

  const employees: Employee[] = []
  for (let i = 1; i <= 1000; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length]!
    const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length]!
    const department = departments[i % departments.length]!
    const deptDesignations = DESIGNATIONS.filter((d) => d.departmentId === department.id)
    const designation = deptDesignations[i % deptDesignations.length] ?? DESIGNATIONS[0]!
    const country = pick(rand, ['India', 'India', 'India', 'Netherlands', 'UAE', 'United Kingdom'] as const)
    const city = pick(rand, CITIES[country] ?? ['New Delhi'])
    const employmentType = EMPLOYMENT_TYPES[i % EMPLOYMENT_TYPES.length]!
    const status = EMPLOYEE_STATUSES[i % EMPLOYEE_STATUSES.length]!
    const joiningYear = 2018 + (i % 8)
    const joiningMonth = (i % 12) + 1
    const joiningDay = (i % 26) + 1
    const skills = [...(SKILL_POOL[department.id] ?? ['Communication'])].slice(0, 3 + (i % 3))
    const managerId =
      i <= 11 ? null : `EMP-${padNum(1 + (i % 11), 5)}`

    const isSeedProfile = i === 1
    employees.push({
      id: `EMP-${padNum(i, 5)}`,
      employeeCode: `EMP${padNum(i, 5)}`,
      firstName: isSeedProfile ? 'Aarav' : firstName,
      lastName: isSeedProfile ? 'Mehta' : lastName,
      fullName: isSeedProfile ? 'Aarav Mehta' : `${firstName} ${lastName}`,
      email: isSeedProfile
        ? 'aarav.mehta@global-supply.com'
        : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@global-supply.com`,
      phone: `+91-98765${padNum(10000 + i, 5)}`.slice(0, 14),
      country: isSeedProfile ? 'India' : country,
      city: isSeedProfile ? 'New Delhi' : city,
      departmentId: isSeedProfile ? 'DEP-001' : department.id,
      departmentName: isSeedProfile ? 'Engineering' : department.name,
      designationId: isSeedProfile ? 'DES-004' : designation.id,
      designation: isSeedProfile ? 'Frontend Developer' : designation.title,
      managerId: isSeedProfile ? 'EMP-00002' : managerId,
      employmentType: isSeedProfile ? 'Full Time' : employmentType,
      joiningDate: isSeedProfile ? '2024-06-10' : `${joiningYear}-${padNum(joiningMonth, 2)}-${padNum(joiningDay, 2)}`,
      status: isSeedProfile ? 'Active' : status,
      skills: isSeedProfile ? ['React', 'TypeScript', 'Next.js'] : skills,
      avatar: null,
    })
  }

  const inventory: InventoryRecord[] = []
  for (let i = 1; i <= 1000; i++) {
    const product = products[(i - 1) % products.length]!
    const warehouse = warehouses[i % warehouses.length]!
    const quantity = (i * 17) % 420
    const reservedQuantity = Math.min(quantity, (i * 3) % 45)
    const availableQuantity = quantity - reservedQuantity
    const reorderLevel = product.reorderLevel
    inventory.push({
      id: `INV-${padNum(i, 5)}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      quantity,
      reservedQuantity,
      availableQuantity,
      reorderLevel,
      status: inventoryStatus(quantity, availableQuantity, reorderLevel),
      lastUpdated: `2026-09-${padNum((i % 28) + 1, 2)}T${padNum((i * 3) % 24, 2)}:${padNum((i * 7) % 60, 2)}:00Z`,
    })
  }

  const orders: SalesOrder[] = []
  for (let i = 1; i <= 2000; i++) {
    const customer = customers[i % customers.length]!
    const lineCount = 1 + (i % 4)
    const items: OrderLineItem[] = []
    let subtotal = 0
    for (let line = 0; line < lineCount; line++) {
      const product = products[(i + line * 13) % products.length]!
      const quantity = 1 + ((i + line) % 12)
      const unitPrice = product.sellingPrice
      const total = roundMoney(unitPrice * quantity)
      subtotal += total
      items.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        total,
      })
    }
    subtotal = roundMoney(subtotal)
    const discount = i % 6 === 0 ? roundMoney(subtotal * 0.04) : 0
    const taxable = subtotal - discount
    const tax = roundMoney(taxable * 0.18)
    const total = roundMoney(taxable + tax)
    const day = (i % 28) + 1
    orders.push({
      id: `ORD-${100000 + i}`,
      orderNumber: `SO-2026-${100000 + i}`,
      customerId: customer.id,
      customerName: customer.companyName,
      orderDate: `2026-09-${padNum(day, 2)}`,
      status: ORDER_STATUSES[i % ORDER_STATUSES.length]!,
      paymentStatus: PAYMENT_STATUSES[i % PAYMENT_STATUSES.length]!,
      currency: 'INR',
      subtotal,
      tax,
      discount,
      total,
      items,
    })
  }

  const purchaseOrders: PurchaseOrder[] = []
  for (let i = 1; i <= 500; i++) {
    const supplier = suppliers[i % suppliers.length]!
    const lineCount = 1 + (i % 3)
    const items: PurchaseOrderLineItem[] = []
    let subtotal = 0
    for (let line = 0; line < lineCount; line++) {
      const product = products[(i * 5 + line) % products.length]!
      const quantity = 10 + ((i + line) % 40)
      const unitCost = product.costPrice
      const total = roundMoney(unitCost * quantity)
      subtotal += total
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitCost,
        total,
      })
    }
    subtotal = roundMoney(subtotal)
    const tax = roundMoney(subtotal * 0.18)
    const total = roundMoney(subtotal + tax)
    purchaseOrders.push({
      id: `PO-${padNum(i, 5)}`,
      poNumber: `PO-2026-${padNum(i, 5)}`,
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      orderDate: `2026-09-${padNum((i % 25) + 1, 2)}`,
      expectedDeliveryDate: `2026-10-${padNum((i % 20) + 1, 2)}`,
      status: PO_STATUSES[i % PO_STATUSES.length]!,
      subtotal,
      tax,
      total,
      items,
    })
  }

  const invoices: Invoice[] = []
  for (let i = 1; i <= 1500; i++) {
    const order = orders[i % orders.length]!
    const status = INVOICE_STATUSES[i % INVOICE_STATUSES.length]!
    const amountPaid =
      status === 'Paid'
        ? order.total
        : status === 'Partially Paid'
          ? roundMoney(order.total * 0.7)
          : status === 'Draft'
            ? 0
            : roundMoney(order.total * 0.35)
    invoices.push({
      id: `INV-${padNum(i, 5)}`,
      invoiceNumber: `INV-2026-${padNum(i, 5)}`,
      customerId: order.customerId,
      customerName: order.customerName,
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceDate: order.orderDate,
      dueDate: `2026-10-${padNum((i % 25) + 1, 2)}`,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      amountPaid,
      amountDue: roundMoney(order.total - amountPaid),
      status,
    })
  }

  const leaves: LeaveRequest[] = []
  for (let i = 1; i <= 600; i++) {
    const employee = employees[i % employees.length]!
    const startDay = (i % 20) + 1
    const days = 1 + (i % 4)
    leaves.push({
      id: `LEV-${padNum(i, 5)}`,
      employeeId: employee.id,
      employeeName: employee.fullName,
      leaveType: LEAVE_TYPES[i % LEAVE_TYPES.length]!,
      startDate: `2026-09-${padNum(startDay, 2)}`,
      endDate: `2026-09-${padNum(Math.min(startDay + days - 1, 28), 2)}`,
      days,
      reason: i % 2 === 0 ? 'Personal work' : 'Family commitment',
      status: i % 5 === 0 ? 'Pending' : i % 7 === 0 ? 'Rejected' : 'Approved',
      approvedBy: i % 5 === 0 ? null : 'EMP-00002',
    })
  }

  const payroll: PayrollRecord[] = []
  for (let i = 1; i <= 1000; i++) {
    const employee = employees[i - 1]!
    const basicSalary = 35000 + (i % 25) * 2500
    const allowances = 8000 + (i % 10) * 600
    const deductions = 3000 + (i % 8) * 400
    const grossSalary = basicSalary + allowances
    const netSalary = grossSalary - deductions
    payroll.push({
      id: `PAY-2026-09-${padNum(i, 5)}`,
      employeeId: employee.id,
      month: '2026-09',
      basicSalary,
      allowances,
      deductions,
      grossSalary,
      netSalary,
      status: 'Processed',
    })
  }

  const activeEmployees = employees.filter((e) => e.status === 'Active').length
  const lowStockProducts = new Set(
    inventory.filter((r) => r.status === 'Low Stock').map((r) => r.productId),
  ).size
  const outOfStockProducts = new Set(
    inventory.filter((r) => r.status === 'Out of Stock').map((r) => r.productId),
  ).size
  const pendingOrders = orders.filter((o) =>
    ['Pending', 'Processing', 'Confirmed'].includes(o.status),
  ).length
  const pendingInvoices = invoices.filter((inv) =>
    ['Sent', 'Partially Paid'].includes(inv.status),
  ).length
  const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue').length
  const pendingPurchaseOrders = purchaseOrders.filter((po) =>
    ['Pending Approval', 'Approved', 'Ordered'].includes(po.status),
  ).length
  const monthlyRevenue = roundMoney(
    orders
      .filter((o) => o.orderDate.startsWith('2026-09') && o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.total, 0),
  )
  const monthlyExpenses = roundMoney(
    purchaseOrders
      .filter((po) => po.orderDate.startsWith('2026-09') && po.status !== 'Cancelled')
      .reduce((sum, po) => sum + po.total, 0),
  )

  const dashboardSummary: DashboardSummary = {
    totalEmployees: employees.length,
    activeEmployees,
    newEmployeesThisMonth: employees.filter((e) => e.joiningDate.startsWith('2026-09')).length,
    totalProducts: products.length,
    lowStockProducts,
    outOfStockProducts,
    totalCustomers: customers.length,
    pendingOrders,
    monthlyRevenue,
    monthlyExpenses,
    pendingInvoices,
    overdueInvoices,
    pendingPurchaseOrders,
  }

  const recentActivities: DashboardActivity[] = [
    {
      id: 'ACT-001',
      type: 'Order',
      message: 'Sales order SO-2026-100045 confirmed for Nova Technologies Pvt Ltd',
      timestamp: '2026-09-23T16:20:00Z',
      actor: 'Rahul Sharma',
    },
    {
      id: 'ACT-002',
      type: 'Inventory',
      message: 'Low stock alert for ScanPro Wireless Barcode Scanner in Mumbai Warehouse',
      timestamp: '2026-09-23T15:05:00Z',
      actor: 'System',
    },
    {
      id: 'ACT-003',
      type: 'HR',
      message: 'Leave request submitted by Aarav Mehta (Annual Leave)',
      timestamp: '2026-09-23T11:40:00Z',
      actor: 'Aarav Mehta',
    },
    {
      id: 'ACT-004',
      type: 'Finance',
      message: 'Invoice INV-2026-000120 marked as Partially Paid',
      timestamp: '2026-09-23T10:15:00Z',
      actor: 'Finance Team',
    },
  ]

  const pendingApprovals: DashboardApproval[] = leaves
    .filter((l) => l.status === 'Pending')
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      type: 'Leave' as const,
      reference: l.leaveType,
      requestedBy: l.employeeName,
      date: l.startDate,
    }))

  return {
    departments,
    designations: DESIGNATIONS,
    categories,
    warehouses,
    employees,
    products,
    inventory,
    customers,
    suppliers,
    orders,
    purchaseOrders,
    invoices,
    leaves,
    payroll,
    dashboardSummary,
    recentActivities,
    pendingApprovals,
  }
}

export function generateEmployeeAttendance(
  employeeId: string,
  year: number,
  month: number,
): AttendanceRecord[] {
  const rand = createSeededRandom(Number(employeeId.replace(/\D/g, '')) + year * 100 + month)
  const daysInMonth = new Date(year, month, 0).getDate()
  const records: AttendanceRecord[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${padNum(month, 2)}-${padNum(day, 2)}`
    const weekday = new Date(year, month - 1, day).getDay()
    if (weekday === 0 || weekday === 6) {
      records.push({
        id: `ATT-${employeeId}-${date}`,
        employeeId,
        date,
        checkIn: null,
        checkOut: null,
        workingHours: 0,
        status: 'Holiday',
      })
      continue
    }

    const roll = rand()
    let status: AttendanceStatus = 'Present'
    if (roll < 0.04) status = 'Absent'
    else if (roll < 0.1) status = 'Late'
    else if (roll < 0.13) status = 'On Leave'
    else if (roll < 0.15) status = 'Half Day'

    const checkIn =
      status === 'Absent' || status === 'On Leave'
        ? null
        : status === 'Late'
          ? '10:18'
          : '09:0' + (1 + (day % 5))
    const checkOut =
      status === 'Absent' || status === 'On Leave' || status === 'Half Day'
        ? status === 'Half Day'
          ? '13:30'
          : null
        : '18:0' + (3 + (day % 4))
    const workingHours =
      status === 'Absent' || status === 'On Leave'
        ? 0
        : status === 'Half Day'
          ? 4.25
          : status === 'Late'
            ? 7.5
            : 8.5 + (day % 3) * 0.15

    records.push({
      id: `ATT-${employeeId}-${date}`,
      employeeId,
      date,
      checkIn,
      checkOut,
      workingHours: Math.round(workingHours * 100) / 100,
      status,
    })
  }

  return records
}
