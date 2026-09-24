# Frontend code map (read in this order)

Companion guide for the API: **`BACKEND_FILES.md`** (repo root).

Start at the top and work down. Each path is relative to `frontend/`.

| # | File | What it does |
|---|------|----------------|
| 1 | `package.json` | Vite + React scripts: `dev`, `build`, `preview`. |
| 2 | `vite.config.ts` | Dev server proxies `/api` → `http://localhost:3010`. |
| 3 | `index.html` | HTML shell; mounts `#root`. |
| 4 | `src/main.tsx` | React entry: `BrowserRouter` + `App`. |
| 5 | `src/index.css` | Tailwind / theme tokens (Material-style surfaces). |
| 6 | `src/App.tsx` | Auth gate (sessionStorage), lazy-loaded routes, wraps authenticated pages in `AppShell`. |
| 7 | `src/config/api.ts` | `VITE_API_BASE` for production API URL; builds full fetch URLs. |
| 8 | `src/constants/auth.ts` | Session storage keys for token and “logged in” flag. |
| 9 | `src/lib/http.ts` | `fetchJson` + Bearer header, 401 redirect to login, `toQuery` for list filters. |
| 10 | `src/hooks/useDebouncedValue.ts` | Debounces search inputs (employees, global search, etc.). |
| 11 | `src/utils/format.ts` | Date/currency display helpers. |

### Types (`src/types/`)

Read when you need shapes returned by the API — no runtime logic.

| File | Domain |
|------|--------|
| `pagination.ts` | `PaginatedResult`, `PaginationMeta`, sort order |
| `employee.ts`, `product.ts`, `order.ts`, … | Entity interfaces per module |

### Services (`src/services/`)

Thin API clients — each file maps to backend routes.

| # | File | Backend area |
|---|------|----------------|
| 12 | `authService.ts` | Login with retries + cold-start handling |
| 13 | `dashboardService.ts` | Dashboard KPIs, charts, approvals |
| 14 | `navService.ts` | Sidebar badge counts |
| 15 | `searchService.ts` | Header global search |
| 16 | `settingsService.ts` | Settings GET/PATCH + browser event when saved |
| 17 | `employeeService.ts` | Employees CRUD + departments |
| 18 | `productService.ts` | Products CRUD |
| 19 | `inventoryService.ts` | Inventory list + adjust |
| 20 | `orderService.ts` | Orders list, create, status |
| 21 | `customerService.ts`, `supplierService.ts` | Master data |
| 22 | `purchaseOrderService.ts`, `invoiceService.ts` | PO & AR lists |
| 23 | `reportService.ts` | Reports tab data |
| 24 | `leaveService.ts` | Leave create / approve |

### Layout & shared UI

| # | File | What it does |
|---|------|----------------|
| 25 | `layout/AppShell.tsx` | Sidebar, header search, nav badges, logout confirm, maintenance banner |
| 26 | `components/Icon.tsx` | Material Symbols wrapper |
| 27 | `components/ui/FilterSelect.tsx` | Reusable filter dropdown |
| 28 | `components/ui/Pagination.tsx` | Generic page controls (non-employee lists) |
| 29 | `components/ui/EmployeeTablePagination.tsx` | Employee table footer: “Showing 1–25 of N”, page numbers, go-to |
| 30 | `components/ui/PageHeader.tsx`, `EmptyState.tsx`, `ErrorBanner.tsx`, `TableSkeleton.tsx`, `StatusBadge.tsx` | Page chrome & loading |
| 31 | `components/ui/LogoutConfirmModal.tsx` | Sign-out confirmation dialog |

### Pages (routes)

| # | Route | File |
|---|-------|------|
| 32 | `/` (login) | `pages/LoginPage.tsx` |
| 33 | `/dashboard` | `pages/DashboardPage.tsx` |
| 34 | `/products` | `pages/ProductsPage.tsx` + `components/products/ProductFormDrawer.tsx` |
| 35 | `/inventory` | `pages/InventoryPage.tsx` |
| 36 | `/orders` | `pages/OrdersPage.tsx` |
| 37 | `/customers` | `pages/CustomersPage.tsx` |
| 38 | `/suppliers` | `pages/SuppliersPage.tsx` |
| 39 | `/purchase-orders` | `pages/PurchaseOrdersPage.tsx` |
| 40 | `/invoices` | `pages/InvoicesPage.tsx` |
| 41 | `/employees` | `pages/EmployeeManagementPage.tsx` + `components/employees/*` |
| 42 | `/reports` | `pages/ReportsPage.tsx` + `config/reports.ts` |
| 43 | `/settings` | `pages/SettingsPage.tsx` + `components/settings/SettingsControls.tsx` + `config/settingsDefaults.ts` |

### Dashboard widgets

| File | What it does |
|------|----------------|
| `components/dashboard/DashboardPanel.tsx` | Panel layout wrapper |
| `components/dashboard/RevenueTrendChart.tsx` | Revenue chart from API series |
| `components/dashboard/OrderStatusBars.tsx` | Order status breakdown bars |

## How the UI talks to the API

1. Pages call **services** → `fetchJson` in `lib/http.ts`.
2. In dev, paths like `/api/employees` go through the Vite proxy to the backend.
3. In production, set `VITE_API_BASE` to your hosted API origin (see root deployment notes).

## Suggested reading path for one feature (example: Employees)

`EmployeeManagementPage.tsx` → `employeeService.ts` → `http.ts` → backend `employeePagination.ts` + `app.ts` employee routes.
