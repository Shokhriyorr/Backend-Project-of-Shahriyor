import { ApiError } from '../../../shared/http/api.js'

// BYOI-2: Course publication state machine (draft -> published -> archived).
export function validatePublicationPayload(courseData) {
  const missingFields = []

  if (!courseData.name) missingFields.push('name')
  if (!courseData.shortDescription) missingFields.push('short_description')
  if (!courseData.description) missingFields.push('description')
  if (!courseData.categoryId) missingFields.push('category_id')
  if (!courseData.teacherId) missingFields.push('teacher_id')
  if (!courseData.lessons) missingFields.push('lessons')
  if (!courseData.capacity) missingFields.push('capacity')

  if (missingFields.length > 0) {
    throw new ApiError(
      422,
      'unprocessable_entity',
      'Course cannot be published while required fields are missing.',
      {
        missing_fields: missingFields,
      },
    )
  }
}

export function resolveCourseAuditAction(previousStatus, nextStatus) {
  if (nextStatus === 'archived') {
    return 'archive'
  }

  if (nextStatus === 'published' && previousStatus !== 'published') {
    return 'publish'
  }

  return 'update'
}
