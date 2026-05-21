import { Worker, QueueEvents } from 'bullmq'
import { env } from '../config/env.js'
import { getRedisConnection } from '../queues/redis.js'
import { syncCourseDailyStats } from '../jobs/courseDailyStats.js'

let worker = null
let queueEvents = null

export function startMaintenanceWorker() {
  if (!env.ENABLE_BACKGROUND_WORKERS || worker) {
    return
  }

  const connection = getRedisConnection()

  worker = new Worker(
    env.MAINTENANCE_QUEUE_NAME,
    async (job) => {
      if (job.name === 'sync-course-daily-stats') {
        await syncCourseDailyStats()
        return { synced_at: new Date().toISOString() }
      }

      throw new Error(`Unsupported maintenance job: ${job.name}`)
    },
    {
      connection,
      concurrency: 1,
    },
  )

  queueEvents = new QueueEvents(env.MAINTENANCE_QUEUE_NAME, {
    connection,
  })

  worker.on('failed', (job, error) => {
    console.error(`Maintenance job ${job?.id ?? 'unknown'} failed:`, error.message)
  })

  queueEvents.on('completed', ({ jobId }) => {
    console.log(`Maintenance job ${jobId} completed`)
  })
}

export async function stopMaintenanceWorker() {
  if (queueEvents) {
    await queueEvents.close()
    queueEvents = null
  }

  if (worker) {
    await worker.close()
    worker = null
  }
}
