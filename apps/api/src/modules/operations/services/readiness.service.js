import { env } from '../../../config/env.js'
import prisma from '../../../shared/database/prisma.js'
import { getRedisConnection } from '../../../shared/queues/redis.js'

async function checkDatabase() {
  const startedAt = Date.now()

  await prisma.user.findFirst({
    select: {
      id: true,
    },
  })

  return {
    ok: true,
    latency_ms: Date.now() - startedAt,
  }
}

async function checkRedis() {
  if (!env.ENABLE_BACKGROUND_WORKERS) {
    return {
      ok: true,
      skipped: true,
      reason: 'background_workers_disabled',
    }
  }

  const startedAt = Date.now()
  const connection = getRedisConnection()
  await connection.ping()

  return {
    ok: true,
    latency_ms: Date.now() - startedAt,
  }
}

async function settleCheck(check) {
  try {
    return await check()
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    }
  }
}

export async function buildReadinessSnapshot() {
  const [database, redis] = await Promise.all([settleCheck(checkDatabase), settleCheck(checkRedis)])

  const checks = {
    database,
    redis,
  }

  return {
    ok: Object.values(checks).every((check) => check.ok),
    service: 'academy-api',
    checked_at: new Date().toISOString(),
    checks,
  }
}
