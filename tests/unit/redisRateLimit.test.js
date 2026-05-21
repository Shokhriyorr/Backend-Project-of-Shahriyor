import { describe, expect, it, jest } from '@jest/globals'

describe('redis rate limiter fallback', () => {
  it('allows requests when redis is unavailable', async () => {
    jest.unstable_mockModule('../../apps/api/src/shared/queues/redis.js', () => ({
      getRateLimitRedis: () => null,
      getRedisConnection: () => null,
      closeRedisConnection: async () => {},
    }))

    const { createRedisRateLimiter } =
      await import('../../apps/api/src/shared/middleware/redisRateLimit.js')
    const limiter = createRedisRateLimiter({ windowMs: 60_000, max: 2, keyPrefix: 'test' })
    const req = { ip: '127.0.0.1', baseUrl: '/api/auth', path: '/login' }
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value
      },
      status(code) {
        this.statusCode = code
        return this
      },
      json() {
        return this
      },
    }

    await new Promise((resolve, reject) => {
      limiter(req, res, (error) => (error ? reject(error) : resolve()))
    })

    expect(res.statusCode).toBe(200)
  })
})
