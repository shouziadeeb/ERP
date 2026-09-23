import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { Customer } from '../types/customer'

export async function getCustomers(query: {
  page?: number
  limit?: number
  search?: string
} = {}): Promise<PaginatedResult<Customer>> {
  return fetchJson(`/api/customers${toQuery(query)}`)
}

export async function createCustomer(input: {
  companyName: string
  contactPerson: string
  email: string
  phone: string
  country: string
  city: string
  status?: string
  creditLimit?: number
  paymentTerms?: string
}): Promise<Customer> {
  return fetchJson('/api/customers', { method: 'POST', body: JSON.stringify(input) })
}
