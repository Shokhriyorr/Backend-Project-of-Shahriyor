import 'dotenv/config'
import * as v from 'valibot'

const envSchema = v.object({
  NODE_ENV: v.optional(v.picklist(['development', 'test', 'production']), 'development'),
  ENVIRONMENT: v.optional(v.picklist(['development', 'test', 'production']), undefined),
  PORT: v.optional(v.pipe(v.string(), v.regex(/^\d+$/, 'PORT must be a valid number.')), '3000'),
  BACKEND_PORT: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'BACKEND_PORT must be numeric.')),
    undefined,
  ),
  FRONTEND_PORT: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'FRONTEND_PORT must be numeric.')),
    undefined,
  ),
  DATABASE_URL: v.pipe(v.string(), v.minLength(1, 'DATABASE_URL is required.')),
  JWT_SECRET: v.optional(v.string(), ''),
  JWT_SECRET_KEY: v.optional(v.string(), ''),
  JWT_REFRESH_SECRET_KEY: v.optional(v.string(), ''),
  JWT_ACCESS_TTL_SECONDS: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'JWT_ACCESS_TTL_SECONDS must be numeric.')),
    '900',
  ),
  JWT_REFRESH_TTL_DAYS: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'JWT_REFRESH_TTL_DAYS must be numeric.')),
    '30',
  ),
  CORS_ORIGINS: v.optional(v.string(), 'http://localhost:5173,http://127.0.0.1:5173'),
  ENABLE_DAILY_STATS_JOB: v.optional(v.picklist(['true', 'false']), 'true'),
  PUBLIC_APP_URL: v.optional(
    v.pipe(v.string(), v.url('PUBLIC_APP_URL must be a valid URL.')),
    'http://localhost:5173',
  ),
  EMAIL_PROVIDER: v.optional(v.picklist(['log', 'smtp']), 'log'),
  EMAIL_FROM: v.optional(v.string(), ''),
  EMAIL_FROM_ADDRESS: v.optional(v.string(), ''),
  EMAIL_API_KEY: v.optional(v.string(), ''),
  EMAIL_REPLY_TO: v.optional(v.string(), ''),
  EMAIL_LOG_PATH: v.optional(v.string(), 'email.out.log'),
  SMTP_HOST: v.optional(v.string(), ''),
  SMTP_PORT: v.optional(v.pipe(v.string(), v.regex(/^\d+$/, 'SMTP_PORT must be numeric.')), '587'),
  SMTP_USER: v.optional(v.string(), ''),
  SMTP_PASS: v.optional(v.string(), ''),
  SMTP_SECURE: v.optional(v.picklist(['true', 'false']), 'false'),
  EMAIL_VERIFICATION_TTL_MINUTES: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'EMAIL_VERIFICATION_TTL_MINUTES must be numeric.')),
    '1440',
  ),
  PASSWORD_RESET_TTL_MINUTES: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'PASSWORD_RESET_TTL_MINUTES must be numeric.')),
    '30',
  ),
  ENABLE_BACKGROUND_WORKERS: v.optional(v.picklist(['true', 'false']), 'false'),
  START_WORKERS_IN_API: v.optional(v.picklist(['true', 'false']), 'true'),
  REDIS_URL: v.optional(v.string(), ''),
  EMAIL_QUEUE_NAME: v.optional(v.string(), 'academy-email'),
  MAINTENANCE_QUEUE_NAME: v.optional(v.string(), 'academy-maintenance'),
  STATS_JOB_REPEAT_MS: v.optional(
    v.pipe(v.string(), v.regex(/^\d+$/, 'STATS_JOB_REPEAT_MS must be numeric.')),
    '900000',
  ),
  ADMIN_NOTIFICATION_EMAILS: v.optional(v.string(), ''),
})

const parsedEnv = v.safeParse(envSchema, process.env)

if (!parsedEnv.success) {
  const issues = parsedEnv.issues.map((issue) => `- ${issue.message}`).join('\n')
  throw new Error(`Environment validation failed:\n${issues}`)
}

const rawEnv = parsedEnv.output
const nodeEnv = rawEnv.ENVIRONMENT ?? rawEnv.NODE_ENV
const jwtSecret = (rawEnv.JWT_SECRET_KEY || rawEnv.JWT_SECRET || '').trim()
const jwtRefreshSecret = (
  rawEnv.JWT_REFRESH_SECRET_KEY || (nodeEnv === 'production' ? '' : jwtSecret)
).trim()
const emailFrom = (
  rawEnv.EMAIL_FROM_ADDRESS ||
  rawEnv.EMAIL_FROM ||
  'Academy Portal <no-reply@example.com>'
).trim()
const smtpPass = rawEnv.SMTP_PASS || rawEnv.EMAIL_API_KEY || ''
const smtpUser = rawEnv.SMTP_USER || (rawEnv.EMAIL_API_KEY ? 'apikey' : '')
const port = Number(rawEnv.BACKEND_PORT ?? rawEnv.PORT ?? 3000)
const emailProvider = rawEnv.EMAIL_PROVIDER
const smtpHost = rawEnv.SMTP_HOST.trim()
const redisUrl = rawEnv.REDIS_URL.trim()
const enableWorkers = rawEnv.ENABLE_BACKGROUND_WORKERS === 'true'

