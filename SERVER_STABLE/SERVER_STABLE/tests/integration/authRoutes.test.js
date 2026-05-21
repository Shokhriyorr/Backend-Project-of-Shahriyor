import express from 'express'
import { jest } from '@jest/globals'
import request from 'supertest'

describe('auth route integration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  async function buildAuthApp() {
    const findUnique = jest.fn()

    jest.unstable_mockModule('../../src/prisma.js', () => ({
      Prisma: {},
      default: {
        user: {
          findUnique,
        },
        $transaction: jest.fn(),
      },
    }))

    jest.unstable_mockModule('../../src/queues/emailQueue.js', () => ({
      enqueueEmail: jest.fn(),
    }))

    const { default: authRouter } = await import('../../src/routes/auth.js')
    const { errorHandler, requestIdMiddleware } = await import('../../src/utils/api.js')
    const app = express()

    app.use(requestIdMiddleware)
    app.use(express.json())
    app.use('/api/auth', authRouter)
    app.use(errorHandler)

    return {
      app,
      prisma: {
        user: {
          findUnique,
        },
      },
    }
  }

  test('blocks anonymous admin self-registration before hitting Prisma', async () => {
    const { app, prisma } = await buildAuthApp()

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin-self-register@academy.dev',
        password: 'StrongPass123',
        role: 'admin',
      })
      .expect(403)

    expect(response.body.error.code).toBe('forbidden')
    expect(response.body.error.message).toContain('Public registration is limited to student accounts')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })
})
