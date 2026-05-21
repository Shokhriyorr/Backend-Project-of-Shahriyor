import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../../../shared/database/prisma.js'
import { requireAuth } from '../../../shared/middleware/auth.js'
import { validateBody } from '../../../shared/middleware/validate.js'
import { appendAuditLog } from '../../audit/services/audit.service.js'
import {
  queueAccountUpdatedEmail,
  queuePasswordChangedEmail,
} from '../../notifications/services/notification.service.js'
import { ApiError, asyncHandler } from '../../../shared/http/api.js'
import { serializeUser } from '../../../shared/utils/serializers.js'
import {
  passwordChangeBodySchema,
  userProfileUpdateBodySchema,
} from '../../../shared/validation/schemas.js'

const router = Router()

function auditUserSnapshot(user, extra = {}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt,
    ...extra,
  }
}

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: BigInt(req.user.id),
      },
    })

    if (!user) {
      throw new ApiError(404, 'not_found', 'Authenticated user was not found.')
    }

    return res.json({
      data: serializeUser(user),
    })
  }),
)

router.patch(
  '/me',
  requireAuth,
  validateBody(userProfileUpdateBodySchema),
  asyncHandler(async (req, res) => {
    const userId = BigInt(req.user.id)
    const displayNameValue = req.body.display_name ?? req.body.displayName
    const displayName = displayNameValue?.trim() ? displayNameValue.trim() : null

    const { user, changedFields } = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          id: userId,
        },
      })

      if (!existingUser) {
        throw new ApiError(404, 'not_found', 'Authenticated user was not found.')
      }

      const changedFields = existingUser.displayName === displayName ? [] : ['display_name']
      const updatedUser = changedFields.length
        ? await tx.user.update({
            where: {
              id: userId,
            },
            data: {
              displayName,
            },
          })
        : existingUser

      if (changedFields.length) {
        await appendAuditLog(tx, {
          req,
          actorUserId: userId,
          entityType: 'user',
          entityId: userId,
          action: 'update',
          before: auditUserSnapshot(existingUser),
          after: auditUserSnapshot(updatedUser),
        })
      }

      return {
        user: updatedUser,
        changedFields,
      }
    })

    const emailJob = changedFields.length
      ? await queueAccountUpdatedEmail({ user, changedFields })
      : null

    return res.json({
      ok: true,
      message: changedFields.length
        ? 'Account profile updated. A confirmation email has been queued.'
        : 'Account profile is already up to date.',
      data: serializeUser(user),
      email_job: emailJob,
    })
  }),
)

router.put(
  '/me/password',
  requireAuth,
  validateBody(passwordChangeBodySchema),
  asyncHandler(async (req, res) => {
    const userId = BigInt(req.user.id)
    const currentPassword = req.body.current_password ?? req.body.currentPassword
    const newPassword = req.body.new_password ?? req.body.newPassword ?? req.body.password
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!existingUser) {
      throw new ApiError(404, 'not_found', 'Authenticated user was not found.')
    }

    const isValidPassword = await bcrypt.compare(currentPassword, existingUser.passwordHash)

    if (!isValidPassword) {
      throw new ApiError(401, 'unauthorized', 'Current password is incorrect.')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash,
          updatedAt: new Date(),
        },
      })

      await tx.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: userId,
        entityType: 'user',
        entityId: userId,
        action: 'update',
        before: auditUserSnapshot(existingUser),
        after: auditUserSnapshot(updatedUser, { passwordChanged: true }),
      })

      return updatedUser
    })

    const emailJob = await queuePasswordChangedEmail({ user: updatedUser })

    return res.json({
      ok: true,
      message:
        'Password changed. Existing refresh sessions were revoked and a confirmation email has been queued.',
      data: serializeUser(updatedUser),
      email_job: emailJob,
    })
  }),
)

export default router
