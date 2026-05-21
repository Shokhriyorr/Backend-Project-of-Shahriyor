import { ApiError } from './api.js'

export function parseLimit(rawLimit, defaultLimit = 20) {
  if (rawLimit == null || rawLimit === '') {
    return defaultLimit
  }

  const limit = Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(400, 'bad_request', 'Query parameter limit must be between 1 and 100.', {
      limit: 'must be an integer between 1 and 100',
    })
  }

  return limit
}

export function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCursor(rawCursor) {
  try {
    return JSON.parse(Buffer.from(rawCursor, 'base64url').toString('utf8'))
  } catch {
    throw new ApiError(400, 'bad_request', 'Cursor is invalid.', {
      cursor: 'must be a valid opaque cursor',
    })
  }
}

export function buildCreatedAtCursorFilter(rawCursor, direction = 'desc', fieldName = 'createdAt') {
  if (!rawCursor) {
    return {}
  }

  const cursor = decodeCursor(rawCursor)
  const createdAt = new Date(cursor.createdAt)

  if (Number.isNaN(createdAt.getTime()) || !/^\d+$/.test(String(cursor.id ?? ''))) {
    throw new ApiError(400, 'bad_request', 'Cursor is invalid.', {
      cursor: 'must include createdAt and id',
    })
  }

  const id = BigInt(cursor.id)

  if (direction === 'asc') {
    return {
      OR: [
        { [fieldName]: { gt: createdAt } },
        { [fieldName]: createdAt, id: { gt: id } },
      ],
    }
  }

  return {
    OR: [
      { [fieldName]: { lt: createdAt } },
      { [fieldName]: createdAt, id: { lt: id } },
    ],
  }
}

export function makeCreatedAtCursor(record, fieldName = 'createdAt') {
  return encodeCursor({
    createdAt: record[fieldName].toISOString(),
    id: record.id.toString(),
  })
}

export function pageResponse(records, limit, serialize, makeCursor) {
  const hasMore = records.length > limit
  const page = hasMore ? records.slice(0, limit) : records

  return {
    data: page.map(serialize),
    meta: {
      next_cursor: hasMore ? makeCursor(page.at(-1)) : null,
      limit,
      has_more: hasMore,
    },
  }
}

export function buildStringCursorFilter(rawCursor, fieldName) {
  if (!rawCursor) {
    return {}
  }

  const cursor = decodeCursor(rawCursor)
  if (typeof cursor.value !== 'string' || !/^\d+$/.test(String(cursor.id ?? ''))) {
    throw new ApiError(400, 'bad_request', 'Cursor is invalid.', {
      cursor: 'must include value and id',
    })
  }

  return {
    OR: [
      { [fieldName]: { gt: cursor.value } },
      { [fieldName]: cursor.value, id: { gt: BigInt(cursor.id) } },
    ],
  }
}

export function makeStringCursor(record, fieldName) {
  return encodeCursor({
    value: record[fieldName],
    id: record.id.toString(),
  })
}
