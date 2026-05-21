import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../prisma.js'
import { authRateLimiter } from '../middleware/rateLimit.js'
import { validateBody } from '../middleware/validate.js'
import { enqueueEmail } from '../queues/emailQueue.js'
import {
  createAccountToken,
  passwordResetTokenTtl,
  resetPasswordWithToken,
  verificationTokenTtl,
  verifyEmailToken,
} from '../services/accountTokenService.js'
import { appendAuditLog } from '../services/auditService.js'
import { issueAuthTokens, refreshAccessToken, revokeRefreshToken } from '../services/authService.js'
import { buildPasswordResetEmail, buildVerificationEmail } from '../services/emailTemplates.js'
import {
  accountTokenBodySchema,
  emailBodySchema,
  loginBodySchema,
  passwordResetConfirmBodySchema,
  refreshTokenBodySchema,
  registerBodySchema,
} from '../validation/schemas.js'
import { ApiError, asyncHandler, mutationSuccess } from '../utils/api.js'
import { serializeUser } from '../utils/serializers.js'

const router = Router()

router.post(
  '/register',
  authRateLimiter,
  validateBody(registerBodySchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.trim().toLowerCase()
    const displayName = req.body.display_name ?? req.body.displayName ?? null

    if (req.body.role !== 'student') {
      throw new ApiError(
        403,
        'forbidden',
        'Public registration is limited to student accounts. Admin accounts must be provisioned by an existing operator.',
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError(409, 'conflict', 'An account with this email already exists.', {
        email,
      })
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12)

    const { user, verificationToken } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: req.body.role,
          displayName,
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: user.id,
        entityType: 'user',
        entityId: user.id,
        action: 'create',
        after: user,
      })

      const verificationToken = await createAccountToken({
        tx,
        userId: user.id,
        purpose: 'email_verification',
        ttlMinutes: verificationTokenTtl(),
      })

      return { user, verificationToken }
    })

    const emailJob = await enqueueEmail(
      buildVerificationEmail({
        user,
        token: verificationToken,
      }),
    )

    return res.status(201).json({
      ok: true,
      verification_required: true,
      message: 'Account created. Check your email to verify the account before logging in.',
      user: serializeUser(user),
      email_job: emailJob,
    })
  }),
)

router.post(
  '/login',
  authRateLimiter,
  validateBody(loginBodySchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new ApiError(401, 'unauthorized', 'Wrong email or password.')
    }

    const isValidPassword = await bcrypt.compare(req.body.password, user.passwordHash)

    if (!isValidPassword) {
      throw new ApiError(401, 'unauthorized', 'Wrong email or password.')
    }

    if (!user.emailVerifiedAt) {
      throw new ApiError(403, 'forbidden', 'Email verification is required before login.', {
        verification_required: true,
      })
    }

    const payload = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: updatedUser.id,
        entityType: 'user',
        entityId: updatedUser.id,
        action: 'login',
        after: updatedUser,
      })

      return issueAuthTokens({ tx, user: updatedUser, req })
    })

    return res.json(payload)
  }),
)

router.post(
  '/refresh',
  validateBody(refreshTokenBodySchema),
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refresh_token ?? req.body.refreshToken
    const payload = await refreshAccessToken(refreshToken, req)
    return res.json(payload)
  }),
)

router.post(
  '/logout',
  validateBody(refreshTokenBodySchema),
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refresh_token ?? req.body.refreshToken
    await revokeRefreshToken(refreshToken)
    return res.json(mutationSuccess('Refresh session revoked successfully.'))
  }),
)

router.get(
  '/verify-email',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? '').trim()

    if (!token) {
      throw new ApiError(400, 'bad_request', 'token query parameter is required.')
    }

    const user = await verifyEmailToken({ token, req })
    return res.json({
      ok: true,
      message: 'Email verified successfully. You can now log in.',
      user: serializeUser(user),
    })
  }),
)

router.post(
  '/verify-email',
  authRateLimiter,
  validateBody(accountTokenBodySchema),
  asyncHandler(async (req, res) => {
    const user = await verifyEmailToken({
      token: req.body.token,
      req,
    })

    return res.json({
      ok: true,
      message: 'Email verified successfully. You can now log in.',
      user: serializeUser(user),
    })
  }),
)

router.post(
  '/resend-verification',
  authRateLimiter,
  validateBody(emailBodySchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (user && !user.emailVerifiedAt) {
      const verificationToken = await prisma.$transaction(async (tx) => {
        return createAccountToken({
          tx,
          userId: user.id,
          purpose: 'email_verification',
          ttlMinutes: verificationTokenTtl(),
        })
      })

      await enqueueEmail(
        buildVerificationEmail({
          user,
          token: verificationToken,
        }),
      )
    }

    return res.json(
      mutationSuccess(
        'If the account exists and is unverified, a verification email has been queued.',
      ),
    )
  }),
)

router.post(
  '/password-reset/request',
  authRateLimiter,
  validateBody(emailBodySchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      const resetToken = await prisma.$transaction(async (tx) => {
        const token = await createAccountToken({
          tx,
          userId: user.id,
          purpose: 'password_reset',
          ttlMinutes: passwordResetTokenTtl(),
        })

        await appendAuditLog(tx, {
          req,
          actorUserId: user.id,
          entityType: 'user',
          entityId: user.id,
          action: 'request_password_reset',
          after: user,
        })

        return token
      })

      await enqueueEmail(
        buildPasswordResetEmail({
          user,
          token: resetToken,
        }),
      )
    }

    return res.json(
      mutationSuccess(
        'If an account exists for this email, a password reset email has been queued.',
      ),
    )
  }),
)

router.post(
  '/password-reset/confirm',
  authRateLimiter,
  validateBody(passwordResetConfirmBodySchema),
  asyncHandler(async (req, res) => {
    const user = await resetPasswordWithToken({
      token: req.body.token,
      password: req.body.password,
      req,
    })

    return res.json({
      ok: true,
      message: 'Password reset successfully. Existing refresh sessions were revoked.',
      user: serializeUser(user),
    })
  }),
)

export default router
