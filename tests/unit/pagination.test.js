import { ApiError } from '../../server/src/utils/api.js'
import {
  buildCreatedAtCursorFilter,
  encodeCursor,
  makeCreatedAtCursor,
  pageResponse,
  parseLimit,
} from '../../server/src/utils/pagination.js'

describe('pagination helpers', () => {
  test('uses default limit and rejects unsafe limits', () => {
    expect(parseLimit(undefined)).toBe(20)
    expect(parseLimit('100')).toBe(100)
    expect(() => parseLimit('0')).toThrow(ApiError)
    expect(() => parseLimit('101')).toThrow(ApiError)
  })

  test('creates and consumes created_at cursor filters', () => {
    const record = {
      id: 55n,
      createdAt: new Date('2026-05-13T10:00:00.000Z'),
    }

    const cursor = makeCreatedAtCursor(record)
    expect(buildCreatedAtCursorFilter(cursor, 'desc')).toEqual({
      OR: [
        { createdAt: { lt: record.createdAt } },
        { createdAt: record.createdAt, id: { lt: 55n } },
      ],
    })
  })

  test('rejects malformed cursor payloads', () => {
    const cursor = encodeCursor({ createdAt: 'not-a-date', id: '55' })
    expect(() => buildCreatedAtCursorFilter(cursor)).toThrow(ApiError)
  })

  test('builds consistent paginated response metadata', () => {
    const records = [
      { id: 1n, createdAt: new Date('2026-05-13T10:00:00.000Z') },
      { id: 2n, createdAt: new Date('2026-05-13T09:00:00.000Z') },
    ]

    const response = pageResponse(
      records,
      1,
      (record) => ({ id: record.id.toString() }),
      makeCreatedAtCursor,
    )

    expect(response.data).toEqual([{ id: '1' }])
    expect(response.meta.limit).toBe(1)
    expect(response.meta.has_more).toBe(true)
    expect(response.meta.next_cursor).toBe(makeCreatedAtCursor(records[0]))
  })
})
