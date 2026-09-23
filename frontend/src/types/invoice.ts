export type InvoiceStatus =
  | 'Draft'
  | 'Sent'
  | 'Paid'
  | 'Partially Paid'
  | 'Overdue'
  | 'Cancelled'

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  orderId: string
  orderNumber: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  tax: number
  discount: number
  total: number
  amountPaid: number
  amountDue: number
  status: InvoiceStatus
}
