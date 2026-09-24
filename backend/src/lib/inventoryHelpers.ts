/** Small pure functions shared by inventory write routes and seed logic. */
export function calcAvailable(quantity: number, reserved: number): number {
  return Math.max(0, quantity - reserved)
}

export function calcInventoryStatus(
  quantity: number,
  available: number,
  reorderLevel: number,
): string {
  if (quantity === 0 || available === 0) return 'Out of Stock'
  if (available <= reorderLevel) return 'Low Stock'
  if (available > reorderLevel * 6) return 'Overstocked'
  return 'In Stock'
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
