import { jest } from '@jest/globals'

function setProductionEnv(overrides = {}) {
  process.env.NODE_ENV = 'production'
  process.env.ENVIRONMENT = 'production'
  process.env.JWT_SECRET_KEY = 'production-secret-with-enough-entropy-123456'
  process.env.JWT_REFRESH_SECRET_KEY = 'production-refresh-secret-with-enough-entropy-123456'
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/academy_db'
  process.env.CORS_ORIGINS = 'https://academy.example.com'
  process.env.EMAIL_PROVIDER = 'smtp'
  process.env.SMTP_HOST = 'smtp.sendgrid.net'
  process.env.SMTP_PASS = 'test-api-key'
  process.env.REDIS_URL = 'redis://127.0.0.1:6379'
  process.env.ENABLE_BACKGROUND_WORKERS = 'true'
  Object.assign(process.env, overrides)
}

describe('environment validation', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('rejects placeholder JWT secrets in production', async () => {
    setProductionEnv({
      JWT_SECRET_KEY: 'replace-with-a-long-random-string-at-least-32-characters',
    })

    await expect(import('../../server/src/config/env.js')).rejects.toThrow(
      'JWT access secret must be a real production secret',
    )
  })

  test('requires a distinct refresh secret in production', async () => {
    setProductionEnv({
      JWT_REFRESH_SECRET_KEY: 'production-secret-with-enough-entropy-123456',
    })

    await expect(import('../../server/src/config/env.js')).rejects.toThrow(
      'JWT_REFRESH_SECRET_KEY must be different',
    )
  })

  test('rejects wildcard CORS origins in production', async () => {
    setProductionEnv({
      CORS_ORIGINS: '*',
    })

    await expect(import('../../server/src/config/env.js')).rejects.toThrow(
      'CORS_ORIGINS cannot contain * in production',
    )
  })

  test('requires smtp and redis in production', async () => {
    setProductionEnv({
      EMAIL_PROVIDER: 'log',
      REDIS_URL: '',
      ENABLE_BACKGROUND_WORKERS: 'false',
    })

    await expect(import('../../server/src/config/env.js')).rejects.toThrow(
      'EMAIL_PROVIDER must be smtp in production',
    )
  })

  test('accepts explicit production configuration', async () => {
    setProductionEnv()

    const { env } = await import('../../server/src/config/env.js')

    expect(env.NODE_ENV).toBe('production')
    expect(env.CORS_ORIGINS).toEqual(['https://academy.example.com'])
    expect(env.EMAIL_PROVIDER).toBe('smtp')
    expect(env.ENABLE_BACKGROUND_WORKERS).toBe(true)
    expect(env.JWT_REFRESH_SECRET).toBe('production-refresh-secret-with-enough-entropy-123456')
  })
})
