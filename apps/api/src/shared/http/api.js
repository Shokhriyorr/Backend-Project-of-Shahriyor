import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function requestIdMiddleware(req, res, next) {
  req.requestId = `req_${randomUUID().replace(/-/g, '').slice(0, 12)}`
  res.setHeader('x-request-id', req.requestId)
  next()
}

export function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]
  }

  return req.ip ?? null
}

export function toAuditJson(value) {
  if (value == null) {
    return null
  }

  return JSON.parse(
    JSON.stringify(value, (_, currentValue) =>
      typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
    ),
  )
}

export function buildErrorBody(req, error) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {},
      request_id: req.requestId,
    },
    message: error.message,
  }
}

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'not_found', `Route ${req.method} ${req.originalUrl} was not found.`))
}

function normalizePrismaError(error) {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return new ApiError(400, 'bad_request', 'Request body contains invalid JSON.')
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ApiError(409, 'conflict', 'A unique constraint was violated.', {
        target: error.meta?.target ?? null,
      })
    }

    if (error.code === 'P2003') {
      return new ApiError(409, 'conflict', 'This operation violates a related record constraint.', {
        field: error.meta?.field_name ?? null,
      })
    }

    if (error.code === 'P2025') {
      return new ApiError(404, 'not_found', 'The requested record was not found.')
    }
  }

  return new ApiError(500, 'internal_server_error', 'An unexpected error occurred.')
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error)
  }

  const normalizedError = normalizePrismaError(error)

  if (normalizedError.status >= 500) {
    console.error(`[${req.requestId}]`, error)
  }

  return res.status(normalizedError.status).json(buildErrorBody(req, normalizedError))
}

export function parseId(value, fieldName = 'id') {
  const normalized = String(value ?? '').trim()

  if (!/^\d+$/.test(normalized)) {
    throw new ApiError(400, 'bad_request', `${fieldName} must be a numeric string.`, {
      [fieldName]: 'must be a numeric string',
    })
  }

  return BigInt(normalized)
}

export function mutationSuccess(message) {
  return {
    ok: true,
    message,
  }
}
