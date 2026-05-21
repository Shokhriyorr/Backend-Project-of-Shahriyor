import { config as loadEnv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

loadEnv({ path: '../../.env' })
loadEnv()

const dockerBuild = process.env.DOCKER_BUILD === 'true'

export default defineConfig({
  schema: dockerBuild ? './prisma/schema.prisma' : '../../database/prisma/schema.prisma',
  migrations: {
    path: dockerBuild ? '../../migrations' : '../../migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
