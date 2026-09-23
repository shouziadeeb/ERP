export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstocked'

export interface Warehouse {
  id: string
  name: string
  city: string
  country: string
}

export interface InventoryRecord {
  id: string
  productId: string
  sku: string
  productName: string
  warehouseId: string
  warehouseName: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  reorderLevel: number
  status: InventoryStatus
  lastUpdated: string
}
