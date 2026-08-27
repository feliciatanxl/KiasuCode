import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import type { HealthResponse } from '@kiasucode/shared'

import authRouter from './routes/auth.js'
import academicRouter from './routes/academic.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1_000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  throw new Error('PORT must be a valid TCP port number.')
}

app.disable('x-powered-by')
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}
app.use(cors({
  origin(_origin, callback) {
    // Allow local and ngrok origins while developing.
    callback(null, true)
  },
  credentials: true,
}))
app.use(globalRateLimiter)
// A 2 MB image expands to roughly 2.7 MB when encoded as a Base64 data URL.
app.use(express.json({ limit: '3mb' }))

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
