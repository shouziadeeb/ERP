/**
 * Runs Prisma CLI after loading DATABASE_URL via src/env.ts (repo root `.env.local`).
 * Usage: tsx scripts/with-env.ts db push | generate | migrate dev …
 */
import '../src/env.js'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd: backendRoot,
})

process.exit(result.status ?? 1)
