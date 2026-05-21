import { request } from '@/shared/api/httpClient.js'

export const getMe = () => request('/users/me').then((payload) => payload.data)

export const updateMe = (data) =>
  request('/users/me', { method: 'PATCH', body: JSON.stringify(data) })

export const changePassword = (data) =>
  request('/users/me/password', { method: 'PUT', body: JSON.stringify(data) })
