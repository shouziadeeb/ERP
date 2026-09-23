export type ProductStatus = 'Active' | 'Inactive' | 'Discontinued'

export interface ProductCategory {
  id: string
  name: string
}

export interface Product {
  id: string
  sku: string
  name: string
  categoryId: string
  categoryName: string
  brand: string
  unit: string
  costPrice: number
  sellingPrice: number
  taxRate: number
  status: ProductStatus
  supplierId: string
  reorderLevel: number
}
