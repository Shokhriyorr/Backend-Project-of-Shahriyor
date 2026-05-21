import { clearStoredSession, persistSession, request } from '@/shared/api/httpClient.js'

export const register = (data) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(data) })

export const login = async (data) => {
  const payload = await request('/auth/login', { method: 'POST', body: JSON.stringify(data) })
  persistSession(payload)
  return payload
}

export const logout = async () => {
  const refreshToken = localStorage.getItem('academy_refresh_token')
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
