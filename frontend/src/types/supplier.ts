export type SupplierStatus = 'Active' | 'Inactive' | 'Blocked'

export interface Supplier {
  id: string
  supplierCode: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  country: string
  city: string
  status: SupplierStatus
  paymentTerms: string
}
