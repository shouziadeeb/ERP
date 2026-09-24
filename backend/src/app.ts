/**
 * Express app factory: CORS + JSON, health/login, then authenticated GET routes.
 * POST/PATCH creates for products, orders, etc. are in writeRoutes.ts.
 *
 * Database access uses Prisma (`prisma` from db/index.ts) — each handler builds
 * a typed `where` / `orderBy` object instead of raw SQL fragments.
 */
import type { Prisma } from '@prisma/client'
import cors from 'cors'
import express from 'express'
import { performance } from 'node:perf_hooks'
import { prisma } from './db/index.js'
import { generateEmployeeAttendance } from './lib/attendance.js'
import { listEmployees } from './lib/employeePagination.js'
import { paginatedResult, parsePagination } from './lib/pagination.js'
import { loginHandler, requireApiAuth } from './lib/auth.js'
import { readSettings, saveSettings } from './lib/settings.js'
import { addWriteRoutes } from './writeRoutes.js'
import { parseDateOnly, toDateOnlyString } from './lib/dates.js'

/** Case-insensitive substring search (Postgres ILIKE equivalent in Prisma). */
function contains(term: string): Prisma.StringFilter {
  return { contains: term, mode: 'insensitive' }
}

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ ok: true, database: true })
    } catch {
      res.status(503).json({ ok: false, database: false })
    }
  })

  app.post('/api/auth/login', loginHandler)
  // Everything below requires Authorization: Bearer <token>.
  app.use('/api', requireApiAuth)

  // --- Lookup tables (small lists, no pagination) ---
  app.get('/api/departments', async (_req, res) => {
    res.json(await prisma.department.findMany())
  })

  app.get('/api/categories', async (_req, res) => {
    res.json(await prisma.productCategory.findMany())
  })

  app.get('/api/warehouses', async (_req, res) => {
    res.json(await prisma.warehouse.findMany())
  })

  // --- Master data lists (paginated search) ---
  app.get('/api/suppliers', async (req, res, next) => {
    try {
      const listAll = String(req.query.all ?? '') === '1'
      if (listAll) {
        const rows = await prisma.supplier.findMany({
          orderBy: { companyName: 'asc' },
          take: 500,
        })
        res.json(rows)
        return
      }
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const where: Prisma.SupplierWhereInput | undefined = search
        ? {
            OR: [{ companyName: contains(search) }, { contactPerson: contains(search) }],
          }
        : undefined
      const count = await prisma.supplier.count({ where })
      const rows = await prisma.supplier.findMany({
        where,
        orderBy: { companyName: 'asc' },
        take: limit,
        skip: offset,
      })
      res.json(paginatedResult(rows, count, page, limit))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/customers', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const where: Prisma.CustomerWhereInput | undefined = search
        ? {
            OR: [{ companyName: contains(search) }, { contactPerson: contains(search) }],
          }
        : undefined
      const count = await prisma.customer.count({ where })
      const rows = await prisma.customer.findMany({ where, take: limit, skip: offset })
      res.json(paginatedResult(rows, count, page, limit))
    } catch (error) {
      next(error)
    }
  })

  // --- Employees (large list uses dedicated pagination module) ---
  app.get('/api/employees', async (req, res, next) => {
    const start = performance.now()
    try {
      const dbStart = performance.now()
      const q = req.query as Record<string, unknown>
      const employees = await listEmployees({
        page: Number(q.page) || 1,
        limit: Number(q.limit) || 25,
        search: String(q.search ?? ''),
        departmentId: String(q.departmentId ?? 'all'),
        status: String(q.status ?? 'all'),
        country: String(q.country ?? 'all'),
        sortBy: String(q.sortBy ?? 'fullName'),
        sortOrder: String(q.sortOrder ?? 'asc') === 'desc' ? 'desc' : 'asc',
      })
      const dbTime = performance.now() - dbStart
      console.log(`DB query: ${dbTime.toFixed(2)}ms`)
      console.log(`Total /api/employees: ${(performance.now() - start).toFixed(2)}ms`)
      res.json(employees)
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/employees/:id/detail', async (req, res, next) => {
    try {
      const employee = await prisma.employee.findUnique({ where: { id: req.params.id } })
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' })
        return
      }
      const manager = employee.managerId
        ? await prisma.employee.findUnique({ where: { id: employee.managerId } })
        : null
      const attendance = generateEmployeeAttendance(employee.id, 2026, 9)
      const employeeLeaves = await prisma.leaveRequest.findMany({
        where: { employeeId: employee.id },
        take: 5,
      })
      const payroll = await prisma.payrollRecord.findFirst({
        where: { employeeId: employee.id },
      })

      const joining = toDateOnlyString(employee.joiningDate)
      res.json({
        employee: { ...employee, joiningDate: joining },
        manager: manager ? { ...manager, joiningDate: toDateOnlyString(manager.joiningDate) } : null,
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
          startDate: toDateOnlyString(l.startDate),
          endDate: toDateOnlyString(l.endDate),
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
      const nextIndex = (await prisma.employee.count()) + 1
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
        joiningDate: parseDateOnly(body.joiningDate, new Date()),
        status: String(body.status),
        skills: (body.skills as string[]) ?? [],
        avatar: null,
      }
      await prisma.employee.create({ data: row })
      res.status(201).json({ ...row, joiningDate: String(body.joiningDate) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/employees/:id', async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>
      const current = await prisma.employee.findUnique({ where: { id: req.params.id } })
      if (!current) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      const firstName = body.firstName ? String(body.firstName) : current.firstName
      const lastName = body.lastName ? String(body.lastName) : current.lastName
      const updated = await prisma.employee.update({
        where: { id: req.params.id },
        data: {
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`,
          email: String(body.email ?? current.email),
          phone: String(body.phone ?? current.phone),
          country: String(body.country ?? current.country),
          city: String(body.city ?? current.city),
          departmentId: String(body.departmentId ?? current.departmentId),
          departmentName: String(body.departmentName ?? current.departmentName),
          designationId: String(body.designationId ?? current.designationId),
          designation: String(body.designation ?? current.designation),
          managerId:
            body.managerId === '' ? null : (body.managerId as string | null | undefined) ?? current.managerId,
          employmentType: String(body.employmentType ?? current.employmentType),
          joiningDate: parseDateOnly(body.joiningDate ?? current.joiningDate, current.joiningDate),
          status: String(body.status ?? current.status),
          skills: (body.skills as string[]) ?? (current.skills as string[]),
          avatar: body.avatar !== undefined ? (body.avatar as string | null) : current.avatar,
        },
      })
      res.json({ ...updated, joiningDate: toDateOnlyString(updated.joiningDate) })
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/employees/:id', async (req, res, next) => {
    try {
      await prisma.employee.delete({ where: { id: req.params.id } })
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  // --- Catalog, inventory, sales orders ---
  app.get('/api/products', async (req, res, next) => {
    try {
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>)
      const search = String(req.query.search ?? '').trim()
      const categoryId = String(req.query.categoryId ?? 'all')
      const status = String(req.query.status ?? 'all')
      const stock = String(req.query.stock ?? 'all')

      const and: Prisma.ProductWhereInput[] = []
      if (search) {
        and.push({
          OR: [{ name: contains(search) }, { sku: contains(search) }, { brand: contains(search) }],
        })
      }
      if (categoryId !== 'all') and.push({ categoryId })
      if (status !== 'all') and.push({ status })
      const where: Prisma.ProductWhereInput | undefined = and.length ? { AND: and } : undefined

      const stockMap = new Map<string, number>()
      const stockRows = await prisma.inventoryRecord.groupBy({
        by: ['productId'],
        _sum: { availableQuantity: true },
      })
      for (const row of stockRows) stockMap.set(row.productId, row._sum.availableQuantity ?? 0)

      const all = await prisma.product.findMany({ where, orderBy: { name: 'asc' } })
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
      await prisma.product.delete({ where: { id: req.params.id } })
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

      const and: Prisma.InventoryRecordWhereInput[] = []
      if (search) {
        and.push({
          OR: [
            { productName: contains(search) },
            { sku: contains(search) },
            { warehouseName: contains(search) },
          ],
        })
      }
      if (warehouseId !== 'all') and.push({ warehouseId })
      if (status !== 'all') and.push({ status })
      const where: Prisma.InventoryRecordWhereInput | undefined = and.length ? { AND: and } : undefined

      const count = await prisma.inventoryRecord.count({ where })
      const rows = await prisma.inventoryRecord.findMany({
        where,
        orderBy: { productName: 'asc' },
        take: limit,
        skip: offset,
      })

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

      const and: Prisma.SalesOrderWhereInput[] = []
      if (search) {
        and.push({
          OR: [{ orderNumber: contains(search) }, { customerName: contains(search) }],
        })
      }
      if (status !== 'all') and.push({ status })
      if (paymentStatus !== 'all') and.push({ paymentStatus })
      if (dateFrom) and.push({ orderDate: { gte: new Date(dateFrom) } })
      if (dateTo) and.push({ orderDate: { lte: new Date(dateTo) } })
      const where: Prisma.SalesOrderWhereInput | undefined = and.length ? { AND: and } : undefined

      const count = await prisma.salesOrder.count({ where })
      const orders = await prisma.salesOrder.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        take: limit,
        skip: offset,
      })

      const orderIds = orders.map((o) => o.id)
      const items =
        orderIds.length === 0
          ? []
          : await prisma.salesOrderItem.findMany({ where: { orderId: { in: orderIds } } })

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
            orderDate: toDateOnlyString(o.orderDate),
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
      const order = await prisma.salesOrder.findUnique({ where: { id: req.params.id } })
      if (!order) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      const items = await prisma.salesOrderItem.findMany({ where: { orderId: order.id } })
      res.json({
        ...order,
        orderDate: toDateOnlyString(order.orderDate),
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

  // --- Dashboard aggregates ---
  app.get('/api/dashboard/summary', async (_req, res, next) => {
    try {
      const [
        totalEmployees,
        activeEmployees,
        totalProducts,
        totalCustomers,
        lowStockProducts,
        outOfStockProducts,
        pendingOrders,
        monthlyRevenueAgg,
        monthlyExpensesAgg,
        pendingInvoices,
        overdueInvoices,
        pendingPurchaseOrders,
        newEmployeesThisMonth,
        prevMonthRevenueAgg,
        prevMonthExpensesAgg,
      ] = await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: 'Active' } }),
        prisma.product.count(),
        prisma.customer.count(),
        prisma.inventoryRecord.groupBy({
          by: ['productId'],
          where: { status: 'Low Stock' },
        }),
        prisma.inventoryRecord.groupBy({
          by: ['productId'],
          where: { status: 'Out of Stock' },
        }),
        prisma.salesOrder.count({
          where: { status: { in: ['Pending', 'Processing', 'Confirmed'] } },
        }),
        prisma.salesOrder.aggregate({
          _sum: { total: true },
          where: {
            orderDate: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') },
            status: { not: 'Cancelled' },
          },
        }),
        prisma.purchaseOrder.aggregate({
          _sum: { total: true },
          where: {
            orderDate: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') },
            status: { not: 'Cancelled' },
          },
        }),
        prisma.invoice.count({ where: { status: { in: ['Sent', 'Partially Paid'] } } }),
        prisma.invoice.count({ where: { status: 'Overdue' } }),
        prisma.purchaseOrder.count({
          where: { status: { in: ['Pending Approval', 'Approved', 'Ordered'] } },
        }),
        prisma.employee.count({
          where: {
            joiningDate: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') },
          },
        }),
        prisma.salesOrder.aggregate({
          _sum: { total: true },
          where: {
            orderDate: { gte: new Date('2026-08-01'), lte: new Date('2026-08-31') },
            status: { not: 'Cancelled' },
          },
        }),
        prisma.purchaseOrder.aggregate({
          _sum: { total: true },
          where: {
            orderDate: { gte: new Date('2026-08-01'), lte: new Date('2026-08-31') },
            status: { not: 'Cancelled' },
          },
        }),
      ])

      const monthlyRevenue = monthlyRevenueAgg._sum.total ?? 0
      const monthlyExpenses = monthlyExpensesAgg._sum.total ?? 0
      const prevMonthRevenue = prevMonthRevenueAgg._sum.total ?? 0
      const prevMonthExpenses = prevMonthExpensesAgg._sum.total ?? 0

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
      const orders = await prisma.salesOrder.findMany({
        orderBy: { orderDate: 'desc' },
        take: 6,
      })
      const orderIds = orders.map((o) => o.id)
      const items =
        orderIds.length === 0
          ? []
          : await prisma.salesOrderItem.findMany({ where: { orderId: { in: orderIds } } })
      const itemsByOrder = new Map<string, typeof items>()
      for (const item of items) {
        const list = itemsByOrder.get(item.orderId) ?? []
        list.push(item)
        itemsByOrder.set(item.orderId, list)
      }
      res.json(
        orders.map((o) => ({
          ...o,
          orderDate: toDateOnlyString(o.orderDate),
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
      const rows = await prisma.inventoryRecord.findMany({
        where: { status: { in: ['Low Stock', 'Out of Stock'] } },
        take: 6,
      })
      res.json(rows.map((r) => ({ ...r, lastUpdated: r.lastUpdated.toISOString() })))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/activities', async (_req, res, next) => {
    try {
      const rows = await prisma.dashboardActivity.findMany({ orderBy: { timestamp: 'desc' } })
      res.json(rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })))
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/approvals', async (_req, res, next) => {
    try {
      const rows = await prisma.leaveRequest.findMany({
        where: { status: 'Pending' },
        take: 5,
      })
      res.json(
        rows.map((l) => ({
          id: l.id,
          type: 'Leave' as const,
          reference: l.leaveType,
          requestedBy: l.employeeName,
          date: toDateOnlyString(l.startDate),
        })),
      )
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/dashboard/charts', async (_req, res, next) => {
    try {
      const orders = await prisma.salesOrder.findMany({
        where: {
          orderDate: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') },
          status: { not: 'Cancelled' },
        },
        select: { orderDate: true, total: true, status: true },
      })

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
      const allOrders = await prisma.salesOrder.findMany({ select: { status: true } })
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

  // --- Settings, shell helpers, procurement/finance reads, reports ---
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
      const [pendingOrders, pendingLeaves] = await Promise.all([
        prisma.salesOrder.count({
          where: { status: { in: ['Pending', 'Processing', 'Confirmed'] } },
        }),
        prisma.leaveRequest.count({ where: { status: 'Pending' } }),
      ])
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
      const [productRows, employeeRows, orderRows, customerRows] = await Promise.all([
        prisma.product.findMany({
          where: { OR: [{ name: contains(q) }, { sku: contains(q) }] },
          select: { id: true, name: true, sku: true },
          take: 5,
        }),
        prisma.employee.findMany({
          where: { OR: [{ fullName: contains(q) }, { email: contains(q) }] },
          select: { id: true, fullName: true, email: true },
          take: 5,
        }),
        prisma.salesOrder.findMany({
          where: { OR: [{ orderNumber: contains(q) }, { customerName: contains(q) }] },
          select: { id: true, orderNumber: true, customerName: true },
          take: 5,
        }),
        prisma.customer.findMany({
          where: { OR: [{ companyName: contains(q) }, { contactPerson: contains(q) }] },
          select: { id: true, companyName: true, contactPerson: true },
          take: 5,
        }),
      ])
      res.json({
        products: productRows.map((r) => ({ id: r.id, label: r.name, sub: r.sku, type: 'product' as const, href: '/products' })),
        employees: employeeRows.map((r) => ({ id: r.id, label: r.fullName, sub: r.email, type: 'employee' as const, href: '/employees' })),
        orders: orderRows.map((r) => ({ id: r.id, label: r.orderNumber, sub: r.customerName, type: 'order' as const, href: '/orders' })),
        customers: customerRows.map((r) => ({ id: r.id, label: r.companyName, sub: r.contactPerson, type: 'customer' as const, href: '/customers' })),
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
      const and: Prisma.PurchaseOrderWhereInput[] = []
      if (search) {
        and.push({
          OR: [{ poNumber: contains(search) }, { supplierName: contains(search) }],
        })
      }
      if (status !== 'all') and.push({ status })
      const where: Prisma.PurchaseOrderWhereInput | undefined = and.length ? { AND: and } : undefined
      const count = await prisma.purchaseOrder.count({ where })
      const rows = await prisma.purchaseOrder.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        take: limit,
        skip: offset,
      })
      res.json(
        paginatedResult(
          rows.map((r) => ({
            ...r,
            orderDate: toDateOnlyString(r.orderDate),
            expectedDeliveryDate: toDateOnlyString(r.expectedDeliveryDate),
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
      const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } })
      if (!po) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      const items = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } })
      res.json({
        ...po,
        orderDate: toDateOnlyString(po.orderDate),
        expectedDeliveryDate: toDateOnlyString(po.expectedDeliveryDate),
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
      const and: Prisma.InvoiceWhereInput[] = []
      if (search) {
        and.push({
          OR: [
            { invoiceNumber: contains(search) },
            { customerName: contains(search) },
            { orderNumber: contains(search) },
          ],
        })
      }
      if (status !== 'all') and.push({ status })
      const where: Prisma.InvoiceWhereInput | undefined = and.length ? { AND: and } : undefined
      const count = await prisma.invoice.count({ where })
      const rows = await prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        take: limit,
        skip: offset,
      })
      res.json(
        paginatedResult(
          rows.map((r) => ({
            ...r,
            invoiceDate: toDateOnlyString(r.invoiceDate),
            dueDate: toDateOnlyString(r.dueDate),
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
      const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } })
      if (!inv) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.json({
        ...inv,
        invoiceDate: toDateOnlyString(inv.invoiceDate),
        dueDate: toDateOnlyString(inv.dueDate),
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
        const orders = await prisma.salesOrder.findMany({ orderBy: { orderDate: 'desc' } })
        rows = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customer: o.customerName,
          date: toDateOnlyString(o.orderDate),
          status: o.status,
          total: o.total,
          paymentStatus: o.paymentStatus,
        }))
      } else if (type === 'inventory') {
        const inv = await prisma.inventoryRecord.findMany()
        rows = inv.map((r) => ({
          sku: r.sku,
          product: r.productName,
          warehouse: r.warehouseName,
          available: r.availableQuantity,
          status: r.status,
          lastUpdated: r.lastUpdated.toISOString(),
        }))
      } else if (type === 'employees' || type === 'attendance') {
        const emps = await prisma.employee.findMany()
        rows = emps.map((e) => ({
          employeeId: e.id,
          name: e.fullName,
          department: e.departmentName,
          designation: e.designation,
          status: e.status,
          joiningDate: toDateOnlyString(e.joiningDate),
        }))
      } else if (type === 'purchase') {
        const pos = await prisma.purchaseOrder.findMany()
        rows = pos.map((po) => ({
          poNumber: po.poNumber,
          supplier: po.supplierName,
          date: toDateOnlyString(po.orderDate),
          status: po.status,
          total: po.total,
        }))
      } else if (type === 'invoices') {
        const invs = await prisma.invoice.findMany()
        rows = invs.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          customer: inv.customerName,
          orderNumber: inv.orderNumber,
          date: toDateOnlyString(inv.invoiceDate),
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

  // Register POST/PATCH handlers (products, orders, inventory, leaves, …).
  addWriteRoutes(app)

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
