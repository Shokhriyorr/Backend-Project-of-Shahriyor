import express from 'express'
import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import request from 'supertest'

describe('enrollment route integration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function signStudentToken() {
    return jwt.sign(
      {
        sub: '42',
        email: 'student@academy.dev',
        role: 'student',
        type: 'access',
        email_verified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: 900 },
    )
  }

  async function buildEnrollmentApp() {
    const createEnrollment = jest.fn(async () => ({
      id: 7n,
      courseId: 3n,
      status: 'active',
      enrolledAt: new Date('2026-05-22T10:00:00.000Z'),
      cancelledAt: null,
      course: {
        id: 3n,
        name: 'Node.js Foundations',
        slug: 'node-foundations',
        level: 'beginner',
        status: 'published',
        teacher: { id: 1n, fullName: 'Aida Teacher' },
        courseCategory: { id: 1n, name: 'Backend' },
      },
    }))

    jest.unstable_mockModule(
      '../../apps/api/src/modules/enrollments/services/enrollment.service.js',
      () => ({
        createEnrollment,
        cancelEnrollment: jest.fn(),
      }),
    )

    const { default: enrollmentRouter } =
      await import('../../apps/api/src/modules/enrollments/routes/enrollments.routes.js')
    const { requireAuth } = await import('../../apps/api/src/shared/middleware/auth.js')
    const { errorHandler, requestIdMiddleware } =
      await import('../../apps/api/src/shared/http/api.js')
    const app = express()

    app.use(requestIdMiddleware)
    app.use(express.json())
    app.use('/api/enrollments', requireAuth, enrollmentRouter)
    app.use(errorHandler)

    return { app, createEnrollment }
  }

  test('creates enrollment for verified student and returns serialized payload', async () => {
    const { app, createEnrollment } = await buildEnrollmentApp()
    const token = signStudentToken()

    const response = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ course_id: '3' })
      .expect(201)

    expect(createEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42n,
        courseId: 3n,
      }),
    )
    expect(response.body.course.name).toBe('Node.js Foundations')
    expect(response.body.status).toBe('active')
  })

  test('rejects enrollment payload without course_id', async () => {
    const { app } = await buildEnrollmentApp()
    const token = signStudentToken()

    const response = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(422)

    expect(response.body.error.code).toBe('unprocessable_entity')
  })
})
