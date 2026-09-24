/**
 * Single Prisma Client for the whole API.
 *
 * Prisma opens a connection pool using DATABASE_URL (set in repo root `.env.local` for Neon).
 * In development, tsx watch reloads this module often; storing the client on `globalThis`
 * prevents "too many connections" errors from creating a new pool on every reload.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
