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

export async function request(path, options = {}, retryOnUnauthorized = true) {
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

export function extractCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  return payload?.data ?? []
}
