/**
 * Server entry: load env, create Express app, bind HTTP port (Render sets PORT).
 * Database access is via Prisma (see src/db/index.ts); routes never open raw pg connections.
 */
import './env.js'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 3010
const app = createApp()

app.listen(PORT, () => {
  console.log(`ERP API listening on http://localhost:${PORT}`)
})
