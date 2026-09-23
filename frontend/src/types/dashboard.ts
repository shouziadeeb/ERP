export interface DashboardSummary {
  totalEmployees: number
  activeEmployees: number
  newEmployeesThisMonth: number
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalCustomers: number
  pendingOrders: number
  monthlyRevenue: number
  monthlyExpenses: number
  pendingInvoices: number
  overdueInvoices: number
  pendingPurchaseOrders: number
  revenueChangePercent: number
  expenseChangePercent: number
}

export interface DashboardCharts {
  revenueSeries: Array<{ label: string; revenue: number }>
  orderStatusBreakdown: Array<{ status: string; count: number }>
}

export interface DashboardActivity {
  id: string
  type: string
  message: string
  timestamp: string
  actor: string
}

export interface DashboardApproval {
  id: string
  type: 'Leave' | 'Purchase Order' | 'Invoice'
  reference: string
  requestedBy: string
  date: string
}
