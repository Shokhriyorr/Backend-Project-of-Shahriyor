import { extractCollection, request } from '@/shared/api/httpClient.js'

export const getTeachers = () => request('/teachers').then(extractCollection)

export const createTeacher = (data) =>
  request('/teachers', { method: 'POST', body: JSON.stringify(data) })

export const updateTeacher = (id, data) =>
  request(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteTeacher = (id) => request(`/teachers/${id}`, { method: 'DELETE' })

export const getCourses = (params = {}) => {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.category_id) query.set('category_id', params.category_id)
  if (params.level) query.set('level', params.level)
  if (params.limit) query.set('limit', String(params.limit))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/courses${suffix}`).then(extractCollection)
}

export const getCourse = (id) =>
  request(`/courses/${id}`).then((payload) => payload.data ?? payload)

export const createCourse = (data) =>
  request('/courses', { method: 'POST', body: JSON.stringify(normalizeCoursePayload(data)) })

export const updateCourse = (id, data) =>
  request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(normalizeCoursePayload(data)) })

export const deleteCourse = (id) => request(`/courses/${id}`, { method: 'DELETE' })

export const getEnrollments = () =>
  request('/enrollments').then((payload) =>
    extractCollection(payload).map((enrollment) => enrollment.course_id ?? enrollment.courseId),
  )

export const enroll = (courseId) =>
  request('/enrollments', { method: 'POST', body: JSON.stringify({ course_id: courseId }) })

export const unenroll = (courseId) => request(`/enrollments/${courseId}`, { method: 'DELETE' })

export const getCategories = () => request('/categories').then(extractCollection)

export const createCategory = (data) =>
  request('/categories', { method: 'POST', body: JSON.stringify(data) })

export const updateCategory = (id, data) =>
  request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteCategory = (id) => request(`/categories/${id}`, { method: 'DELETE' })

function normalizeCoursePayload(data) {
  return {
    name: data.name,
    short_description: data.shortDescription ?? data.short_description,
    description: data.description,
    category_id: data.categoryId ?? data.category_id,
    teacher_id: data.teacherId ?? data.teacher_id,
    lessons: data.lessons,
    level: data.level,
    status: data.status,
    capacity: data.capacity ?? 100,
  }
}
