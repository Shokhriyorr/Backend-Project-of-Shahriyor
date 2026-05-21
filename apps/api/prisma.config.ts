import { config as loadEnv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

loadEnv({ path: '../../.env' })
loadEnv()

export default defineConfig({
  schema: '../../database/prisma/schema.prisma',
  migrations: {
    path: '../../migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
