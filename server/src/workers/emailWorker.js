import { Worker, QueueEvents } from 'bullmq'
import { env } from '../config/env.js'
import { getRedisConnection } from '../queues/redis.js'
import { sendEmailNow } from '../services/emailService.js'

let worker = null
let queueEvents = null

export function startEmailWorker() {
  if (!env.ENABLE_BACKGROUND_WORKERS || worker) {
    return
  }

  const connection = getRedisConnection()

  worker = new Worker(env.EMAIL_QUEUE_NAME, async (job) => {
    return sendEmailNow(job.data)
  }, {
    connection,
    concurrency: 5,
  })

  queueEvents = new QueueEvents(env.EMAIL_QUEUE_NAME, {
    connection,
  })

  worker.on('failed', (job, error) => {
    console.error(`Email job ${job?.id ?? 'unknown'} failed:`, error.message)
  })

  queueEvents.on('completed', ({ jobId }) => {
    console.log(`Email job ${jobId} completed`)
  })
}

export async function stopEmailWorker() {
  if (queueEvents) {
    await queueEvents.close()
    queueEvents = null
  }

  if (worker) {
    await worker.close()
    worker = null
  }
}
