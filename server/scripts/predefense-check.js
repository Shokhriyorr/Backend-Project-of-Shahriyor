import 'dotenv/config'
import net from 'node:net'

const strict = process.argv.includes('--strict') || process.env.PREDEFENSE_STRICT === 'true'
const port = Number(process.env.PORT ?? 3000)
const baseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${port}`
const errors = []
const warnings = []
const passes = []

function pass(message) {
  passes.push(message)
}

function warn(message) {
  warnings.push(message)
}

function fail(message) {
  errors.push(message)
}

function parseBoolean(value) {
  return String(value ?? '').toLowerCase() === 'true'
}

function parseConnectionString(value, label) {
  try {
    return new URL(value)
  } catch {
    fail(`${label} is not a valid URL.`)
    return null
  }
}

function checkTcp({ host, port: targetPort, label, timeoutMs = 3000 }) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false

    function finish(ok, message) {
      if (settled) {
        return
      }
      settled = true
      socket.destroy()
      resolve({ ok, message })
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true, `${label} is reachable at ${host}:${targetPort}.`))
    socket.once('timeout', () => finish(false, `${label} timed out at ${host}:${targetPort}.`))
    socket.once('error', (error) =>
      finish(false, `${label} is not reachable at ${host}:${targetPort}: ${error.message}`),
    )
    socket.connect(targetPort, host)
  })
}

async function checkHttp(path, label, validate = () => true) {
  const url = `${baseUrl}${path}`

  try {
    const response = await fetch(url)
    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      fail(`${label} returned HTTP ${response.status}.`)
      return null
    }

    if (!validate(body)) {
      fail(`${label} returned an unexpected response shape.`)
      return null
    }

    pass(`${label} ok (${url}).`)
    return body
  } catch (error) {
    fail(`${label} failed at ${url}: ${error.message}`)
    return null
  }
}

function checkEnv() {
  if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL is required.')
  } else {
    pass('DATABASE_URL is present.')
  }

  const jwtSecret = (process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || '').trim()
  const jwtRefreshSecret = (process.env.JWT_REFRESH_SECRET_KEY || '').trim()

  if (!jwtSecret || jwtSecret.length < 32) {
    fail('JWT_SECRET_KEY (or JWT_SECRET) must be at least 32 characters.')
  } else if (
    jwtSecret.includes('replace-with') ||
    jwtSecret.includes('test-secret') ||
    jwtSecret.includes('docker-local-demo') ||
    jwtSecret.includes('local-')
  ) {
    fail('JWT access secret still looks like a placeholder.')
  } else {
    pass('JWT access secret looks non-placeholder.')
  }

  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    fail('JWT_REFRESH_SECRET_KEY must be at least 32 characters.')
  } else if (
    jwtRefreshSecret.includes('replace-with') ||
    jwtRefreshSecret.includes('test-secret') ||
    jwtRefreshSecret.includes('docker-local-demo') ||
    jwtRefreshSecret.includes('local-')
  ) {
    fail('JWT refresh secret still looks like a placeholder.')
  } else if (jwtRefreshSecret === jwtSecret) {
    fail('JWT_REFRESH_SECRET_KEY must be different from JWT_SECRET_KEY for defense/production.')
  } else {
    pass('JWT refresh secret looks non-placeholder and separate.')
  }

  const corsOrigins = String(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (corsOrigins.length === 0) {
    fail('CORS_ORIGINS must contain at least one origin.')
  } else if (corsOrigins.includes('*')) {
    fail('CORS_ORIGINS must not contain * for defense/production.')
  } else {
    pass(`CORS_ORIGINS has ${corsOrigins.length} explicit origin(s).`)
  }

  if (!process.env.PUBLIC_APP_URL) {
    fail('PUBLIC_APP_URL is required for verification/reset links.')
  } else {
    pass(`PUBLIC_APP_URL is ${process.env.PUBLIC_APP_URL}.`)
  }

  if (process.env.EMAIL_PROVIDER !== 'smtp') {
    const message = 'EMAIL_PROVIDER is not smtp, so real inbox delivery will not be demonstrated.'
    strict ? fail(message) : warn(message)
  } else {
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_API_KEY
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const emailFrom = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM

    if (!smtpHost || !process.env.SMTP_PORT || !emailFrom) {
      fail('SMTP_HOST, SMTP_PORT, and EMAIL_FROM_ADDRESS are required when EMAIL_PROVIDER=smtp.')
    }

    if (!smtpPass) {
      fail('SMTP_PASS or EMAIL_API_KEY is required when EMAIL_PROVIDER=smtp.')
    }

    if (!smtpUser && !process.env.EMAIL_API_KEY) {
      fail('SMTP_USER or EMAIL_API_KEY is required when EMAIL_PROVIDER=smtp.')
    }
    pass('SMTP email provider is selected.')
  }

  if (!parseBoolean(process.env.ENABLE_BACKGROUND_WORKERS)) {
    const message = 'ENABLE_BACKGROUND_WORKERS=false, so Redis queue demo will be skipped.'
    strict ? fail(message) : warn(message)
  } else {
    pass('Background workers are enabled.')
  }
}

async function checkTcpDependencies() {
  if (process.env.DATABASE_URL) {
    const databaseUrl = parseConnectionString(
      process.env.DATABASE_URL.replace(/^"|"$/g, ''),
      'DATABASE_URL',
    )
    if (databaseUrl) {
      const result = await checkTcp({
        host: databaseUrl.hostname,
        port: Number(databaseUrl.port || 5432),
        label: 'PostgreSQL',
      })
      result.ok ? pass(result.message) : fail(result.message)
    }
  }

  if (parseBoolean(process.env.ENABLE_BACKGROUND_WORKERS)) {
    const redisUrl = parseConnectionString(process.env.REDIS_URL, 'REDIS_URL')
    if (redisUrl) {
      const result = await checkTcp({
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        label: 'Redis',
      })
      result.ok ? pass(result.message) : fail(result.message)
    }
  }
}

async function checkApi() {
  await checkHttp('/health', 'Health endpoint', (body) => body?.ok === true)
  const readiness = await checkHttp(
    '/health/ready',
    'Readiness endpoint',
    (body) => body?.ok === true,
  )

  if (readiness?.checks?.redis?.skipped) {
    const message = 'Readiness skipped Redis because background workers are disabled.'
    strict ? fail(message) : warn(message)
  }

  await checkHttp(
    '/docs',
    'Swagger UI',
    (body) => typeof body === 'string' && body.includes('Swagger UI'),
  )
  await checkHttp(
    '/api/courses',
    'Public courses endpoint',
    (body) => Array.isArray(body?.data) && body?.meta,
  )
}

function printReport() {
  console.log('\nPre-defense check')
  console.log('=================')
  console.log(`Mode: ${strict ? 'strict defense' : 'local advisory'}`)
  console.log(`API base URL: ${baseUrl}`)

  if (passes.length) {
    console.log('\nPASS')
    for (const message of passes) {
      console.log(`- ${message}`)
    }
  }

  if (warnings.length) {
    console.log('\nWARN')
    for (const message of warnings) {
      console.log(`- ${message}`)
    }
  }

  if (errors.length) {
    console.log('\nFAIL')
    for (const message of errors) {
      console.log(`- ${message}`)
    }
  }
}

checkEnv()
await checkTcpDependencies()
await checkApi()
printReport()

if (errors.length) {
  process.exit(1)
}
