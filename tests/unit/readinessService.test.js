import { jest } from '@jest/globals'

describe('readiness service', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('reports database ready and skips Redis when workers are disabled', async () => {
    const findFirst = jest.fn().mockResolvedValue(null)
    const getRedisConnection = jest.fn()

    jest.unstable_mockModule('../../server/src/prisma.js', () => ({
      default: {
        user: {
          findFirst,
        },
      },
    }))

    jest.unstable_mockModule('../../server/src/queues/redis.js', () => ({
      getRedisConnection,
    }))

    process.env.ENABLE_BACKGROUND_WORKERS = 'false'

    const { buildReadinessSnapshot } = await import('../../server/src/services/readinessService.js')
    const snapshot = await buildReadinessSnapshot()

    expect(snapshot.ok).toBe(true)
    expect(snapshot.checks.database.ok).toBe(true)
    expect(snapshot.checks.redis).toEqual({
      ok: true,
      skipped: true,
      reason: 'background_workers_disabled',
    })
    expect(getRedisConnection).not.toHaveBeenCalled()
  })

  test('pings Redis when background workers are enabled', async () => {
    const findFirst = jest.fn().mockResolvedValue(null)
    const ping = jest.fn().mockResolvedValue('PONG')

    jest.unstable_mockModule('../../server/src/prisma.js', () => ({
      default: {
        user: {
          findFirst,
        },
      },
    }))

    jest.unstable_mockModule('../../server/src/queues/redis.js', () => ({
      getRedisConnection: jest.fn(() => ({
        ping,
      })),
    }))

    process.env.ENABLE_BACKGROUND_WORKERS = 'true'
    process.env.REDIS_URL = 'redis://127.0.0.1:6379'

    const { buildReadinessSnapshot } = await import('../../server/src/services/readinessService.js')
    const snapshot = await buildReadinessSnapshot()

    expect(snapshot.ok).toBe(true)
    expect(snapshot.checks.redis.ok).toBe(true)
    expect(ping).toHaveBeenCalledTimes(1)
  })

  test('marks readiness as failed when a dependency check fails', async () => {
    jest.unstable_mockModule('../../server/src/prisma.js', () => ({
      default: {
        user: {
          findFirst: jest.fn().mockRejectedValue(new Error('database unavailable')),
        },
      },
    }))

    jest.unstable_mockModule('../../server/src/queues/redis.js', () => ({
      getRedisConnection: jest.fn(),
    }))

    process.env.ENABLE_BACKGROUND_WORKERS = 'false'

    const { buildReadinessSnapshot } = await import('../../server/src/services/readinessService.js')
    const snapshot = await buildReadinessSnapshot()

    expect(snapshot.ok).toBe(false)
    expect(snapshot.checks.database).toEqual({
      ok: false,
      error: 'database unavailable',
    })
  })
})
