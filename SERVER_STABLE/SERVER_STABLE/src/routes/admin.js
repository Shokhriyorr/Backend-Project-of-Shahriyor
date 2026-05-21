import { Router } from 'express'
import prisma from '../prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { syncCourseDailyStats } from '../jobs/courseDailyStats.js'
import { getEmailQueueSnapshot } from '../queues/emailQueue.js'
import { enqueueCourseDailyStatsJob, getMaintenanceQueueSnapshot } from '../queues/maintenanceQueue.js'
import { ApiError, asyncHandler, mutationSuccess, parseId } from '../utils/api.js'
import { buildCreatedAtCursorFilter, makeCreatedAtCursor, pageResponse, parseLimit } from '../utils/pagination.js'
import { serializeAuditLog, serializeCourseDailyStat } from '../utils/serializers.js'
import { env } from '../config/env.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit)
  const where = {}

  if (req.query.entity_type) {
    const allowedEntityTypes = new Set(['user', 'teacher', 'category', 'course', 'enrollment', 'session'])
    if (!allowedEntityTypes.has(String(req.query.entity_type))) {
      throw new ApiError(400, 'bad_request', 'Unsupported entity_type filter.')
    }
    where.entityType = String(req.query.entity_type)
  }

  if (req.query.action) {
    const allowedActions = new Set([
      'create',
      'update',
      'delete',
      'publish',
      'archive',
      'enroll',
      'unenroll',
      'login',
      'verify_email',
      'request_password_reset',
      'reset_password',
    ])

    if (!allowedActions.has(String(req.query.action))) {
      throw new ApiError(400, 'bad_request', 'Unsupported action filter.')
    }
    where.action = String(req.query.action)
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      AND: [
        where,
        buildCreatedAtCursorFilter(req.query.cursor, 'desc'),
      ],
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    include: {
      actor: true,
    },
    take: limit + 1,
  })

  return res.json(pageResponse(auditLogs, limit, serializeAuditLog, makeCreatedAtCursor))
}))

router.get('/course-daily-stats', asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit)
  const where = {}

  if (req.query.course_id) {
    where.courseId = parseId(req.query.course_id, 'course_id')
  }

  if (req.query.metric_date) {
    const rawMetricDate = String(req.query.metric_date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawMetricDate)) {
      throw new ApiError(400, 'bad_request', 'metric_date must use YYYY-MM-DD format.')
    }
    where.metricDate = new Date(`${rawMetricDate}T00:00:00.000Z`)
  }

  const stats = await prisma.courseDailyStat.findMany({
    where: {
      AND: [
        where,
        buildCreatedAtCursorFilter(req.query.cursor, 'desc'),
      ],
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    include: {
      course: true,
    },
    take: limit + 1,
  })

  return res.json(pageResponse(stats, limit, serializeCourseDailyStat, makeCreatedAtCursor))
}))

router.get('/jobs/email', asyncHandler(async (_req, res) => {
  return res.json(await getEmailQueueSnapshot())
}))

router.get('/jobs/maintenance', asyncHandler(async (_req, res) => {
  return res.json(await getMaintenanceQueueSnapshot())
}))

router.post('/jobs/course-daily-stats', asyncHandler(async (_req, res) => {
  if (env.ENABLE_BACKGROUND_WORKERS) {
    return res.status(202).json(await enqueueCourseDailyStatsJob())
  }

  await syncCourseDailyStats()
  return res.json(mutationSuccess('Course daily stats synced synchronously because background workers are disabled.'))
}))

export default router
