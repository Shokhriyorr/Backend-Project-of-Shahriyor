import { Queue } from 'bullmq'
import { env } from '../../../config/env.js'
import { sendEmailNow } from '../services/email.service.js'
import { getRedisConnection } from '../../../shared/queues/redis.js'

let emailQueue = null

export function getEmailQueue() {
  if (!env.ENABLE_BACKGROUND_WORKERS) {
    return null
  }

  if (!emailQueue) {
    emailQueue = new Queue(env.EMAIL_QUEUE_NAME, {
      connection: getRedisConnection(),
    })
  }

  return emailQueue
}

export async function enqueueEmail(message) {
  const queue = getEmailQueue()

  if (!queue) {
    setImmediate(() => {
      sendEmailNow(message).catch((error) => {
        console.error('Failed to send fallback email:', error)
      })
    })

    return {
      queued: false,
      fallback: 'setImmediate',
    }
  }

  const job = await queue.add('send-email', message, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 250,
  })

  return {
    queued: true,
    job_id: job.id,
  }
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
    data: {
      to: job.data?.to ?? null,
      subject: job.data?.subject ?? null,
      metadata: job.data?.metadata ?? {},
    },
  }
}

export async function getEmailQueueSnapshot() {
  const queue = getEmailQueue()

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

export async function closeEmailQueue() {
  if (emailQueue) {
    await emailQueue.close()
    emailQueue = null
  }
}
