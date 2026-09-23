import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import cors from 'cors'
import express from 'express'
import { generateEmployeeAttendance } from './lib/attendance.js'
import { listEmployees } from './lib/employeePagination.js'
import { paginatedResult, parsePagination } from './lib/pagination.js'
import { db } from './db/index.js'
import {
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
} from './db/schema.js'
import { loginHandler, requireApiAuth } from './lib/auth.js'
import { readSettings, saveSettings } from './lib/settings.js'
import { addWriteRoutes } from './writeRoutes.js'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', async (_req, res) => {
    try {
      await db.execute(sql`select 1`)
      res.json({ ok: true, database: true })
    } catch {
      res.status(503).json({ ok: false, database: false })
    }
  })

  app.post('/api/auth/login', loginHandler)
  app.use('/api', requireApiAuth)

  app.get('/api/departments', async (_req, res) => {
    res.json(await db.select().from(departments))
  })

  app.get('/api/categories', async (_req, res) => {
    res.json(await db.select().from(productCategories))
  })

  app.get('/api/warehouses', async (_req, res) => {
    res.json(await db.select().from(warehouses))
  })

  app.get('/api/suppliers', async (req, res, next) => {
    try {
      const listAll = String(req.query.all ?? '') === '1'
      if (listAll) {
        const rows = await db.select().from(suppliers).orderBy(asc(suppliers.companyName)).limit(500)
        res.json(rows)
        return
      }
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const filters = search
        ? [or(ilike(suppliers.companyName, `%${search}%`), ilike(suppliers.contactPerson, `%${search}%`))]
        : []
      const where = filters.length ? and(...filters) : undefined
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(suppliers)
        .where(where)
      const rows = await db
        .select()
        .from(suppliers)
        .where(where)
        .orderBy(asc(suppliers.companyName))
        .limit(limit)
        .offset(offset)
      res.json(paginatedResult(rows, count, page, limit))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/customers', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const filters = search
        ? [or(ilike(customers.companyName, `%${search}%`), ilike(customers.contactPerson, `%${search}%`))]
        : []
      const where = filters.length ? and(...filters) : undefined
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(where)
      const rows = await db.select().from(customers).where(where).limit(limit).offset(offset)
      res.json(paginatedResult(rows, count, page, limit))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/employees', async (req, res, next) => {
    try {
      const q = req.query as Record<string, unknown>
      res.json(
        await listEmployees({
          page: Number(q.page) || 1,
          limit: Number(q.limit) || 25,
          search: String(q.search ?? ''),
          departmentId: String(q.departmentId ?? 'all'),
          status: String(q.status ?? 'all'),
          country: String(q.country ?? 'all'),
          sortBy: String(q.sortBy ?? 'fullName'),
          sortOrder: String(q.sortOrder ?? 'asc') === 'desc' ? 'desc' : 'asc',
        }),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/employees/:id/detail', async (req, res, next) => {
    try {
      const [employee] = await db.select().from(employees).where(eq(employees.id, req.params.id))
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' })
        return
      }
      const manager = employee.managerId
        ? (await db.select().from(employees).where(eq(employees.id, employee.managerId)))[0] ?? null
        : null
      const attendance = generateEmployeeAttendance(employee.id, 2026, 9)
      const employeeLeaves = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.employeeId, employee.id))
        .limit(5)
      const [payroll] = await db
        .select()
        .from(payrollRecords)
        .where(eq(payrollRecords.employeeId, employee.id))
        .limit(1)

      res.json({
        employee: { ...employee, joiningDate: String(employee.joiningDate) },
        manager: manager ? { ...manager, joiningDate: String(manager.joiningDate) } : null,
        attendanceSummary: {
          present: attendance.filter((a) => a.status === 'Present').length,
          absent: attendance.filter((a) => a.status === 'Absent').length,
          late: attendance.filter((a) => a.status === 'Late').length,
          onLeave: attendance.filter((a) => a.status === 'On Leave').length,
        },
        leaveSummary: {
          pending: employeeLeaves.filter((l) => l.status === 'Pending').length,
          approved: employeeLeaves.filter((l) => l.status === 'Approved').length,
        },
        recentLeaves: employeeLeaves.map((l) => ({
          ...l,
          startDate: String(l.startDate),
          endDate: String(l.endDate),
        })),
        payroll: payroll ?? undefined,
      })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/employees', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(employees)
      const nextIndex = count + 1
      const id = `EMP-${String(nextIndex).padStart(5, '0')}`
      const row = {
        id,
        employeeCode: `EMP${String(nextIndex).padStart(5, '0')}`,
        firstName: String(body.firstName),
        lastName: String(body.lastName),
        fullName: `${body.firstName} ${body.lastName}`,
        email: String(body.email),
        phone: String(body.phone),
        country: String(body.country),
        city: String(body.city),
        departmentId: String(body.departmentId),
        departmentName: String(body.departmentName),
        designationId: String(body.designationId ?? 'DES-004'),
        designation: String(body.designation),
        managerId: body.managerId ? String(body.managerId) : null,
        employmentType: String(body.employmentType),
        joiningDate: String(body.joiningDate),
        status: String(body.status),
        skills: (body.skills as string[]) ?? [],
        avatar: null,
      }
      await db.insert(employees).values(row)
      res.status(201).json({ ...row, joiningDate: row.joiningDate })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/employees/:id', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>
      const [current] = await db.select().from(employees).where(eq(employees.id, req.params.id))
      if (!current) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      const firstName = body.firstName ? String(body.firstName) : current.firstName
      const lastName = body.lastName ? String(body.lastName) : current.lastName
      const patch = {
        ...body,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        managerId: body.managerId === '' ? null : (body.managerId as string | null | undefined) ?? current.managerId,
      }
      const [updated] = await db
        .update(employees)
        .set(patch as never)
        .where(eq(employees.id, req.params.id))
        .returning()
      res.json({ ...updated, joiningDate: String(updated!.joiningDate) })
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/employees/:id', async (req, res, next) => {
    try {
      await db.delete(employees).where(eq(employees.id, req.params.id))
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/products', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const categoryId = String(req.query.categoryId ?? 'all')
      const status = String(req.query.status ?? 'all')
      const stock = String(req.query.stock ?? 'all')

      const filters = []
      if (search) {
        filters.push(
          or(
            ilike(products.name, `%${search}%`),
            ilike(products.sku, `%${search}%`),
            ilike(products.brand, `%${search}%`),
          ),
        )
      }
      if (categoryId !== 'all') filters.push(eq(products.categoryId, categoryId))
      if (status !== 'all') filters.push(eq(products.status, status))
      const where = filters.length ? and(...filters) : undefined

      const stockMap = new Map<string, number>()
      const stockRows = await db
        .select({
          productId: inventoryRecords.productId,
          available: sql<number>`sum(${inventoryRecords.availableQuantity})`.mapWith(Number),
        })
        .from(inventoryRecords)
        .groupBy(inventoryRecords.productId)
      for (const row of stockRows) stockMap.set(row.productId, row.available)

      const all = await db.select().from(products).where(where).orderBy(asc(products.name))
      const enriched = all.map((p) => {
        const stockAvailable = stockMap.get(p.id) ?? 0
        let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock'
        if (stockAvailable === 0) stockStatus = 'Out of Stock'
        else if (stockAvailable <= p.reorderLevel) stockStatus = 'Low Stock'
        return { ...p, stockAvailable, stockStatus }
      })

      const filtered =
        stock === 'all'
          ? enriched
          : enriched.filter((p) =>
              stock === 'in_stock'
                ? p.stockStatus === 'In Stock'
                : stock === 'low_stock'
                  ? p.stockStatus === 'Low Stock'
                  : p.stockStatus === 'Out of Stock',
            )

      res.json(paginatedResult(filtered.slice(offset, offset + limit), filtered.length, page, limit))
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/products/:id', async (req, res, next) => {
    try {
      await db.delete(products).where(eq(products.id, req.params.id))
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/inventory', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const warehouseId = String(req.query.warehouseId ?? 'all')
      const status = String(req.query.status ?? 'all')

      const filters = []
      if (search) {
        filters.push(
          or(
            ilike(inventoryRecords.productName, `%${search}%`),
            ilike(inventoryRecords.sku, `%${search}%`),
            ilike(inventoryRecords.warehouseName, `%${search}%`),
          ),
        )
      }
      if (warehouseId !== 'all') filters.push(eq(inventoryRecords.warehouseId, warehouseId))
      if (status !== 'all') filters.push(eq(inventoryRecords.status, status))
      const where = filters.length ? and(...filters) : undefined

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventoryRecords)
        .where(where)
      const rows = await db
        .select()
        .from(inventoryRecords)
        .where(where)
        .orderBy(asc(inventoryRecords.productName))
        .limit(limit)
        .offset(offset)

      res.json(
        paginatedResult(
          rows.map((r) => ({ ...r, lastUpdated: r.lastUpdated.toISOString() })),
          count,
          page,
          limit,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/orders', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const status = String(req.query.status ?? 'all')
      const paymentStatus = String(req.query.paymentStatus ?? 'all')
      const dateFrom = String(req.query.dateFrom ?? '')
      const dateTo = String(req.query.dateTo ?? '')

      const filters = []
      if (search) {
        filters.push(
          or(
            ilike(salesOrders.orderNumber, `%${search}%`),
            ilike(salesOrders.customerName, `%${search}%`),
          ),
        )
      }
      if (status !== 'all') filters.push(eq(salesOrders.status, status))
      if (paymentStatus !== 'all') filters.push(eq(salesOrders.paymentStatus, paymentStatus))
      if (dateFrom) filters.push(gte(salesOrders.orderDate, dateFrom))
      if (dateTo) filters.push(lte(salesOrders.orderDate, dateTo))
      const where = filters.length ? and(...filters) : undefined

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(salesOrders)
        .where(where)
      const orders = await db
        .select()
        .from(salesOrders)
        .where(where)
        .orderBy(desc(salesOrders.orderDate))
        .limit(limit)
        .offset(offset)

      const orderIds = orders.map((o) => o.id)
      const items =
        orderIds.length === 0
          ? []
          : await db.select().from(salesOrderItems).where(inArray(salesOrderItems.orderId, orderIds))

      const itemsByOrder = new Map<string, typeof items>()
      for (const item of items) {
        const list = itemsByOrder.get(item.orderId) ?? []
        list.push(item)
        itemsByOrder.set(item.orderId, list)
      }

      res.json(
        paginatedResult(
          orders.map((o) => ({
            ...o,
            orderDate: String(o.orderDate),
            items: (itemsByOrder.get(o.id) ?? []).map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          })),
          count,
          page,
          limit,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/orders/:id', async (req, res, next) => {
    try {
      const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, req.params.id))
      if (!order) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      const items = await db
        .select()
        .from(salesOrderItems)
        .where(eq(salesOrderItems.orderId, order.id))
      res.json({
        ...order,
        orderDate: String(order.orderDate),
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/summary', async (_req, res, next) => {
    try {
      const [[{ totalEmployees }], [{ activeEmployees }], [{ totalProducts }], [{ totalCustomers }]] =
        await Promise.all([
          db.select({ totalEmployees: sql<number>`count(*)::int` }).from(employees),
          db
            .select({ activeEmployees: sql<number>`count(*)::int` })
            .from(employees)
            .where(eq(employees.status, 'Active')),
          db.select({ totalProducts: sql<number>`count(*)::int` }).from(products),
          db.select({ totalCustomers: sql<number>`count(*)::int` }).from(customers),
        ])

      const lowStockProducts = await db
        .select({ productId: inventoryRecords.productId })
        .from(inventoryRecords)
        .where(eq(inventoryRecords.status, 'Low Stock'))
        .groupBy(inventoryRecords.productId)

      const outOfStockProducts = await db
        .select({ productId: inventoryRecords.productId })
        .from(inventoryRecords)
        .where(eq(inventoryRecords.status, 'Out of Stock'))
        .groupBy(inventoryRecords.productId)

      const [{ pendingOrders }] = await db
        .select({ pendingOrders: sql<number>`count(*)::int` })
        .from(salesOrders)
        .where(inArray(salesOrders.status, ['Pending', 'Processing', 'Confirmed']))

      const [{ monthlyRevenue }] = await db
        .select({ monthlyRevenue: sql<number>`coalesce(sum(${salesOrders.total}), 0)` })
        .from(salesOrders)
        .where(
          and(
            gte(salesOrders.orderDate, '2026-09-01'),
            lte(salesOrders.orderDate, '2026-09-30'),
            sql`${salesOrders.status} <> 'Cancelled'`,
          ),
        )

      const [{ monthlyExpenses }] = await db
        .select({ monthlyExpenses: sql<number>`coalesce(sum(${purchaseOrders.total}), 0)` })
        .from(purchaseOrders)
        .where(
          and(
            gte(purchaseOrders.orderDate, '2026-09-01'),
            lte(purchaseOrders.orderDate, '2026-09-30'),
            sql`${purchaseOrders.status} <> 'Cancelled'`,
          ),
        )

      const [{ pendingInvoices }] = await db
        .select({ pendingInvoices: sql<number>`count(*)::int` })
        .from(invoices)
        .where(inArray(invoices.status, ['Sent', 'Partially Paid']))

      const [{ overdueInvoices }] = await db
        .select({ overdueInvoices: sql<number>`count(*)::int` })
        .from(invoices)
        .where(eq(invoices.status, 'Overdue'))

      const [{ pendingPurchaseOrders }] = await db
        .select({ pendingPurchaseOrders: sql<number>`count(*)::int` })
        .from(purchaseOrders)
        .where(inArray(purchaseOrders.status, ['Pending Approval', 'Approved', 'Ordered']))

      const [{ newEmployeesThisMonth }] = await db
        .select({ newEmployeesThisMonth: sql<number>`count(*)::int` })
        .from(employees)
        .where(
          and(gte(employees.joiningDate, '2026-09-01'), lte(employees.joiningDate, '2026-09-30')),
        )

      const [{ prevMonthRevenue }] = await db
        .select({ prevMonthRevenue: sql<number>`coalesce(sum(${salesOrders.total}), 0)` })
        .from(salesOrders)
        .where(
          and(
            gte(salesOrders.orderDate, '2026-08-01'),
            lte(salesOrders.orderDate, '2026-08-31'),
            sql`${salesOrders.status} <> 'Cancelled'`,
          ),
        )

      const [{ prevMonthExpenses }] = await db
        .select({ prevMonthExpenses: sql<number>`coalesce(sum(${purchaseOrders.total}), 0)` })
        .from(purchaseOrders)
        .where(
          and(
            gte(purchaseOrders.orderDate, '2026-08-01'),
            lte(purchaseOrders.orderDate, '2026-08-31'),
            sql`${purchaseOrders.status} <> 'Cancelled'`,
          ),
        )

      const revenueChangePercent =
        prevMonthRevenue > 0
          ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 1000) / 10
          : 0
      const expenseChangePercent =
        prevMonthExpenses > 0
          ? Math.round(((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 1000) / 10
          : 0

      res.json({
        totalEmployees,
        activeEmployees,
        newEmployeesThisMonth,
        totalProducts,
        lowStockProducts: lowStockProducts.length,
        outOfStockProducts: outOfStockProducts.length,
        totalCustomers,
        pendingOrders,
        monthlyRevenue,
        monthlyExpenses,
        pendingInvoices,
        overdueInvoices,
        pendingPurchaseOrders,
        revenueChangePercent,
        expenseChangePercent,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/recent-orders', async (_req, res, next) => {
    try {
      const orders = await db.select().from(salesOrders).orderBy(desc(salesOrders.orderDate)).limit(6)
      const orderIds = orders.map((o) => o.id)
      const items =
        orderIds.length === 0
          ? []
          : await db.select().from(salesOrderItems).where(inArray(salesOrderItems.orderId, orderIds))
      const itemsByOrder = new Map<string, typeof items>()
      for (const item of items) {
        const list = itemsByOrder.get(item.orderId) ?? []
        list.push(item)
        itemsByOrder.set(item.orderId, list)
      }
      res.json(
        orders.map((o) => ({
          ...o,
          orderDate: String(o.orderDate),
          items: (itemsByOrder.get(o.id) ?? []).map((item) => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        })),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/low-stock', async (_req, res, next) => {
    try {
      const rows = await db
        .select()
        .from(inventoryRecords)
        .where(inArray(inventoryRecords.status, ['Low Stock', 'Out of Stock']))
        .limit(6)
      res.json(rows.map((r) => ({ ...r, lastUpdated: r.lastUpdated.toISOString() })))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/activities', async (_req, res, next) => {
    try {
      const rows = await db.select().from(dashboardActivities).orderBy(desc(dashboardActivities.timestamp))
      res.json(rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/approvals', async (_req, res, next) => {
    try {
      const rows = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.status, 'Pending'))
        .limit(5)
      res.json(
        rows.map((l) => ({
          id: l.id,
          type: 'Leave' as const,
          reference: l.leaveType,
          requestedBy: l.employeeName,
          date: String(l.startDate),
        })),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/charts', async (_req, res, next) => {
    try {
      const orders = await db
        .select({ orderDate: salesOrders.orderDate, total: salesOrders.total, status: salesOrders.status })
        .from(salesOrders)
        .where(
          and(
            gte(salesOrders.orderDate, '2026-09-01'),
            lte(salesOrders.orderDate, '2026-09-30'),
            sql`${salesOrders.status} <> 'Cancelled'`,
          ),
        )

      const weekBuckets = [
        { label: 'Week 1', from: 1, to: 7, revenue: 0 },
        { label: 'Week 2', from: 8, to: 14, revenue: 0 },
        { label: 'Week 3', from: 15, to: 21, revenue: 0 },
        { label: 'Week 4', from: 22, to: 30, revenue: 0 },
      ]

      for (const order of orders) {
        const day = Number(String(order.orderDate).slice(8, 10))
        const bucket = weekBuckets.find((w) => day >= w.from && day <= w.to)
        if (bucket) bucket.revenue += order.total
      }

      const statusMap = new Map<string, number>()
      const allOrders = await db.select({ status: salesOrders.status }).from(salesOrders)
      for (const row of allOrders) {
        statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1)
      }

      const orderStatusBreakdown = [...statusMap.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      res.json({
        revenueSeries: weekBuckets.map(({ label, revenue }) => ({ label, revenue: Math.round(revenue) })),
        orderStatusBreakdown,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/settings', async (_req, res, next) => {
    try {
      res.json(await readSettings())
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/settings', async (req, res, next) => {
    try {
      res.json(await saveSettings(req.body))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/nav-stats', async (_req, res, next) => {
    try {
      const [{ pendingOrders }] = await db
        .select({ pendingOrders: sql<number>`count(*)::int` })
        .from(salesOrders)
        .where(inArray(salesOrders.status, ['Pending', 'Processing', 'Confirmed']))
      const [{ pendingLeaves }] = await db
        .select({ pendingLeaves: sql<number>`count(*)::int` })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, 'Pending'))
      res.json({ pendingOrders, pendingLeaves })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/search', async (req, res, next) => {
    try {
      const q = String(req.query.q ?? '').trim()
      if (q.length < 2) {
        res.json({ products: [], employees: [], orders: [], customers: [] })
        return
      }
      const pattern = `%${q}%`
      const [productRows, employeeRows, orderRows, customerRows] = await Promise.all([
        db
          .select({ id: products.id, label: products.name, sub: products.sku })
          .from(products)
          .where(or(ilike(products.name, pattern), ilike(products.sku, pattern)))
          .limit(5),
        db
          .select({ id: employees.id, label: employees.fullName, sub: employees.email })
          .from(employees)
          .where(or(ilike(employees.fullName, pattern), ilike(employees.email, pattern)))
          .limit(5),
        db
          .select({ id: salesOrders.id, label: salesOrders.orderNumber, sub: salesOrders.customerName })
          .from(salesOrders)
          .where(or(ilike(salesOrders.orderNumber, pattern), ilike(salesOrders.customerName, pattern)))
          .limit(5),
        db
          .select({ id: customers.id, label: customers.companyName, sub: customers.contactPerson })
          .from(customers)
          .where(or(ilike(customers.companyName, pattern), ilike(customers.contactPerson, pattern)))
          .limit(5),
      ])
      res.json({
        products: productRows.map((r) => ({ ...r, type: 'product' as const, href: '/products' })),
        employees: employeeRows.map((r) => ({ ...r, type: 'employee' as const, href: '/employees' })),
        orders: orderRows.map((r) => ({ ...r, type: 'order' as const, href: '/orders' })),
        customers: customerRows.map((r) => ({ ...r, type: 'customer' as const, href: '/customers' })),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/purchase-orders', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const status = String(req.query.status ?? 'all')
      const filters = []
      if (search) {
        filters.push(
          or(
            ilike(purchaseOrders.poNumber, `%${search}%`),
            ilike(purchaseOrders.supplierName, `%${search}%`),
          ),
        )
      }
      if (status !== 'all') filters.push(eq(purchaseOrders.status, status))
      const where = filters.length ? and(...filters) : undefined
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseOrders)
        .where(where)
      const rows = await db
        .select()
        .from(purchaseOrders)
        .where(where)
        .orderBy(desc(purchaseOrders.orderDate))
        .limit(limit)
        .offset(offset)
      res.json(
        paginatedResult(
          rows.map((r) => ({
            ...r,
            orderDate: String(r.orderDate),
            expectedDeliveryDate: String(r.expectedDeliveryDate),
          })),
          count,
          page,
          limit,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/purchase-orders/:id', async (req, res, next) => {
    try {
      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, req.params.id))
      if (!po) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      const items = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, po.id))
      res.json({
        ...po,
        orderDate: String(po.orderDate),
        expectedDeliveryDate: String(po.expectedDeliveryDate),
        items,
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/invoices', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const status = String(req.query.status ?? 'all')
      const filters = []
      if (search) {
        filters.push(
          or(
            ilike(invoices.invoiceNumber, `%${search}%`),
            ilike(invoices.customerName, `%${search}%`),
            ilike(invoices.orderNumber, `%${search}%`),
          ),
        )
      }
      if (status !== 'all') filters.push(eq(invoices.status, status))
      const where = filters.length ? and(...filters) : undefined
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(where)
      const rows = await db
        .select()
        .from(invoices)
        .where(where)
        .orderBy(desc(invoices.invoiceDate))
        .limit(limit)
        .offset(offset)
      res.json(
        paginatedResult(
          rows.map((r) => ({
            ...r,
            invoiceDate: String(r.invoiceDate),
            dueDate: String(r.dueDate),
          })),
          count,
          page,
          limit,
        ),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/invoices/:id', async (req, res, next) => {
    try {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, req.params.id))
      if (!inv) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.json({
        ...inv,
        invoiceDate: String(inv.invoiceDate),
        dueDate: String(inv.dueDate),
      })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/reports', async (req, res, next) => {
    try {
      const type = String(req.query.type ?? 'sales')
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim().toLowerCase()
      const status = String(req.query.status ?? 'all')
      const dateFrom = String(req.query.dateFrom ?? '')
      const dateTo = String(req.query.dateTo ?? '')

      type Row = Record<string, string | number>
      let rows: Row[] = []

      if (type === 'sales' || type === 'revenue') {
        const orders = await db.select().from(salesOrders).orderBy(desc(salesOrders.orderDate))
        rows = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customer: o.customerName,
          date: String(o.orderDate),
          status: o.status,
          total: o.total,
          paymentStatus: o.paymentStatus,
        }))
      } else if (type === 'inventory') {
        const inv = await db.select().from(inventoryRecords)
        rows = inv.map((r) => ({
          sku: r.sku,
          product: r.productName,
          warehouse: r.warehouseName,
          available: r.availableQuantity,
          status: r.status,
          lastUpdated: r.lastUpdated.toISOString(),
        }))
      } else if (type === 'employees' || type === 'attendance') {
        const emps = await db.select().from(employees)
        rows = emps.map((e) => ({
          employeeId: e.id,
          name: e.fullName,
          department: e.departmentName,
          designation: e.designation,
          status: e.status,
          joiningDate: String(e.joiningDate),
        }))
      } else if (type === 'purchase') {
        const pos = await db.select().from(purchaseOrders)
        rows = pos.map((po) => ({
          poNumber: po.poNumber,
          supplier: po.supplierName,
          date: String(po.orderDate),
          status: po.status,
          total: po.total,
        }))
      } else if (type === 'invoices') {
        const invs = await db.select().from(invoices)
        rows = invs.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          customer: inv.customerName,
          orderNumber: inv.orderNumber,
          date: String(inv.invoiceDate),
          status: inv.status,
          total: inv.total,
          amountDue: inv.amountDue,
        }))
      }

      const filtered = rows.filter((row) => {
        const text = Object.values(row).join(' ').toLowerCase()
        const matchesSearch = !search || text.includes(search)
        const matchesStatus = status === 'all' || String(row.status ?? '') === status
        const dateValue = String(row.date ?? row.joiningDate ?? '')
        const matchesFrom = !dateFrom || dateValue >= dateFrom
        const matchesTo = !dateTo || dateValue <= dateTo
        return matchesSearch && matchesStatus && matchesFrom && matchesTo
      })

      const exportAll = String(req.query.export ?? '') === '1'
      const pageLimit = exportAll
        ? Math.min(filtered.length, 10_000)
        : Math.max(1, Math.min(100, Number(req.query.limit) || 25))
      const pageNum = exportAll ? 1 : page
      const pageOffset = exportAll ? 0 : offset

      let summary: Record<string, number | string> = { totalRows: filtered.length }
      if (type === 'sales' || type === 'revenue' || type === 'invoices' || type === 'purchase') {
        const sumTotal = filtered.reduce((acc, row) => acc + Number(row.total ?? 0), 0)
        summary = { totalRows: filtered.length, primaryMetric: Math.round(sumTotal), primaryMetricLabel: 'Total value (INR)' }
      } else if (type === 'inventory') {
        const atRisk = filtered.filter((row) => ['Low Stock', 'Out of Stock'].includes(String(row.status))).length
        summary = { totalRows: filtered.length, primaryMetric: atRisk, primaryMetricLabel: 'At-risk SKUs' }
      } else if (type === 'employees' || type === 'attendance') {
        const active = filtered.filter((row) => row.status === 'Active').length
        summary = { totalRows: filtered.length, primaryMetric: active, primaryMetricLabel: 'Active employees' }
      }

      res.json({
        ...paginatedResult(filtered.slice(pageOffset, pageOffset + pageLimit), filtered.length, pageNum, pageLimit),
        summary,
      })
    } catch (error) {
      next(error)
    }
  })

  addWriteRoutes(app)

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
