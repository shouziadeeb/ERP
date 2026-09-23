import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = join(__dirname, '../../.env.local')
const backendEnv = join(__dirname, '../.env')

if (existsSync(rootEnv)) config({ path: rootEnv })
else if (existsSync(backendEnv)) config({ path: backendEnv })
else config()
