import {
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
})

export const productCategories = pgTable('product_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
})

export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  supplierCode: text('supplier_code').notNull(),
  companyName: text('company_name').notNull(),
  contactPerson: text('contact_person').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  status: text('status').notNull(),
  paymentTerms: text('payment_terms').notNull(),
})

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  customerCode: text('customer_code').notNull(),
  companyName: text('company_name').notNull(),
  contactPerson: text('contact_person').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  status: text('status').notNull(),
  creditLimit: integer('credit_limit').notNull(),
  paymentTerms: text('payment_terms').notNull(),
})

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => productCategories.id),
  categoryName: text('category_name').notNull(),
  brand: text('brand').notNull(),
  unit: text('unit').notNull(),
  costPrice: doublePrecision('cost_price').notNull(),
  sellingPrice: doublePrecision('selling_price').notNull(),
  taxRate: doublePrecision('tax_rate').notNull(),
  status: text('status').notNull(),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  reorderLevel: integer('reorder_level').notNull(),
})

export const employees = pgTable(
  'employees',
  {
    id: text('id').primaryKey(),
    employeeCode: text('employee_code').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    country: text('country').notNull(),
    city: text('city').notNull(),
    departmentId: text('department_id')
      .notNull()
      .references(() => departments.id),
    departmentName: text('department_name').notNull(),
    designationId: text('designation_id').notNull(),
    designation: text('designation').notNull(),
    managerId: text('manager_id'),
    employmentType: text('employment_type').notNull(),
    joiningDate: date('joining_date').notNull(),
    status: text('status').notNull(),
    skills: jsonb('skills').$type<string[]>().notNull(),
    avatar: text('avatar'),
  },
  (table) => [
    index('employees_full_name_id_idx').on(table.fullName, table.id),
    index('employees_employee_code_idx').on(table.employeeCode),
    index('employees_department_id_idx').on(table.departmentId),
    index('employees_status_idx').on(table.status),
    index('employees_country_idx').on(table.country),
    index('employees_joining_date_id_idx').on(table.joiningDate, table.id),
  ],
)

export const inventoryRecords = pgTable('inventory_records', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  sku: text('sku').notNull(),
  productName: text('product_name').notNull(),
  warehouseId: text('warehouse_id')
    .notNull()
    .references(() => warehouses.id),
  warehouseName: text('warehouse_name').notNull(),
  quantity: integer('quantity').notNull(),
  reservedQuantity: integer('reserved_quantity').notNull(),
  availableQuantity: integer('available_quantity').notNull(),
  reorderLevel: integer('reorder_level').notNull(),
  status: text('status').notNull(),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull(),
})

export const salesOrders = pgTable('sales_orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  customerName: text('customer_name').notNull(),
  orderDate: date('order_date').notNull(),
  status: text('status').notNull(),
  paymentStatus: text('payment_status').notNull(),
  currency: text('currency').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  tax: doublePrecision('tax').notNull(),
  discount: doublePrecision('discount').notNull(),
  total: doublePrecision('total').notNull(),
})

export const salesOrderItems = pgTable('sales_order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  productName: text('product_name').notNull(),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  total: doublePrecision('total').notNull(),
})

export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id').primaryKey(),
  poNumber: text('po_number').notNull(),
  supplierId: text('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  supplierName: text('supplier_name').notNull(),
  orderDate: date('order_date').notNull(),
  expectedDeliveryDate: date('expected_delivery_date').notNull(),
  status: text('status').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  tax: doublePrecision('tax').notNull(),
  total: doublePrecision('total').notNull(),
})

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: text('id').primaryKey(),
  purchaseOrderId: text('purchase_order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: doublePrecision('unit_cost').notNull(),
  total: doublePrecision('total').notNull(),
})

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id),
  customerName: text('customer_name').notNull(),
  orderId: text('order_id')
    .notNull()
    .references(() => salesOrders.id),
  orderNumber: text('order_number').notNull(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  tax: doublePrecision('tax').notNull(),
  discount: doublePrecision('discount').notNull(),
  total: doublePrecision('total').notNull(),
  amountPaid: doublePrecision('amount_paid').notNull(),
  amountDue: doublePrecision('amount_due').notNull(),
  status: text('status').notNull(),
})

export const leaveRequests = pgTable('leave_requests', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id),
  employeeName: text('employee_name').notNull(),
  leaveType: text('leave_type').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: integer('days').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull(),
  approvedBy: text('approved_by'),
})

export const payrollRecords = pgTable('payroll_records', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id),
  month: text('month').notNull(),
  basicSalary: doublePrecision('basic_salary').notNull(),
  allowances: doublePrecision('allowances').notNull(),
  deductions: doublePrecision('deductions').notNull(),
  grossSalary: doublePrecision('gross_salary').notNull(),
  netSalary: doublePrecision('net_salary').notNull(),
  status: text('status').notNull(),
})

export const dashboardActivities = pgTable('dashboard_activities', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  actor: text('actor').notNull(),
})

export const appMeta = pgTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
