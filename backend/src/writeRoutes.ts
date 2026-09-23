import { eq, sql } from 'drizzle-orm'
import type { Express } from 'express'
import { db } from './db/index.js'
import {
  customers,
  employees,
  inventoryRecords,
  leaveRequests,
  products,
  salesOrderItems,
  salesOrders,
  suppliers,
  warehouses,
} from './db/schema.js'
import {
  calcAvailable,
  calcInventoryStatus,
  roundMoney,
} from './lib/inventoryHelpers.js'

async function tableCount(
  table:
    | typeof products
    | typeof inventoryRecords
    | typeof salesOrders
    | typeof customers
    | typeof leaveRequests
    | typeof suppliers,
): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(table)
  return count
}

export function addWriteRoutes(app: Express) {
  app.post('/api/products', async (req, res, next) => {
    try {
      const body = req.body
      const num = (await tableCount(products)) + 1
      const id = `PRD-${String(num).padStart(5, '0')}`

      const row = {
        id,
        sku: String(body.sku),
        name: String(body.name),
        categoryId: String(body.categoryId),
        categoryName: String(body.categoryName),
        brand: String(body.brand),
        unit: String(body.unit ?? 'Piece'),
        costPrice: Number(body.costPrice),
        sellingPrice: Number(body.sellingPrice),
        taxRate: Number(body.taxRate ?? 18),
        status: String(body.status ?? 'Active'),
        supplierId: String(body.supplierId),
        reorderLevel: Number(body.reorderLevel ?? 10),
      }

      await db.insert(products).values(row)

      const [warehouse] = await db.select().from(warehouses).limit(1)
      if (warehouse) {
        const invNum = (await tableCount(inventoryRecords)) + 1
        const quantity = Number(body.initialStock ?? 0)
        const reservedQuantity = 0
        const availableQuantity = calcAvailable(quantity, reservedQuantity)
        const reorderLevel = row.reorderLevel
        await db.insert(inventoryRecords).values({
          id: `INV-${String(invNum).padStart(5, '0')}`,
          productId: row.id,
          sku: row.sku,
          productName: row.name,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          quantity,
          reservedQuantity,
          availableQuantity,
          reorderLevel,
          status: calcInventoryStatus(availableQuantity, reorderLevel),
          lastUpdated: new Date(),
        })
      }

      res.status(201).json(row)
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/products/:id', async (req, res, next) => {
    try {
      const [updated] = await db
        .update(products)
        .set(req.body)
        .where(eq(products.id, req.params.id))
        .returning()
      if (!updated) {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      res.json(updated)
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/inventory', async (req, res, next) => {
    try {
      const body = req.body
      const [product] = await db.select().from(products).where(eq(products.id, String(body.productId)))
      const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, String(body.warehouseId)))
      if (!product || !warehouse) {
        res.status(400).json({ error: 'Invalid product or warehouse' })
        return
      }

      const num = (await tableCount(inventoryRecords)) + 1
      const quantity = Number(body.quantity)
      const reservedQuantity = Number(body.reservedQuantity ?? 0)
      const availableQuantity = calcAvailable(quantity, reservedQuantity)
      const reorderLevel = Number(body.reorderLevel ?? product.reorderLevel)

      const row = {
        id: `INV-${String(num).padStart(5, '0')}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        quantity,
        reservedQuantity,
        availableQuantity,
        reorderLevel,
        status: calcInventoryStatus(quantity, availableQuantity, reorderLevel),
        lastUpdated: new Date(),
      }

      await db.insert(inventoryRecords).values(row)
      res.status(201).json({ ...row, lastUpdated: row.lastUpdated.toISOString() })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/inventory/:id', async (req, res, next) => {
    try {
      const [current] = await db.select().from(inventoryRecords).where(eq(inventoryRecords.id, req.params.id))
      if (!current) {
        res.status(404).json({ error: 'Inventory record not found' })
        return
      }

      const quantity = req.body.quantity ?? current.quantity
      const reservedQuantity = Math.min(quantity, req.body.reservedQuantity ?? current.reservedQuantity)
      const availableQuantity = calcAvailable(quantity, reservedQuantity)
      const reorderLevel = req.body.reorderLevel ?? current.reorderLevel

      const [updated] = await db
        .update(inventoryRecords)
        .set({
          quantity,
          reservedQuantity,
          availableQuantity,
          reorderLevel,
          status: calcInventoryStatus(quantity, availableQuantity, reorderLevel),
          lastUpdated: new Date(),
        })
        .where(eq(inventoryRecords.id, req.params.id))
        .returning()

      res.json({ ...updated!, lastUpdated: updated!.lastUpdated.toISOString() })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/orders', async (req, res, next) => {
    try {
      const body = req.body
      const [customer] = await db.select().from(customers).where(eq(customers.id, String(body.customerId)))
      if (!customer) {
        res.status(400).json({ error: 'Customer not found' })
        return
      }

      const itemsInput = body.items as Array<{ productId: string; quantity: number }>
      if (!itemsInput || itemsInput.length === 0) {
        res.status(400).json({ error: 'Order needs at least one item' })
        return
      }

      let subtotal = 0
      const lineItems = []

      for (const item of itemsInput) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId))
        if (!product) {
          res.status(400).json({ error: `Product not found: ${item.productId}` })
          return
        }
        const total = roundMoney(product.sellingPrice * item.quantity)
        subtotal += total
        lineItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          total,
        })
      }

      subtotal = roundMoney(subtotal)
      const discount = roundMoney(Number(body.discount ?? 0))
      const tax = roundMoney((subtotal - discount) * 0.18)
      const total = roundMoney(subtotal - discount + tax)

      const orderNum = (await tableCount(salesOrders)) + 1
      const orderId = `ORD-${100000 + orderNum}`
      const orderNumber = `SO-2026-${100000 + orderNum}`

      const orderRow = {
        id: orderId,
        orderNumber,
        customerId: customer.id,
        customerName: customer.companyName,
        orderDate: String(body.orderDate ?? new Date().toISOString().slice(0, 10)),
        status: String(body.status ?? 'Pending'),
        paymentStatus: String(body.paymentStatus ?? 'Pending'),
        currency: 'INR',
        subtotal,
        tax,
        discount,
        total,
      }

      await db.insert(salesOrders).values(orderRow)

      let lineIndex = 0
      for (const line of lineItems) {
        lineIndex += 1
        await db.insert(salesOrderItems).values({
          id: `${orderId}-line-${lineIndex}`,
          orderId,
          ...line,
        })
      }

      res.status(201).json({ ...orderRow, items: lineItems })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/orders/:id/status', async (req, res, next) => {
    try {
      const [updated] = await db
        .update(salesOrders)
        .set({ status: String(req.body.status) })
        .where(eq(salesOrders.id, req.params.id))
        .returning()
      if (!updated) {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      res.json({ ...updated, orderDate: String(updated.orderDate) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/orders/:id/payment-status', async (req, res, next) => {
    try {
      const [updated] = await db
        .update(salesOrders)
        .set({ paymentStatus: String(req.body.paymentStatus) })
        .where(eq(salesOrders.id, req.params.id))
        .returning()
      if (!updated) {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      res.json({ ...updated, orderDate: String(updated.orderDate) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/customers', async (req, res, next) => {
    try {
      const body = req.body
      const num = (await tableCount(customers)) + 1
      const row = {
        id: `CUS-${String(num).padStart(5, '0')}`,
        customerCode: `CUS${10000 + num}`,
        companyName: String(body.companyName),
        contactPerson: String(body.contactPerson),
        email: String(body.email),
        phone: String(body.phone),
        country: String(body.country),
        city: String(body.city),
        status: String(body.status ?? 'Active'),
        creditLimit: Number(body.creditLimit ?? 100000),
        paymentTerms: String(body.paymentTerms ?? 'Net 30'),
      }
      await db.insert(customers).values(row)
      res.status(201).json(row)
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/leaves', async (req, res, next) => {
    try {
      const body = req.body
      const [employee] = await db.select().from(employees).where(eq(employees.id, String(body.employeeId)))
      if (!employee) {
        res.status(400).json({ error: 'Employee not found' })
        return
      }

      const num = (await tableCount(leaveRequests)) + 1
      const row = {
        id: `LEV-${String(num).padStart(5, '0')}`,
        employeeId: employee.id,
        employeeName: employee.fullName,
        leaveType: String(body.leaveType),
        startDate: String(body.startDate),
        endDate: String(body.endDate),
        days: Number(body.days),
        reason: String(body.reason),
        status: String(body.status ?? 'Pending'),
        approvedBy: null,
      }

      await db.insert(leaveRequests).values(row)
      res.status(201).json({ ...row, startDate: row.startDate, endDate: row.endDate })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/suppliers', async (req, res, next) => {
    try {
      const body = req.body
      const num = (await tableCount(suppliers)) + 1
      const row = {
        id: `SUP-${String(num).padStart(5, '0')}`,
        supplierCode: `SUP${10000 + num}`,
        companyName: String(body.companyName),
        contactPerson: String(body.contactPerson),
        email: String(body.email),
        phone: String(body.phone),
        country: String(body.country),
        city: String(body.city),
        status: String(body.status ?? 'Active'),
        paymentTerms: String(body.paymentTerms ?? 'Net 30'),
      }
      await db.insert(suppliers).values(row)
      res.status(201).json(row)
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/leaves/:id/status', async (req, res, next) => {
    try {
      const [updated] = await db
        .update(leaveRequests)
        .set({
          status: String(req.body.status),
          approvedBy: req.body.approvedBy ? String(req.body.approvedBy) : null,
        })
        .where(eq(leaveRequests.id, req.params.id))
        .returning()
      if (!updated) {
        res.status(404).json({ error: 'Leave request not found' })
        return
      }
      res.json({ ...updated, startDate: String(updated.startDate), endDate: String(updated.endDate) })
    } catch (error) {
      next(error)
    }
  })
}
