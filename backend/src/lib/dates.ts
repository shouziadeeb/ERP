/**
 * Postgres `@db.Date` columns come back from Prisma as JavaScript `Date` values.
 * Never use `String(date).slice(0, 10)` — that takes the first 10 chars of
 * `"Wed Jun 10 2024 …"` and breaks HTML `<input type="date">` plus Prisma updates.
 */

/** Serialize a date-only field for JSON and forms (always `YYYY-MM-DD`). */
export function toDateOnlyString(value: Date | string): string {
  if (typeof value === 'string') {
    const iso = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (iso) return iso[1]
  }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Parse client input into a Date for Prisma; invalid values fall back to `fallback`. */
export function parseDateOnly(input: unknown, fallback: Date): Date {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input
  const text = String(input ?? '').trim()
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return new Date(`${iso[1]}T00:00:00.000Z`)
  return fallback
}
