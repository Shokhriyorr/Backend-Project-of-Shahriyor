const BASE = import.meta.env.VITE_API_BASE ?? '/api'

const ACCESS_TOKEN_KEY = 'academy_access_token'
const REFRESH_TOKEN_KEY = 'academy_refresh_token'
const USER_KEY = 'academy_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getStoredSession() {
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('academy_token'),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    user: readStoredUser(),
  }
}

export function persistSession(payload) {
  const accessToken = payload.access_token ?? payload.token
  const refreshToken = payload.refresh_token

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem('academy_token', accessToken)
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  if (payload.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  }
}

export function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem('academy_token')
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function extractErrorMessage(payload) {
  const details = payload?.error?.details
  if (details && typeof details === 'object') {
    const firstDetail = Object.values(details).find(
      (value) => typeof value === 'string' && value.trim(),
    )
    if (firstDetail) {
      return firstDetail
    }
  }

  return payload?.error?.message || payload?.message || 'Fetch error.'
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) {
    throw new Error('Session expired. Please log in again.')
  }

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    clearStoredSession()
    throw new Error('Session expired. Please log in again.')
  }

  const payload = await res.json()
  persistSession(payload)
  return payload.access_token ?? payload.token
}

async function request(path, options = {}, retryOnUnauthorized = true) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('academy_token')

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  if (res.status === 401 && retryOnUnauthorized && localStorage.getItem(REFRESH_TOKEN_KEY)) {
    const nextToken = await refreshAccessToken()
    return request(
      path,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
          ...options.headers,
        },
      },
      false,
    )
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(err))
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}

function extractCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  return payload?.data ?? []
}

export const register = (data) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
export const login = async (data) => {
  const payload = await request('/auth/login', { method: 'POST', body: JSON.stringify(data) })
  persistSession(payload)
  return payload
}
export const logout = async () => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (refreshToken) {
    try {
      await request(
        '/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
        false,
      )
    } catch {
      // Local cleanup still happens even if the server session is already gone.
    }
  }
  clearStoredSession()
}
export const verifyEmail = (token) =>
  request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
export const resendVerification = (data) =>
  request('/auth/resend-verification', { method: 'POST', body: JSON.stringify(data) })
export const requestPasswordReset = (data) =>
  request('/auth/password-reset/request', { method: 'POST', body: JSON.stringify(data) })
export const confirmPasswordReset = (data) =>
  request('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify(data) })

export const getMe = () => request('/users/me').then((payload) => payload.data)
export const updateMe = (data) =>
  request('/users/me', { method: 'PATCH', body: JSON.stringify(data) })
export const changePassword = (data) =>
  request('/users/me/password', { method: 'PUT', body: JSON.stringify(data) })

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

export const getAuditLogs = (params = {}) => {
  const query = new URLSearchParams(params)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/audit-logs${suffix}`).then(extractCollection)
}
export const getEmailJobs = () => request('/admin/jobs/email')
export const getMaintenanceJobs = () => request('/admin/jobs/maintenance')
export const triggerCourseDailyStats = () =>
  request('/admin/jobs/course-daily-stats', { method: 'POST' })

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
