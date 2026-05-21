import { getRateLimitRedis } from '../queues/redis.js'
import { buildErrorBody } from '../utils/api.js'

const memoryBuckets = new Map()

function consumeMemoryBucket(key, windowMs, max) {
  const now = Date.now()
  const bucket = memoryBuckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
  }

  bucket.count += 1
  const allowed = bucket.count <= max
  return {
    allowed,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  }
}

function sendTooManyRequests(res, req, { max, windowMs, remaining, resetAt }) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  res.setHeader('Retry-After', String(retryAfterSeconds))
  res.setHeader('X-RateLimit-Limit', String(max))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  return res.status(429).json(buildErrorBody(req, {
    code: 'too_many_requests',
    message: 'Too many requests. Please try again shortly.',
    details: {
      limit: max,
      window_seconds: Math.ceil(windowMs / 1000),
      retry_after_seconds: retryAfterSeconds,
    },
  }))
}

export function createRedisRateLimiter({
  windowMs = 60_000,
  max = 5,
  keyPrefix = 'auth',
} = {}) {
  return async function redisRateLimiter(req, res, next) {
    const redis = getRateLimitRedis()
    const bucketKey = `${keyPrefix}:${req.ip}:${req.baseUrl}${req.path}`

    if (!redis) {
      const result = consumeMemoryBucket(bucketKey, windowMs, max)
      if (!result.allowed) {
        return sendTooManyRequests(res, req, { max, windowMs, remaining: result.remaining, resetAt: result.resetAt })
      }
      return next()
    }

    try {
      const count = await redis.incr(bucketKey)
      if (count === 1) {
        await redis.pexpire(bucketKey, windowMs)
      }

      const ttlMs = await redis.pttl(bucketKey)
      const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : windowMs)
      const remaining = Math.max(0, max - count)

      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', String(remaining))

      if (count > max) {
        return sendTooManyRequests(res, req, { max, windowMs, remaining, resetAt })
      }

      return next()
    } catch (error) {
      console.error('Redis rate limiter failed, using in-memory fallback:', error.message)
      const result = consumeMemoryBucket(bucketKey, windowMs, max)
      if (!result.allowed) {
        return sendTooManyRequests(res, req, { max, windowMs, remaining: result.remaining, resetAt: result.resetAt })
      }
      return next()
    }
  }
}

export const authRateLimiter = createRedisRateLimiter({
  windowMs: 60_000,
  max: 5,
  keyPrefix: 'auth',
})
