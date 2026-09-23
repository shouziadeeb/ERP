export type OrderStatus =
  | 'Draft'
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'

export type PaymentStatus =
  | 'Pending'
  | 'Paid'
  | 'Partially Paid'
  | 'Failed'
  | 'Refunded'

export interface OrderLineItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  total: number
}

export interface SalesOrder {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  orderDate: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  currency: string
  subtotal: number
  tax: number
  discount: number
  total: number
  items: OrderLineItem[]
}

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Ordered'
  | 'Partially Received'
  | 'Received'
  | 'Cancelled'

export interface PurchaseOrderLineItem {
  productId: string
  productName: string
  quantity: number
  unitCost: number
  total: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  orderDate: string
  expectedDeliveryDate: string
  status: PurchaseOrderStatus
  subtotal: number
  tax: number
  total: number
  items: PurchaseOrderLineItem[]
}
