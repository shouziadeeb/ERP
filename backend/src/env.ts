/** Loads DATABASE_URL and auth secrets before any DB or route code runs. */
import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = join(__dirname, '../../.env.local')
const backendEnv = join(__dirname, '../.env')

// Prefer monorepo root `.env.local` (Neon CLI), then backend-only `.env`.
if (existsSync(rootEnv)) config({ path: rootEnv })
else if (existsSync(backendEnv)) config({ path: backendEnv })
else config()
