import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '@prisma/client'
import { env } from '../../config/env.js'

const globalForPrisma = globalThis

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.__academyPrisma ?? createPrismaClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.__academyPrisma = prisma
}

export async function disconnectPrisma() {
  await prisma.$disconnect()
}

export { Prisma }
export default prisma
