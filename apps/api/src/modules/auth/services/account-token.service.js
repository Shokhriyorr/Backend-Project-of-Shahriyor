import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import prisma from '../../../shared/database/prisma.js'
import { env } from '../../../config/env.js'
import { appendAuditLog } from '../../audit/services/audit.service.js'
import { ApiError } from '../../../shared/http/api.js'

function addMinutes(date, minutes) {
  const nextDate = new Date(date)
  nextDate.setUTCMinutes(nextDate.getUTCMinutes() + minutes)
  return nextDate
}

export function createOpaqueToken() {
  return randomBytes(32).toString('base64url')
}

export function hashAccountToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAccountToken({ tx = prisma, userId, purpose, ttlMinutes }) {
  const token = createOpaqueToken()
  const now = new Date()

  await tx.accountToken.updateMany({
    where: {
      userId: BigInt(userId),
      purpose,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      usedAt: now,
    },
  })

  await tx.accountToken.create({
    data: {
      userId: BigInt(userId),
      purpose,
      tokenHash: hashAccountToken(token),
      expiresAt: addMinutes(now, ttlMinutes),
    },
  })

  return token
}

async function consumeAccountToken({ tx, token, purpose }) {
  const tokenRecord = await tx.accountToken.findUnique({
    where: {
      tokenHash: hashAccountToken(token),
    },
    include: {
      user: true,
    },
  })

  if (
    !tokenRecord ||
    tokenRecord.purpose !== purpose ||
    tokenRecord.usedAt ||
    tokenRecord.expiresAt <= new Date()
  ) {
    throw new ApiError(401, 'unauthorized', 'Token is invalid or expired.')
  }

  await tx.accountToken.update({
    where: {
      id: tokenRecord.id,
    },
    data: {
      usedAt: new Date(),
    },
  })

  return tokenRecord.user
}

export async function verifyEmailToken({ token, req }) {
  return prisma.$transaction(async (tx) => {
    const user = await consumeAccountToken({
      tx,
      token,
      purpose: 'email_verification',
    })

    const verifiedAt = user.emailVerifiedAt ?? new Date()
    const updatedUser = await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: verifiedAt,
      },
    })

    await appendAuditLog(tx, {
      req,
      actorUserId: updatedUser.id,
      entityType: 'user',
      entityId: updatedUser.id,
      action: 'verify_email',
      before: user,
      after: updatedUser,
    })

    return updatedUser
  })
}

export async function resetPasswordWithToken({ token, password, req }) {
  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.$transaction(async (tx) => {
    const user = await consumeAccountToken({
      tx,
      token,
      purpose: 'password_reset',
    })

    const updatedUser = await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        updatedAt: new Date(),
      },
    })

    await tx.authSession.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    await appendAuditLog(tx, {
      req,
      actorUserId: updatedUser.id,
      entityType: 'user',
      entityId: updatedUser.id,
      action: 'reset_password',
      before: user,
      after: updatedUser,
    })

    return updatedUser
  })
}

export function verificationTokenTtl() {
  return env.EMAIL_VERIFICATION_TTL_MINUTES
}

export function passwordResetTokenTtl() {
  return env.PASSWORD_RESET_TTL_MINUTES
}
