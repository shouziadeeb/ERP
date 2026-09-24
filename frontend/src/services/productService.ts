/** Product catalog CRUD against /api/products. */
import { fetchJson, toQuery, type PaginatedResult } from '../lib/http'
import type { SortOrder } from '../types/pagination'
import type { Product, ProductCategory } from '../types/product'

export interface ProductWithStock extends Product {
  stockAvailable: number
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock'
}

export interface ProductQuery {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  status?: string
  stock?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export async function getProducts(query: ProductQuery = {}): Promise<PaginatedResult<ProductWithStock>> {
  return fetchJson(`/api/products${toQuery(query)}`)
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  return fetchJson('/api/products', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  return fetchJson(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteProduct(id: string): Promise<void> {
  await fetchJson(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getCategoryOptions(): Promise<ProductCategory[]> {
  return fetchJson('/api/categories')
}
