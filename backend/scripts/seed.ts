import '../src/env.js'
import { sql } from 'drizzle-orm'
import { buildStore } from '../src/seed/buildDataset.ts'
import { db, pool } from '../src/db/index.js'
import {
  appMeta,
  customers,
  dashboardActivities,
  departments,
  employees,
  inventoryRecords,
  invoices,
  leaveRequests,
  payrollRecords,
  productCategories,
  products,
  purchaseOrderItems,
  purchaseOrders,
  salesOrderItems,
  salesOrders,
  suppliers,
  warehouses,
} from '../src/db/schema.js'

const BATCH = 400

async function insertBatches<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(table).values(rows.slice(i, i + BATCH) as never)
  }
}

async function main() {
  const force = process.env.FORCE_SEED === '1'
  const existing = await db.select().from(appMeta).where(sql`${appMeta.key} = 'seeded'`)
  if (existing.length > 0 && !force) {
    console.log('Database already seeded. Set FORCE_SEED=1 to re-seed.')
    return
  }

  console.log('Building deterministic ERP dataset…')
  const store = buildStore()

  console.log('Clearing existing ERP tables…')
  await db.execute(sql`
    TRUNCATE TABLE
      dashboard_activities,
      payroll_records,
      leave_requests,
      invoices,
      purchase_order_items,
      purchase_orders,
      sales_order_items,
      sales_orders,
      inventory_records,
      employees,
      products,
      customers,
      suppliers,
      warehouses,
      product_categories,
      departments,
      app_meta
    RESTART IDENTITY CASCADE
  `)

  console.log('Inserting reference data…')
  await insertBatches(departments, store.departments)
  await insertBatches(productCategories, store.categories)
  await insertBatches(warehouses, store.warehouses)
  await insertBatches(suppliers, store.suppliers.map((s) => ({
    id: s.id,
    supplierCode: s.supplierCode,
    companyName: s.companyName,
    contactPerson: s.contactPerson,
    email: s.email,
    phone: s.phone,
    country: s.country,
    city: s.city,
    status: s.status,
    paymentTerms: s.paymentTerms,
  })))
  await insertBatches(customers, store.customers.map((c) => ({
    id: c.id,
    customerCode: c.customerCode,
    companyName: c.companyName,
    contactPerson: c.contactPerson,
    email: c.email,
    phone: c.phone,
    country: c.country,
    city: c.city,
    status: c.status,
    creditLimit: c.creditLimit,
    paymentTerms: c.paymentTerms,
  })))
  await insertBatches(products, store.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    brand: p.brand,
    unit: p.unit,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    taxRate: p.taxRate,
    status: p.status,
    supplierId: p.supplierId,
    reorderLevel: p.reorderLevel,
  })))

  console.log('Inserting employees…')
  await insertBatches(employees, store.employees.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: e.fullName,
    email: e.email,
    phone: e.phone,
    country: e.country,
    city: e.city,
    departmentId: e.departmentId,
    departmentName: e.departmentName,
    designationId: e.designationId,
    designation: e.designation,
    managerId: e.managerId,
    employmentType: e.employmentType,
    joiningDate: e.joiningDate,
    status: e.status,
    skills: e.skills,
    avatar: e.avatar,
  })))

  console.log('Inserting inventory…')
  await insertBatches(inventoryRecords, store.inventory.map((r) => ({
    id: r.id,
    productId: r.productId,
    sku: r.sku,
    productName: r.productName,
    warehouseId: r.warehouseId,
    warehouseName: r.warehouseName,
    quantity: r.quantity,
    reservedQuantity: r.reservedQuantity,
    availableQuantity: r.availableQuantity,
    reorderLevel: r.reorderLevel,
    status: r.status,
    lastUpdated: new Date(r.lastUpdated),
  })))

  console.log('Inserting orders…')
  await insertBatches(salesOrders, store.orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    customerName: o.customerName,
    orderDate: o.orderDate,
    status: o.status,
    paymentStatus: o.paymentStatus,
    currency: o.currency,
    subtotal: o.subtotal,
    tax: o.tax,
    discount: o.discount,
    total: o.total,
  })))

  const orderItems = store.orders.flatMap((o) =>
    o.items.map((item, idx) => ({
      id: `${o.id}-line-${idx + 1}`,
      orderId: o.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
  )
  await insertBatches(salesOrderItems, orderItems)

  console.log('Inserting purchase orders…')
  await insertBatches(purchaseOrders, store.purchaseOrders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    orderDate: po.orderDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    status: po.status,
    subtotal: po.subtotal,
    tax: po.tax,
    total: po.total,
  })))

  const poItems = store.purchaseOrders.flatMap((po) =>
    po.items.map((item, idx) => ({
      id: `${po.id}-line-${idx + 1}`,
      purchaseOrderId: po.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      total: item.total,
    })),
  )
  await insertBatches(purchaseOrderItems, poItems)

  console.log('Inserting invoices, leave, payroll…')
  await insertBatches(invoices, store.invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    customerName: inv.customerName,
    orderId: inv.orderId,
    orderNumber: inv.orderNumber,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    subtotal: inv.subtotal,
    tax: inv.tax,
    discount: inv.discount,
    total: inv.total,
    amountPaid: inv.amountPaid,
    amountDue: inv.amountDue,
    status: inv.status,
  })))

  await insertBatches(leaveRequests, store.leaves.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    employeeName: l.employeeName,
    leaveType: l.leaveType,
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.days,
    reason: l.reason,
    status: l.status,
    approvedBy: l.approvedBy,
  })))

  await insertBatches(payrollRecords, store.payroll.map((p) => ({
    id: p.id,
    employeeId: p.employeeId,
    month: p.month,
    basicSalary: p.basicSalary,
    allowances: p.allowances,
    deductions: p.deductions,
    grossSalary: p.grossSalary,
    netSalary: p.netSalary,
    status: p.status,
  })))

  await insertBatches(dashboardActivities, store.recentActivities.map((a) => ({
    id: a.id,
    type: a.type,
    message: a.message,
    timestamp: new Date(a.timestamp),
    actor: a.actor,
  })))

  await db.insert(appMeta).values({ key: 'seeded', value: new Date().toISOString() })
  console.log('Seed complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
