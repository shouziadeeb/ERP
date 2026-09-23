import { fetchJson, toQuery } from '../lib/http'

export interface SearchHit {
  id: string
  label: string
  sub: string
  type: 'product' | 'employee' | 'order' | 'customer'
  href: string
}

export async function globalSearch(q: string) {
  return fetchJson<{
    products: SearchHit[]
    employees: SearchHit[]
    orders: SearchHit[]
    customers: SearchHit[]
  }>(`/api/search${toQuery({ q })}`)
}
