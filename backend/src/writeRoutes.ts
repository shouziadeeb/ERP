/**
 * Mutating API routes: create/update records, generate IDs, compute order totals and stock status.
 * Mounted from app.ts after all GET handlers.
 */
import type { Express } from 'express'
import { prisma } from './db/index.js'
import { parseDateOnly, toDateOnlyString } from './lib/dates.js'
import {
  calcAvailable,
  calcInventoryStatus,
  roundMoney,
} from './lib/inventoryHelpers.js'

export function addWriteRoutes(app: Express) {
  app.post('/api/products', async (req, res, next) => {
    try {
      const body = req.body
      const num = (await prisma.product.count()) + 1
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

      await prisma.product.create({ data: row })

      const warehouse = await prisma.warehouse.findFirst()
      if (warehouse) {
        const invNum = (await prisma.inventoryRecord.count()) + 1
        const quantity = Number(body.initialStock ?? 0)
        const reservedQuantity = 0
        const availableQuantity = calcAvailable(quantity, reservedQuantity)
        const reorderLevel = row.reorderLevel
        await prisma.inventoryRecord.create({
          data: {
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
            status: calcInventoryStatus(quantity, availableQuantity, reorderLevel),
            lastUpdated: new Date(),
          },
        })
      }

      res.status(201).json(row)
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/products/:id', async (req, res, next) => {
    try {
      const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body,
      })
      res.json(updated)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        res.status(404).json({ error: 'Product not found' })
        return
      }
      next(error)
    }
  })

  app.post('/api/inventory', async (req, res, next) => {
    try {
      const body = req.body
      const product = await prisma.product.findUnique({ where: { id: String(body.productId) } })
      const warehouse = await prisma.warehouse.findUnique({ where: { id: String(body.warehouseId) } })
      if (!product || !warehouse) {
        res.status(400).json({ error: 'Invalid product or warehouse' })
        return
      }

      const num = (await prisma.inventoryRecord.count()) + 1
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

      await prisma.inventoryRecord.create({ data: row })
      res.status(201).json({ ...row, lastUpdated: row.lastUpdated.toISOString() })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/inventory/:id', async (req, res, next) => {
    try {
      const current = await prisma.inventoryRecord.findUnique({ where: { id: req.params.id } })
      if (!current) {
        res.status(404).json({ error: 'Inventory record not found' })
        return
      }

      const quantity = req.body.quantity ?? current.quantity
      const reservedQuantity = Math.min(quantity, req.body.reservedQuantity ?? current.reservedQuantity)
      const availableQuantity = calcAvailable(quantity, reservedQuantity)
      const reorderLevel = req.body.reorderLevel ?? current.reorderLevel

      const updated = await prisma.inventoryRecord.update({
        where: { id: req.params.id },
        data: {
          quantity,
          reservedQuantity,
          availableQuantity,
          reorderLevel,
          status: calcInventoryStatus(quantity, availableQuantity, reorderLevel),
          lastUpdated: new Date(),
        },
      })

      res.json({ ...updated, lastUpdated: updated.lastUpdated.toISOString() })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/orders', async (req, res, next) => {
    try {
      const body = req.body
      const customer = await prisma.customer.findUnique({ where: { id: String(body.customerId) } })
      if (!customer) {
        res.status(400).json({ error: 'Customer not found' })
        return
      }

      const itemsInput = body.items as Array<{ productId: string; quantity: number }>
      if (!itemsInput || itemsInput.length === 0) {
        res.status(400).json({ error: 'Order needs at least one item' })
        return
      }

      // Build line items from product prices, then apply discount + 18% tax.
      let subtotal = 0
      const lineItems = []

      for (const item of itemsInput) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } })
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

      const orderNum = (await prisma.salesOrder.count()) + 1
      const orderId = `ORD-${100000 + orderNum}`
      const orderNumber = `SO-2026-${100000 + orderNum}`

      const orderRow = {
        id: orderId,
        orderNumber,
        customerId: customer.id,
        customerName: customer.companyName,
        orderDate: parseDateOnly(body.orderDate ?? new Date().toISOString().slice(0, 10), new Date()),
        status: String(body.status ?? 'Pending'),
        paymentStatus: String(body.paymentStatus ?? 'Pending'),
        currency: 'INR',
        subtotal,
        tax,
        discount,
        total,
      }

      await prisma.salesOrder.create({ data: orderRow })

      let lineIndex = 0
      for (const line of lineItems) {
        lineIndex += 1
        await prisma.salesOrderItem.create({
          data: {
            id: `${orderId}-line-${lineIndex}`,
            orderId,
            ...line,
          },
        })
      }

      res.status(201).json({
        ...orderRow,
        orderDate: toDateOnlyString(orderRow.orderDate),
        items: lineItems,
      })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/orders/:id/status', async (req, res, next) => {
    try {
      const updated = await prisma.salesOrder.update({
        where: { id: req.params.id },
        data: { status: String(req.body.status) },
      })
      res.json({ ...updated, orderDate: toDateOnlyString(updated.orderDate) })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      next(error)
    }
  })

  app.patch('/api/orders/:id/payment-status', async (req, res, next) => {
    try {
      const updated = await prisma.salesOrder.update({
        where: { id: req.params.id },
        data: { paymentStatus: String(req.body.paymentStatus) },
      })
      res.json({ ...updated, orderDate: toDateOnlyString(updated.orderDate) })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        res.status(404).json({ error: 'Order not found' })
        return
      }
      next(error)
    }
  })

  app.post('/api/customers', async (req, res, next) => {
    try {
      const body = req.body
      const num = (await prisma.customer.count()) + 1
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
      await prisma.customer.create({ data: row })
      res.status(201).json(row)
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/leaves', async (req, res, next) => {
    try {
      const body = req.body
      const employee = await prisma.employee.findUnique({ where: { id: String(body.employeeId) } })
      if (!employee) {
        res.status(400).json({ error: 'Employee not found' })
        return
      }

      const num = (await prisma.leaveRequest.count()) + 1
      const row = {
        id: `LEV-${String(num).padStart(5, '0')}`,
        employeeId: employee.id,
        employeeName: employee.fullName,
        leaveType: String(body.leaveType),
        startDate: parseDateOnly(body.startDate, new Date()),
        endDate: parseDateOnly(body.endDate, new Date()),
        days: Number(body.days),
        reason: String(body.reason),
        status: String(body.status ?? 'Pending'),
        approvedBy: null,
      }

      await prisma.leaveRequest.create({ data: row })
      res.status(201).json({
        ...row,
        startDate: toDateOnlyString(row.startDate),
        endDate: toDateOnlyString(row.endDate),
      })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/suppliers', async (req, res, next) => {
    try {
      const body = req.body
      const num = (await prisma.supplier.count()) + 1
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
      await prisma.supplier.create({ data: row })
      res.status(201).json(row)
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/leaves/:id/status', async (req, res, next) => {
    try {
      const updated = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: {
          status: String(req.body.status),
          approvedBy: req.body.approvedBy ? String(req.body.approvedBy) : null,
        },
      })
      res.json({
        ...updated,
        startDate: toDateOnlyString(updated.startDate),
        endDate: toDateOnlyString(updated.endDate),
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        res.status(404).json({ error: 'Leave request not found' })
        return
      }
      next(error)
    }
  })
}
