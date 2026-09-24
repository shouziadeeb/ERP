# Backend code map (read in this order)

Companion guide for the React app: **`FRONTEND_FILES.md`** (repo root).

Start at the top and work down. Each path is relative to `backend/`.

| # | File | What it does |
|---|------|----------------|
| 1 | `package.json` | Scripts: `dev` / `start` API on port 3010, `db:push` (Drizzle → Postgres), `db:seed` / `db:setup`. |
| 2 | `drizzle.config.ts` | Drizzle Kit config: reads `DATABASE_URL_UNPOOLED` or `DATABASE_URL` from env for schema push. |
| 3 | `src/env.ts` | Loads env before anything else: prefers repo root `.env.local`, then `backend/.env`. |
| 4 | `src/index.ts` | Process entry: loads env, builds Express app, listens on `PORT` (default 3010). |
| 5 | `src/db/schema.ts` | **Data model** — all Postgres tables (departments, products, employees, orders, etc.) and indexes on `employees` for large lists. |
| 6 | `src/db/index.ts` | Creates `pg` pool + Drizzle `db` client (Neon SSL when host is `neon.tech`). |
| 7 | `src/lib/auth.ts` | Login handler (env-based user/password) and `requireApiAuth` Bearer middleware for `/api/*`. |
| 8 | `src/lib/pagination.ts` | Shared `page` / `limit` / `offset` parsing and `{ data, pagination }` response shape. |
| 9 | `src/lib/employeePagination.ts` | Employee list: filters, sort, count query, paginated SELECT (100k+ rows). |
| 10 | `src/lib/settings.ts` | Read/write org settings as key-value rows in `app_meta` (defaults + PATCH merge). |
| 11 | `src/lib/inventoryHelpers.ts` | Pure helpers: available qty, stock status label, money rounding. |
| 12 | `src/lib/attendance.ts` | Deterministic fake attendance calendar for employee detail (seeded PRNG per employee/month). |
| 13 | `src/app.ts` | **Main read API** — health, lookups, paginated lists, dashboard, reports, search, settings GET/PATCH, employee CRUD on app (some writes also in `writeRoutes`). |
| 14 | `src/writeRoutes.ts` | **Write API** — POST/PATCH for products, inventory, orders, customers, suppliers, leaves (creates IDs, line items, stock rows). |
| 15 | `src/seed/seedRandom.ts` | Seeded random number helpers for reproducible demo data. |
| 16 | `src/seed/buildDataset.ts` | Builds in-memory batches of employees, orders, etc. for the seed script. |
| 17 | `src/seed/reference/*.json` | Static reference data (departments, categories, warehouses). |
| 18 | `scripts/seed.ts` | CLI: clears/reloads tables, inserts large dataset (~100k employees), run via `npm run db:seed`. |

## How requests flow

1. `index.ts` → `createApp()` in `app.ts`.
2. Public: `GET /api/health`, `POST /api/auth/login`.
3. All other `/api/*` routes pass through `requireApiAuth`.
4. Reads mostly live in `app.ts`; creates/updates for several modules live in `writeRoutes.ts` (registered at end of `createApp`).

## Related docs

- HTTP contract: `docs/API.md` (repo root).
- Database URL: repo root `.env.local` (not committed).
