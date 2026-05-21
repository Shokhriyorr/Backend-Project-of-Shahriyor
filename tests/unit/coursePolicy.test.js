import { describe, expect, it } from '@jest/globals'
import { ApiError } from '../../apps/api/src/shared/http/api.js'
import {
  resolveCourseAuditAction,
  validatePublicationPayload,
} from '../../apps/api/src/modules/catalog/services/course-policy.service.js'

describe('course publication policy', () => {
  it('requires core fields before publishing', () => {
    expect(() =>
      validatePublicationPayload({
        name: '',
        shortDescription: '',
        description: '',
        categoryId: null,
        teacherId: null,
        lessons: 0,
        capacity: 0,
      }),
    ).toThrow(ApiError)
  })

  it('maps publish and archive actions for audit logs', () => {
    expect(resolveCourseAuditAction('draft', 'published')).toBe('publish')
    expect(resolveCourseAuditAction('published', 'archived')).toBe('archive')
    expect(resolveCourseAuditAction('published', 'published')).toBe('update')
  })
})