if (jwtSecret.length < 32) {
  throw new Error(
    'Environment validation failed:\n- JWT_SECRET or JWT_SECRET_KEY must be at least 32 characters long.',
  )
}

if (jwtRefreshSecret.length < 32) {
  throw new Error(
    'Environment validation failed:\n- JWT_REFRESH_SECRET_KEY must be at least 32 characters long.',
  )
}

function isPlaceholderSecret(secret) {
  return (
    secret.includes('replace-with') ||
    secret.includes('test-secret') ||
    secret.includes('docker-local-demo') ||
    secret.includes('local-')
  )
}

const corsOrigins = rawEnv.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (corsOrigins.length === 0) {
  throw new Error(
    'Environment validation failed:\n- CORS_ORIGINS must contain at least one origin.',
  )
}

if (emailProvider === 'smtp' && smtpHost.length === 0) {
  throw new Error(
    'Environment validation failed:\n- SMTP_HOST is required when EMAIL_PROVIDER=smtp.',
  )
}

if (emailProvider === 'smtp' && smtpPass.length === 0) {
  throw new Error(
    'Environment validation failed:\n- SMTP_PASS or EMAIL_API_KEY is required when EMAIL_PROVIDER=smtp.',
  )
}

if (enableWorkers && redisUrl.length === 0) {
  throw new Error(
    'Environment validation failed:\n- REDIS_URL is required when ENABLE_BACKGROUND_WORKERS=true.',
  )
}

if (nodeEnv === 'production') {
  const productionIssues = []

  if (isPlaceholderSecret(jwtSecret)) {
    productionIssues.push('JWT access secret must be a real production secret, not a placeholder.')
  }

  if (isPlaceholderSecret(jwtRefreshSecret)) {
    productionIssues.push('JWT refresh secret must be a real production secret, not a placeholder.')
  }

  if (jwtRefreshSecret === jwtSecret) {
    productionIssues.push(
      'JWT_REFRESH_SECRET_KEY must be different from JWT_SECRET_KEY in production.',
    )
  }

  if (corsOrigins.includes('*')) {
    productionIssues.push('CORS_ORIGINS cannot contain * in production.')
  }

  if (emailProvider !== 'smtp') {
    productionIssues.push('EMAIL_PROVIDER must be smtp in production.')
  }

  if (redisUrl.length === 0) {
    productionIssues.push('REDIS_URL is required in production.')
  }

  if (!enableWorkers) {
    productionIssues.push('ENABLE_BACKGROUND_WORKERS must be true in production.')
  }

  if (productionIssues.length) {
    throw new Error(
      `Environment validation failed:\n${productionIssues.map((issue) => `- ${issue}`).join('\n')}`,
    )
  }
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  DATABASE_URL: rawEnv.DATABASE_URL,
  JWT_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_ACCESS_TTL_SECONDS: Number(rawEnv.JWT_ACCESS_TTL_SECONDS),
  JWT_REFRESH_TTL_DAYS: Number(rawEnv.JWT_REFRESH_TTL_DAYS),
  CORS_ORIGINS: corsOrigins,
  ENABLE_DAILY_STATS_JOB: rawEnv.ENABLE_DAILY_STATS_JOB === 'true',
  PUBLIC_APP_URL: rawEnv.PUBLIC_APP_URL.replace(/\/$/, ''),
  EMAIL_PROVIDER: emailProvider,
  EMAIL_FROM: emailFrom,
  EMAIL_REPLY_TO: rawEnv.EMAIL_REPLY_TO.trim() || null,
  EMAIL_LOG_PATH: rawEnv.EMAIL_LOG_PATH,
  SMTP_HOST: smtpHost,
  SMTP_PORT: Number(rawEnv.SMTP_PORT),
  SMTP_USER: smtpUser.trim(),
  SMTP_PASS: smtpPass,
  SMTP_SECURE: rawEnv.SMTP_SECURE === 'true',
  EMAIL_VERIFICATION_TTL_MINUTES: Number(rawEnv.EMAIL_VERIFICATION_TTL_MINUTES),
  PASSWORD_RESET_TTL_MINUTES: Number(rawEnv.PASSWORD_RESET_TTL_MINUTES),
  ENABLE_BACKGROUND_WORKERS: enableWorkers,
  START_WORKERS_IN_API: rawEnv.START_WORKERS_IN_API === 'true',
  REDIS_URL: redisUrl,
  EMAIL_QUEUE_NAME: rawEnv.EMAIL_QUEUE_NAME,
  MAINTENANCE_QUEUE_NAME: rawEnv.MAINTENANCE_QUEUE_NAME,
  STATS_JOB_REPEAT_MS: Number(rawEnv.STATS_JOB_REPEAT_MS),
  ADMIN_NOTIFICATION_EMAILS: rawEnv.ADMIN_NOTIFICATION_EMAILS.split(',')
    .map((email) => email.trim())
    .filter(Boolean),
}
