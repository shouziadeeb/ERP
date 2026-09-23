export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked'

export interface Customer {
  id: string
  customerCode: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  country: string
  city: string
  status: CustomerStatus
  creditLimit: number
  paymentTerms: string
}
