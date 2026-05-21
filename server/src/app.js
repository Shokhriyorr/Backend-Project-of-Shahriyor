import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yaml'
import { env } from './config/env.js'
import adminRouter from './routes/admin.js'
import authRouter from './routes/auth.js'
import categoriesRouter from './routes/categories.js'
import coursesRouter from './routes/courses.js'
import enrollmentsRouter from './routes/enrollments.js'
import teachersRouter from './routes/teachers.js'
import usersRouter from './routes/users.js'
import { requireAuth } from './middleware/auth.js'
import { buildReadinessSnapshot } from './services/readinessService.js'
import {
  ApiError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from './utils/api.js'

const openApiPath = new URL('../../openapi.yaml', import.meta.url)
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, 'utf8'))

if (!BigInt.prototype.toJSON) {
  // Keep API responses JSON-safe without leaking BigInt internals into callers.
  BigInt.prototype.toJSON = function toJSON() {
    return this.toString()
  }
}

const app = express()

app.set('trust proxy', 1)
app.use(requestIdMiddleware)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        return callback(null, true)
      }

      return callback(new ApiError(403, 'forbidden', 'Origin is not allowed by CORS.'))
    },
  }),
)
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get(
  '/health/ready',
  asyncHandler(async (_req, res) => {
    const snapshot = await buildReadinessSnapshot()
    return res.status(snapshot.ok ? 200 : 503).json(snapshot)
  }),
)

app.get('/openapi.yaml', (_req, res) => {
  res.type('application/yaml').sendFile(fileURLToPath(openApiPath))
})

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
  }),
)

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/users', usersRouter)
app.use('/api/courses', coursesRouter)
app.use('/api/teachers', teachersRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/enrollments', requireAuth, enrollmentsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
