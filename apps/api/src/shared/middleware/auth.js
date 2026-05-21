import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { ApiError } from '../http/api.js'

function extractBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null
  }

  return headerValue.slice('Bearer '.length).trim()
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET)

    if (payload.type !== 'access' || !payload.sub) {
      throw new ApiError(401, 'unauthorized', 'Bearer token is missing or invalid.')
    }

    if (payload.email_verified !== true) {
      throw new ApiError(
        403,
        'forbidden',
        'Email verification is required before accessing protected routes.',
        {
          verification_required: true,
        },
      )
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(401, 'unauthorized', 'Bearer token is missing or invalid.')
  }
}

export function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    return next()
  }

  try {
    req.user = verifyAccessToken(token)
  } catch {
    req.user = undefined
  }

  return next()
}

export function requireAuth(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    return next(new ApiError(401, 'unauthorized', 'Bearer token is missing or invalid.'))
  }

  try {
    req.user = verifyAccessToken(token)
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'unauthorized', 'Bearer token is missing or invalid.'))
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'forbidden', 'You do not have permission to perform this action.', {
          required_roles: roles,
        }),
      )
    }

    return next()
  }
}
