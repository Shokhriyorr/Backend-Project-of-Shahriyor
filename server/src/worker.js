import { env } from './config/env.js'
import { disconnectPrisma } from './prisma.js'
import { closeEmailQueue } from './queues/emailQueue.js'
import { closeMaintenanceQueue, ensureMaintenanceSchedules } from './queues/maintenanceQueue.js'
import { closeRedisConnection } from './queues/redis.js'
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker.js'
import { startMaintenanceWorker, stopMaintenanceWorker } from './workers/maintenanceWorker.js'

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
