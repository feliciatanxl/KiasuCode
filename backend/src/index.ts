import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import type { HealthResponse } from '@kiasucode/shared'

import http from 'node:http'
import path from 'node:path'

import authRouter from './routes/auth.js'
import academicRouter from './routes/academic.js'
import countdownsRouter from './routes/countdowns.js'
import filesRouter from './routes/files.js'
import friendsRouter from './routes/friends.js'
import gamificationRouter from './routes/gamification.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { setupStudyRoomSocket } from './sockets/studyRoom.js'


const app = express()
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 3000)
const configuredFrontendUrls = isProduction
  ? [process.env.FRONTEND_URL]
  : [
      process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173',
      process.env.FRONTEND_URL,
    ]
const allowedOrigins = configuredFrontendUrls
  .filter((value): value is string => Boolean(value))
  .flatMap((value) => value.split(','))
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1_000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  throw new Error('PORT must be a valid TCP port number.')
}

app.disable('x-powered-by')
// ngrok is the single reverse-proxy hop in front of this Express process.
app.set('trust proxy', 1)
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      callback(null, true)
      return
    }

    // Reject the CORS request without raising an application error.
    callback(null, false)
  },
  credentials: true,
}))
app.use(globalRateLimiter)
// A 2 MB image expands to roughly 2.7 MB when encoded as a Base64 data URL.
app.use(express.json({ limit: '3mb' }))

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

app.get('/health', (_request, response) => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'kiasucode-backend',
    timestamp: new Date().toISOString(),
  }

  response.status(200).json(payload)
})

app.use('/auth', authRouter)
app.use('/api', filesRouter)
app.use('/api', friendsRouter)
app.use('/api', countdownsRouter)
app.use('/api', gamificationRouter)
app.use('/api', academicRouter)
app.use(notFoundHandler)
app.use(errorHandler)

const httpServer = http.createServer(app)
setupStudyRoomSocket(httpServer, allowedOrigins)

httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`)
})
