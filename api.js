const BASE = import.meta.env.VITE_API_BASE ?? '/api'

function extractErrorMessage(payload) {
  const details = payload?.error?.details
  if (details && typeof details === 'object') {
    const firstDetail = Object.values(details).find((value) => typeof value === 'string' && value.trim())
    if (firstDetail) {
      return firstDetail
    }
  }

  return payload?.error?.message || payload?.message || 'Fetch error.'
}

async function request(path, options = {}) {
  const token = localStorage.getItem('academy_token') || localStorage.getItem('academy_access_token')

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(err))
  }

  return res.json()
}

function extractCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  return payload?.data ?? []
}

export const register = (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
export const login = (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) })

export const getTeachers = () => request('/teachers').then(extractCollection)
export const createTeacher = (data) => request('/teachers', { method: 'POST', body: JSON.stringify(data) })
export const updateTeacher = (id, data) => request(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTeacher = (id) => request(`/teachers/${id}`, { method: 'DELETE' })

export const getCourses = () => request('/courses').then(extractCollection)
export const createCourse = (data) => request('/courses', { method: 'POST', body: JSON.stringify(data) })
export const updateCourse = (id, data) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteCourse = (id) => request(`/courses/${id}`, { method: 'DELETE' })

export const getEnrollments = (userId) => request(`/enrollments?userId=${userId}`)
export const enroll = (userId, courseId) => request('/enrollments', { method: 'POST', body: JSON.stringify({ userId, courseId }) })
export const unenroll = (userId, courseId) => request('/enrollments', { method: 'DELETE', body: JSON.stringify({ userId, courseId }) })

export const getCategories = () => request('/categories').then(extractCollection)
export const createCategory = (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) })
export const updateCategory = (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteCategory = (id) => request(`/categories/${id}`, { method: 'DELETE' })
