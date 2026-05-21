import { Queue } from 'bullmq'
import { env } from '../config/env.js'
import { getRedisConnection } from './redis.js'

let maintenanceQueue = null

export function getMaintenanceQueue() {
  if (!env.ENABLE_BACKGROUND_WORKERS) {
    return null
  }

  if (!maintenanceQueue) {
    maintenanceQueue = new Queue(env.MAINTENANCE_QUEUE_NAME, {
      connection: getRedisConnection(),
    })
  }

  return maintenanceQueue
}

export async function enqueueCourseDailyStatsJob({ repeat = false } = {}) {
  const queue = getMaintenanceQueue()

  if (!queue) {
    return {
      queued: false,
      reason: 'background_workers_disabled',
    }
  }

  const jobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  }

  if (repeat) {
    jobOptions.repeat = {
      every: env.STATS_JOB_REPEAT_MS,
    }
    jobOptions.jobId = 'sync-course-daily-stats-repeat'
  }

  const job = await queue.add('sync-course-daily-stats', {}, jobOptions)

  return {
    queued: true,
    job_id: job.id,
  }
}

export async function ensureMaintenanceSchedules() {
  if (!env.ENABLE_BACKGROUND_WORKERS || !env.ENABLE_DAILY_STATS_JOB) {
    return
  }

  await enqueueCourseDailyStatsJob({ repeat: true })
}

function serializeJob(job) {
  return {
    id: job.id,
    name: job.name,
    attempts_made: job.attemptsMade,
    failed_reason: job.failedReason ?? null,
    timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
    processed_on: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    finished_on: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
  }
}

export async function getMaintenanceQueueSnapshot() {
  const queue = getMaintenanceQueue()

  if (!queue) {
    return {
      enabled: false,
      counts: {},
      jobs: [],
    }
  }

  const [counts, jobs] = await Promise.all([
    queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    queue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 0, 25, false),
  ])

  return {
    enabled: true,
    counts,
    jobs: jobs.map(serializeJob),
  }
}

export async function closeMaintenanceQueue() {
  if (maintenanceQueue) {
    await maintenanceQueue.close()
    maintenanceQueue = null
  }
}
