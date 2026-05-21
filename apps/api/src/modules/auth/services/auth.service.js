import { createHash, randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import prisma from '../../../shared/database/prisma.js'
import { env } from '../../../config/env.js'
import { ApiError, getClientIp } from '../../../shared/http/api.js'
import { serializeAuthResponse } from '../../../shared/utils/serializers.js'

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function createAccessToken(user) {
  if (!user.emailVerifiedAt) {
    throw new ApiError(
      403,
      'forbidden',
      'Email verification is required before tokens can be issued.',
      {
        verification_required: true,
      },
    )
  }

  return jwt.sign(
    {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      email_verified: true,
      type: 'access',
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    },
  )
}

function createRefreshToken(user, jti) {
  return jwt.sign(
    {
      sub: user.id.toString(),
      jti,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
    },
  )
}

function decodeRefreshToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET)

    if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
    }

    return payload
  } catch {
    throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
  }
}

async function getRefreshSession(refreshToken, { allowRevoked = false } = {}) {
  const payload = decodeRefreshToken(refreshToken)
  const session = await prisma.authSession.findUnique({
    where: {
      jti: payload.jti,
    },
    include: {
      user: true,
    },
  })

  if (!session || session.userId.toString() !== payload.sub) {
    throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
  }

  if (!allowRevoked && session.revokedAt) {
    throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
  }

  if (session.expiresAt <= new Date()) {
    throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
  }

  return session
}

export async function issueAuthTokens({ tx = prisma, user, req }) {
  const jti = randomUUID()
  const refreshToken = createRefreshToken(user, jti)

  await tx.authSession.create({
    data: {
      userId: user.id,
      jti,
      refreshTokenHash: hashToken(refreshToken),
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req?.headers['user-agent']?.slice(0, 255) ?? null,
      expiresAt: addDays(new Date(), env.JWT_REFRESH_TTL_DAYS),
    },
  })

  return serializeAuthResponse({
    accessToken: createAccessToken(user),
    refreshToken,
    user,
  })
}

export async function refreshAccessToken(refreshToken, req = null) {
  const session = await getRefreshSession(refreshToken)

  if (!session.user.emailVerifiedAt) {
    throw new ApiError(
      403,
      'forbidden',
      'Email verification is required before tokens can be refreshed.',
      {
        verification_required: true,
      },
    )
  }

  return prisma.$transaction(async (tx) => {
    const revokedSession = await tx.authSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    if (revokedSession.count !== 1) {
      throw new ApiError(401, 'unauthorized', 'Refresh token is invalid or expired.')
    }

    return issueAuthTokens({
      tx,
      user: session.user,
      req,
    })
  })
}

export async function revokeRefreshToken(refreshToken) {
  const session = await getRefreshSession(refreshToken, { allowRevoked: true })

  if (!session.revokedAt) {
    await prisma.authSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }
}
