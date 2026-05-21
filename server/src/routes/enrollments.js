import { Router } from 'express'
import prisma from '../prisma.js'
import { requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { cancelEnrollment, createEnrollment } from '../services/enrollmentService.js'
import { ApiError, asyncHandler, mutationSuccess, parseId } from '../utils/api.js'
import {
  buildCreatedAtCursorFilter,
  makeCreatedAtCursor,
  pageResponse,
  parseLimit,
} from '../utils/pagination.js'
import { serializeEnrollment } from '../utils/serializers.js'
import { enrollmentBodySchema } from '../validation/schemas.js'

const router = Router()

router.use(requireRole('student'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = BigInt(req.user.id)

    const limit = parseLimit(req.query.limit)
    const sort = String(req.query.sort ?? '-enrolled_at')
    const baseWhere = {
      userId,
    }

    if (req.query.status) {
      const allowedStatuses = new Set(['active', 'cancelled'])
      if (!allowedStatuses.has(String(req.query.status))) {
        throw new ApiError(400, 'bad_request', 'Unsupported status filter.', {
          status: 'expected active or cancelled',
        })
      }
      baseWhere.status = String(req.query.status)
    }

    let direction
    if (sort === '-enrolled_at') {
      direction = 'desc'
    } else if (sort === 'enrolled_at') {
      direction = 'asc'
    } else {
      throw new ApiError(400, 'bad_request', 'Unsupported sort value.', {
        sort: 'expected one of -enrolled_at or enrolled_at',
      })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        AND: [baseWhere, buildCreatedAtCursorFilter(req.query.cursor, direction, 'enrolledAt')],
      },
      orderBy: [{ enrolledAt: direction }, { id: direction }],
      include: {
        course: {
          include: {
            teacher: true,
            courseCategory: true,
          },
        },
      },
      take: limit + 1,
    })

    return res.json(
      pageResponse(enrollments, limit, serializeEnrollment, (record) =>
        makeCreatedAtCursor(record, 'enrolledAt'),
      ),
    )
  }),
)

router.post(
  '/',
  validateBody(enrollmentBodySchema),
  asyncHandler(async (req, res) => {
    const courseId = parseId(req.body.course_id ?? req.body.courseId, 'course_id')
    const enrollment = await createEnrollment({
      req,
      userId: BigInt(req.user.id),
      courseId,
    })

    return res.status(201).json(serializeEnrollment(enrollment))
  }),
)

router.delete(
  '/:courseId',
  asyncHandler(async (req, res) => {
    await cancelEnrollment({
      req,
      userId: BigInt(req.user.id),
      courseId: parseId(req.params.courseId, 'courseId'),
    })

    return res.json(mutationSuccess('Enrollment cancelled successfully.'))
  }),
)

export default router
