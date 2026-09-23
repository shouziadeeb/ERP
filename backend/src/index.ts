import './env.js'
import { createApp } from './app.js'

const PORT = Number(process.env.PORT) || 3010
const app = createApp()

app.listen(PORT, () => {
  console.log(`ERP API listening on http://localhost:${PORT}`)
})
