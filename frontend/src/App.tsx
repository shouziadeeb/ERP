/**
 * Root app: login gate via sessionStorage, lazy-loaded ERP pages, shared AppShell layout.
 */
import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY } from './constants/auth'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { TableSkeleton } from './components/ui/TableSkeleton'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const InventoryPage = lazy(() =>
  import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })),
)
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage').then((m) => ({ default: m.OrdersPage })),
)
const EmployeeManagementPage = lazy(() =>
  import('./pages/EmployeeManagementPage').then((m) => ({ default: m.EmployeeManagementPage })),
)
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const CustomersPage = lazy(() =>
  import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
)
const PurchaseOrdersPage = lazy(() =>
  import('./pages/PurchaseOrdersPage').then((m) => ({ default: m.PurchaseOrdersPage })),
)
const InvoicesPage = lazy(() =>
  import('./pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })),
)

function App() {
  const [authed, setAuthed] = useState(
    () =>
      sessionStorage.getItem(AUTH_STORAGE_KEY) === '1' &&
      Boolean(sessionStorage.getItem(AUTH_TOKEN_KEY)),
  )

  function handleLoginSuccess() {
    sessionStorage.setItem(AUTH_STORAGE_KEY, '1')
    setAuthed(true)
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    setAuthed(false)
  }

  // Not logged in → only login screen (no sidebar routes).
  if (!authed) {
    return <LoginPage onSuccess={handleLoginSuccess} />
  }

  return (
    <AppShell onLogout={handleLogout}>
      <Suspense fallback={<div className="px-6 py-6"><TableSkeleton rows={6} /></div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/employees" element={<EmployeeManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default App
