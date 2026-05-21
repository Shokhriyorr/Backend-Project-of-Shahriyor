import express from 'express'
import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import request from 'supertest'

describe('auth middleware integration', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  async function buildProtectedApp() {
    const { requireAuth, requireRole } = await import('../../src/middleware/auth.js')
    const { errorHandler, requestIdMiddleware } = await import('../../src/utils/api.js')
    const app = express()

    app.use(requestIdMiddleware)
    app.get('/protected', requireAuth, (_req, res) => {
      res.json({ ok: true })
    })
    app.get('/admin', requireAuth, requireRole('admin'), (_req, res) => {
      res.json({ ok: true })
    })
    app.use(errorHandler)

    return app
  }

  function signAccessToken(payload) {
    return jwt.sign({
      sub: '10',
      email: 'student@academy.dev',
      role: 'student',
      type: 'access',
      ...payload,
    }, process.env.JWT_SECRET, {
      expiresIn: 900,
    })
  }

  test('rejects protected routes without bearer token', async () => {
    const app = await buildProtectedApp()

    const response = await request(app)
      .get('/protected')
      .expect(401)

    expect(response.body.error.code).toBe('unauthorized')
  })

  test('rejects unverified users even with a signed access token', async () => {
    const app = await buildProtectedApp()
    const token = signAccessToken({
      email_verified: false,
    })

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.error.code).toBe('forbidden')
    expect(response.body.error.details.verification_required).toBe(true)
  })

  test('rejects valid student token on admin-only route', async () => {
    const app = await buildProtectedApp()
    const token = signAccessToken({
      email_verified: true,
    })

    const response = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)

    expect(response.body.error.code).toBe('forbidden')
    expect(response.body.error.details.required_roles).toEqual(['admin'])
  })
})
