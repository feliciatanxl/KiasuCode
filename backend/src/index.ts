import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import type { HealthResponse } from '@kiasucode/shared'

import authRouter from './routes/auth.js'
import academicRouter from './routes/academic.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  throw new Error('PORT must be a valid TCP port number.')
}

app.disable('x-powered-by')
app.use(cors({
  origin(_origin, callback) {
    // Allow local and ngrok origins while developing.
    callback(null, true)
  },
  credentials: true,
}))
app.use(express.json({ limit: '32kb' }))

app.get('/health', (_request, response) => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'kiasucode-backend',
    timestamp: new Date().toISOString(),
  }

  response.status(200).json(payload)
})

app.use('/auth', authRouter)
app.use('/api', academicRouter)

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
