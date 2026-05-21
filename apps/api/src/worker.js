import { env } from './config/env.js'
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

if (!env.ENABLE_BACKGROUND_WORKERS) {
  console.log('Background workers are disabled; worker process exiting.')
  process.exit(0)
}

startEmailWorker()
startMaintenanceWorker()
await ensureMaintenanceSchedules()

console.log('Background worker process running.')

async function shutdown(signal) {
  console.log(`${signal} received, stopping background workers...`)
  await stopEmailWorker()
  await stopMaintenanceWorker()
  await closeEmailQueue()
  await closeMaintenanceQueue()
  await closeRedisConnection()
  await disconnectPrisma()
  process.exit(0)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal).catch((error) => {
      console.error('Failed to stop worker process cleanly:', error)
      process.exit(1)
    })
  })
}
