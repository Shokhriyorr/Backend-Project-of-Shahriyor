import IORedis from 'ioredis'
import { env } from '../../config/env.js'

let workerRedisConnection = null
let rateLimitRedisConnection = null

function createRedisClient(label, { forRateLimit = false } = {}) {
  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: forRateLimit ? 1 : null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    connectTimeout: forRateLimit ? 1000 : undefined,
    commandTimeout: forRateLimit ? 1000 : undefined,
    retryStrategy: forRateLimit ? () => null : undefined,
  })

  client.on('error', (error) => {
    console.error(`${label} Redis connection error:`, error.message)
  })

  return client
}

export function getRateLimitRedis() {
  if (!env.REDIS_URL) {
    return null
  }

  if (!rateLimitRedisConnection) {
    rateLimitRedisConnection = createRedisClient('Rate limit', { forRateLimit: true })
  }

  return rateLimitRedisConnection
}

export function getRedisConnection() {
  if (!env.ENABLE_BACKGROUND_WORKERS || !env.REDIS_URL) {
    return null
  }

  if (!workerRedisConnection) {
    workerRedisConnection = createRedisClient('Worker')
  }

  return workerRedisConnection
}

export async function closeRedisConnection() {
  const clients = [workerRedisConnection, rateLimitRedisConnection].filter(Boolean)

  for (const client of clients) {
    await client.quit()
  }

  workerRedisConnection = null
  rateLimitRedisConnection = null
}
