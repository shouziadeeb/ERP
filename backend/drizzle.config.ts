import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const rootEnv = join(process.cwd(), '../.env.local')
if (existsSync(rootEnv)) config({ path: rootEnv })
else config()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
})
