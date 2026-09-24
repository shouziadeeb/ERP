/**
 * Populates Neon/Postgres with a large demo ERP dataset (~100k employees).
 * Run: npm run db:seed (from backend). Use FORCE_SEED=1 to replace existing data.
 */
import '../src/env.js'
import { buildStore } from '../src/seed/buildDataset.ts'
import { prisma } from '../src/db/index.js'

// Insert many rows without exceeding driver parameter limits.
const BATCH = 400

async function insertBatches<T>(insert: (slice: T[]) => Promise<unknown>, rows: T[]) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await insert(rows.slice(i, i + BATCH))
  }
}

async function main() {
  const force = process.env.FORCE_SEED === '1'
  const existing = await prisma.appMeta.findUnique({ where: { key: 'seeded' } })
  if (existing && !force) {
    console.log('Database already seeded. Set FORCE_SEED=1 to re-seed.')
    return
  }

  console.log('Building deterministic ERP dataset…')
  const store = buildStore()

  console.log('Clearing existing ERP tables…')
  await prisma.$executeRaw`
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
  `

  console.log('Inserting reference data…')
  await insertBatches(
    (slice) => prisma.department.createMany({ data: slice }),
    store.departments,
  )
  await insertBatches(
    (slice) => prisma.productCategory.createMany({ data: slice }),
    store.categories,
  )
  await insertBatches(
    (slice) => prisma.warehouse.createMany({ data: slice }),
    store.warehouses,
  )
  await insertBatches(
    (slice) =>
      prisma.supplier.createMany({
        data: slice.map((s) => ({
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
        })),
      }),
    store.suppliers,
  )
  await insertBatches(
    (slice) =>
      prisma.customer.createMany({
        data: slice.map((c) => ({
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
        })),
      }),
    store.customers,
  )
  await insertBatches(
    (slice) =>
      prisma.product.createMany({
        data: slice.map((p) => ({
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
        })),
      }),
    store.products,
  )

  console.log('Inserting employees…')
  await insertBatches(
    (slice) =>
      prisma.employee.createMany({
        data: slice.map((e) => ({
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
          joiningDate: new Date(e.joiningDate),
          status: e.status,
          skills: e.skills,
          avatar: e.avatar,
        })),
      }),
    store.employees,
  )

  console.log('Inserting inventory…')
  await insertBatches(
    (slice) =>
      prisma.inventoryRecord.createMany({
        data: slice.map((r) => ({
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
        })),
      }),
    store.inventory,
  )

  console.log('Inserting orders…')
  await insertBatches(
    (slice) =>
      prisma.salesOrder.createMany({
        data: slice.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerId: o.customerId,
          customerName: o.customerName,
          orderDate: new Date(o.orderDate),
          status: o.status,
          paymentStatus: o.paymentStatus,
          currency: o.currency,
          subtotal: o.subtotal,
          tax: o.tax,
          discount: o.discount,
          total: o.total,
        })),
      }),
    store.orders,
  )

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
  await insertBatches((slice) => prisma.salesOrderItem.createMany({ data: slice }), orderItems)

  console.log('Inserting purchase orders…')
  await insertBatches(
    (slice) =>
      prisma.purchaseOrder.createMany({
        data: slice.map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          orderDate: new Date(po.orderDate),
          expectedDeliveryDate: new Date(po.expectedDeliveryDate),
          status: po.status,
          subtotal: po.subtotal,
          tax: po.tax,
          total: po.total,
        })),
      }),
    store.purchaseOrders,
  )

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
  await insertBatches((slice) => prisma.purchaseOrderItem.createMany({ data: slice }), poItems)

  console.log('Inserting invoices, leave, payroll…')
  await insertBatches(
    (slice) =>
      prisma.invoice.createMany({
        data: slice.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          customerName: inv.customerName,
          orderId: inv.orderId,
          orderNumber: inv.orderNumber,
          invoiceDate: new Date(inv.invoiceDate),
          dueDate: new Date(inv.dueDate),
          subtotal: inv.subtotal,
          tax: inv.tax,
          discount: inv.discount,
          total: inv.total,
          amountPaid: inv.amountPaid,
          amountDue: inv.amountDue,
          status: inv.status,
        })),
      }),
    store.invoices,
  )

  await insertBatches(
    (slice) =>
      prisma.leaveRequest.createMany({
        data: slice.map((l) => ({
          id: l.id,
          employeeId: l.employeeId,
          employeeName: l.employeeName,
          leaveType: l.leaveType,
          startDate: new Date(l.startDate),
          endDate: new Date(l.endDate),
          days: l.days,
          reason: l.reason,
          status: l.status,
          approvedBy: l.approvedBy,
        })),
      }),
    store.leaves,
  )

  await insertBatches(
    (slice) =>
      prisma.payrollRecord.createMany({
        data: slice.map((p) => ({
          id: p.id,
          employeeId: p.employeeId,
          month: p.month,
          basicSalary: p.basicSalary,
          allowances: p.allowances,
          deductions: p.deductions,
          grossSalary: p.grossSalary,
          netSalary: p.netSalary,
          status: p.status,
        })),
      }),
    store.payroll,
  )

  await insertBatches(
    (slice) =>
      prisma.dashboardActivity.createMany({
        data: slice.map((a) => ({
          id: a.id,
          type: a.type,
          message: a.message,
          timestamp: new Date(a.timestamp),
          actor: a.actor,
        })),
      }),
    store.recentActivities,
  )

  await prisma.appMeta.create({ data: { key: 'seeded', value: new Date().toISOString() } })
  console.log('Seed complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
