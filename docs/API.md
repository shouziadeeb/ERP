# ApexERP API

Base URL (local dev): `http://localhost:3010`

The React app calls `/api/...` through the Vite proxy.

All routes except **health** and **login** require header:

`Authorization: Bearer <token>`

Default login: username `ADMIN`, password `admin1234`. Override with env:

- `APEX_LOGIN_USER`
- `APEX_LOGIN_PASSWORD`
- `APEX_API_TOKEN`

---

## Health & auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server + database check (no auth) |
| POST | `/api/auth/login` | Body: `{ "username", "password" }` → `{ token, displayName, role }` |

---

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Organization, regional, notification, and security prefs (`app_meta`) |
| PATCH | `/api/settings` | Partial update — includes `companyName`, `legalEntityName`, `siteName`, `taxId`, address fields, `phone`, `website`, regional/notification/security keys (see GET). Response adds `settingsUpdatedAt`, `settingsUpdatedBy`. |

---

## Shell helpers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/nav-stats` | `{ pendingOrders, pendingLeaves }` for sidebar badges |
| GET | `/api/search?q=` | Global search (min 2 chars) across products, customers, orders, employees |

---

## Lookup lists

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/departments` | All departments |
| GET | `/api/categories` | Product categories |
| GET | `/api/warehouses` | Warehouses |
| GET | `/api/suppliers` | Paginated (`page`, `limit`, `search`) or `?all=1` for full list (max 500) |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/customers` | Customers (paginated, `page`, `limit`, `search`) |
| POST | `/api/customers` | Create customer |

---

## Purchase orders & invoices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/purchase-orders` | List (`page`, `limit`, `search`, `status`) |
| GET | `/api/purchase-orders/:id` | PO with line items |
| GET | `/api/invoices` | List (`page`, `limit`, `search`, `status`) |
| GET | `/api/invoices/:id` | Invoice detail |

---

## Employees

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees` | Paginated list — `page`, `limit` (default 25), `search`, `departmentId`, `status`, `country`, `sortBy` (`fullName`, `employeeCode`, `joiningDate`, `id`), `sortOrder`. Response includes `pagination: { page, limit, total, totalPages }`. Filters and sort run server-side; indexes on `employees` support large tables. |
| GET | `/api/employees/:id/detail` | Profile + HR summary |
| POST | `/api/employees` | Create employee |
| PATCH | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |

**POST body example:**

```json
{
  "firstName": "Aarav",
  "lastName": "Mehta",
  "email": "aarav.mehta@global-supply.com",
  "phone": "+91-9876543210",
  "country": "India",
  "city": "New Delhi",
  "departmentId": "DEP-001",
  "departmentName": "Engineering",
  "designationId": "DES-004",
  "designation": "Frontend Developer",
  "managerId": "EMP-00002",
  "employmentType": "Full Time",
  "joiningDate": "2024-06-10",
  "status": "Active",
  "skills": ["React", "TypeScript"]
}
```

---

## Products

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List (`page`, `limit`, `search`, `categoryId`, `status`, `stock`) |
| POST | `/api/products` | Create product |
| PATCH | `/api/products/:id` | Update product fields |
| DELETE | `/api/products/:id` | Delete product |

**POST body example:**

```json
{
  "sku": "SKU-90001",
  "name": "Wireless Barcode Scanner",
  "categoryId": "CAT-003",
  "categoryName": "Warehouse Equipment",
  "brand": "ScanPro",
  "unit": "Piece",
  "costPrice": 4200,
  "sellingPrice": 5999,
  "taxRate": 18,
  "status": "Active",
  "supplierId": "SUP-00001",
  "reorderLevel": 20
}
```

---

## Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | List (`page`, `limit`, `search`, `warehouseId`, `status`) |
| POST | `/api/inventory` | Add stock row for product + warehouse |
| PATCH | `/api/inventory/:id` | Update quantities / reorder level |

**POST body example:**

```json
{
  "productId": "PRD-00001",
  "warehouseId": "WH-001",
  "quantity": 100,
  "reservedQuantity": 10,
  "reorderLevel": 20
}
```

---

## Orders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List (`page`, `limit`, `search`, `status`, `paymentStatus`, `dateFrom`, `dateTo`) |
| GET | `/api/orders/:id` | Order with line items |
| POST | `/api/orders` | Create sales order |
| PATCH | `/api/orders/:id/status` | Body: `{ "status": "Processing" }` |
| PATCH | `/api/orders/:id/payment-status` | Body: `{ "paymentStatus": "Paid" }` |

**POST body example:**

```json
{
  "customerId": "CUS-00001",
  "orderDate": "2026-09-24",
  "status": "Pending",
  "paymentStatus": "Pending",
  "discount": 0,
  "items": [
    { "productId": "PRD-00001", "quantity": 2 }
  ]
}
```

---

## Customers

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/customers` | Create customer |

**POST body example:**

```json
{
  "companyName": "Nova Technologies Pvt Ltd",
  "contactPerson": "Rahul Sharma",
  "email": "rahul@novatech.com",
  "phone": "+91-9876543210",
  "country": "India",
  "city": "Mumbai",
  "status": "Active",
  "creditLimit": 500000,
  "paymentTerms": "Net 30"
}
```

---

## Leave requests

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/leaves` | Create leave request |
| PATCH | `/api/leaves/:id/status` | Approve / reject |

**POST body example:**

```json
{
  "employeeId": "EMP-00001",
  "leaveType": "Annual Leave",
  "startDate": "2026-09-25",
  "endDate": "2026-09-27",
  "days": 3,
  "reason": "Personal work",
  "status": "Pending"
}
```

---

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | KPI counts |
| GET | `/api/dashboard/recent-orders` | Latest orders |
| GET | `/api/dashboard/low-stock` | Low / out of stock rows |
| GET | `/api/dashboard/activities` | Activity feed |
| GET | `/api/dashboard/approvals` | Pending leave approvals |
| GET | `/api/dashboard/charts` | Weekly revenue series + order status breakdown |

---

## Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports` | Paginated report rows (`type`, `page`, `limit`, `search`, `status`, `dateFrom`, `dateTo`) |

`type` values: `sales`, `revenue`, `inventory`, `employees`, `attendance`, `purchase`, `invoices`

---

## Frontend modules (routes)

| Route | ERP area |
|-------|----------|
| `/dashboard` | Executive KPIs, leave approvals |
| `/products` | Product catalog CRUD (create/delete) |
| `/inventory` | Stock levels + quantity adjust |
| `/orders` | Sales orders create + status/payment |
| `/customers` | Customer master + create |
| `/invoices` | AR invoice list |
| `/purchase-orders` | Procurement PO list |
| `/suppliers` | Vendor master + create |
| `/employees` | HR employee CRUD |
| `/reports` | Exports by type |
| `/settings` | Company profile (persisted) |

---

## Pagination response shape

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1000,
    "totalPages": 40
  }
}
```
