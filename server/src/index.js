import app from './app.js'
import { env } from './config/env.js'
import {
  startCourseDailyStatsScheduler,
  stopCourseDailyStatsScheduler,
} from './jobs/courseDailyStats.js'
import { disconnectPrisma } from './prisma.js'
import { closeEmailQueue } from './queues/emailQueue.js'
import { closeMaintenanceQueue, ensureMaintenanceSchedules } from './queues/maintenanceQueue.js'
import { closeRedisConnection } from './queues/redis.js'
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker.js'
import { startMaintenanceWorker, stopMaintenanceWorker } from './workers/maintenanceWorker.js'

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
