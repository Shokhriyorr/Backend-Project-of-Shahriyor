import { extractCollection, request } from '@/shared/api/httpClient.js'

export const getAuditLogs = (params = {}) => {
  const query = new URLSearchParams(params)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/audit-logs${suffix}`).then(extractCollection)
}

export const getEmailJobs = () => request('/admin/jobs/email')

export const getMaintenanceJobs = () => request('/admin/jobs/maintenance')

export const triggerCourseDailyStats = () =>
  request('/admin/jobs/course-daily-stats', { method: 'POST' })
