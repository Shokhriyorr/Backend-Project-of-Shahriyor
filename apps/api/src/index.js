import app from './app/app.js'
import { env } from './config/env.js'
import {
  startCourseDailyStatsScheduler,
  stopCourseDailyStatsScheduler,
} from './modules/catalog/jobs/course-daily-stats.job.js'
import { disconnectPrisma } from './shared/database/prisma.js'
import { closeEmailQueue } from './modules/notifications/queues/email.queue.js'
import {
  closeMaintenanceQueue,
  ensureMaintenanceSchedules,
} from './modules/operations/queues/maintenance.queue.js'
import { closeRedisConnection } from './shared/queues/redis.js'
import { startEmailWorker, stopEmailWorker } from './modules/notifications/workers/email.worker.js'
import {
  startMaintenanceWorker,
  stopMaintenanceWorker,
} from './modules/operations/workers/maintenance.worker.js'

const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`)
})

if (env.START_WORKERS_IN_API) {
  startEmailWorker()
  startMaintenanceWorker()
  startCourseDailyStatsScheduler()
  ensureMaintenanceSchedules().catch((error) => {
    console.error('Failed to schedule maintenance jobs:', error)
  })
} else {
  console.log('Background workers are managed by the worker service.')
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`)
  stopCourseDailyStatsScheduler()

  server.close(async () => {
    await stopEmailWorker()
    await stopMaintenanceWorker()
    await closeEmailQueue()
    await closeMaintenanceQueue()
    await closeRedisConnection()
    await disconnectPrisma()
    process.exit(0)
  })

  setTimeout(() => {
    process.exit(1)
  }, 10000).unref()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal).catch((error) => {
      console.error('Failed to shut down cleanly:', error)
      process.exit(1)
    })
  })
}

export default server
