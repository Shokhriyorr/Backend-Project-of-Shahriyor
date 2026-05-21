import { Router } from 'express'
import prisma from '../prisma.js'
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { appendAuditLog } from '../services/auditService.js'
import { resolveCourseAuditAction, validatePublicationPayload } from '../services/coursePolicy.js'
import { queueCoursePublishedEmail } from '../services/notificationService.js'
import { ApiError, asyncHandler, mutationSuccess, parseId } from '../utils/api.js'
import { buildCreatedAtCursorFilter, makeCreatedAtCursor, pageResponse, parseLimit } from '../utils/pagination.js'
import { serializeCourse } from '../utils/serializers.js'
import { slugify } from '../utils/slug.js'
import { courseBodySchema } from '../validation/schemas.js'

const router = Router()

function normalizeCourseInput(body) {
  return {
    slug: body.slug?.trim() || slugify(body.name),
    name: body.name.trim(),
    shortDescription: (body.short_description ?? body.shortDescription ?? body.description).trim().slice(0, 255),
    description: body.description.trim(),
    categoryId: parseId(body.category_id ?? body.categoryId, 'category_id'),
    teacherId: parseId(body.teacher_id ?? body.teacherId, 'teacher_id'),
    lessons: Number(body.lessons),
    level: body.level,
    status: body.status ?? 'draft',
    capacity: Number(body.capacity ?? 100),
  }
}

async function ensureRelationsExist(courseData) {
  const [teacher, category] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: courseData.teacherId } }),
    prisma.courseCategory.findUnique({ where: { id: courseData.categoryId } }),
  ])

  if (!teacher) {
    throw new ApiError(404, 'not_found', `Teacher ${courseData.teacherId.toString()} was not found.`)
  }

  if (!category) {
    throw new ApiError(404, 'not_found', `Category ${courseData.categoryId.toString()} was not found.`)
  }
}

// BYOI-3: Catalog search, filters, and cursor pagination for scalable reads.
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit)
  const search = String(req.query.q ?? '').trim()
  const sort = String(req.query.sort ?? '-created_at')
  const baseWhere = {}

  if (req.user?.role === 'admin' && req.query.status) {
    const allowedStatuses = new Set(['draft', 'published', 'archived'])
    if (!allowedStatuses.has(String(req.query.status))) {
      throw new ApiError(400, 'bad_request', 'Unsupported status filter.', {
        status: 'expected draft, published, or archived',
      })
    }
    baseWhere.status = String(req.query.status)
  } else if (req.user?.role !== 'admin') {
    baseWhere.status = 'published'
  }

  if (req.query.category_id) {
    baseWhere.categoryId = parseId(req.query.category_id, 'category_id')
  }

  if (req.query.teacher_id) {
    baseWhere.teacherId = parseId(req.query.teacher_id, 'teacher_id')
  }

  if (req.query.level) {
    const allowedLevels = new Set(['beginner', 'intermediate', 'advanced'])
    if (!allowedLevels.has(String(req.query.level))) {
      throw new ApiError(400, 'bad_request', 'Unsupported level filter.', {
        level: 'expected beginner, intermediate, or advanced',
      })
    }
    baseWhere.level = String(req.query.level)
  }

  let direction
  if (sort === '-created_at') {
    direction = 'desc'
  } else if (sort === 'created_at') {
    direction = 'asc'
  } else {
    throw new ApiError(400, 'bad_request', 'Unsupported sort value.', {
      sort: 'expected one of -created_at or created_at',
    })
  }

  const courses = await prisma.course.findMany({
    where: {
      AND: [
        baseWhere,
        search ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              shortDescription: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              teacher: {
                is: {
                  fullName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              courseCategory: {
                is: {
                  name: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        } : {},
        buildCreatedAtCursorFilter(req.query.cursor, direction),
      ],
    },
    orderBy: [
      { createdAt: direction },
      { id: direction },
    ],
    include: {
      teacher: true,
      courseCategory: true,
      _count: {
        select: {
          enrollments: {
            where: {
              status: 'active',
            },
          },
        },
      },
    },
    take: limit + 1,
  })

  return res.json(pageResponse(courses, limit, serializeCourse, makeCreatedAtCursor))
}))

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const courseId = parseId(req.params.id, 'courseId')
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: true,
      courseCategory: true,
      _count: {
        select: {
          enrollments: {
            where: {
              status: 'active',
            },
          },
        },
      },
    },
  })

  if (!course || (req.user?.role !== 'admin' && course.status !== 'published')) {
    throw new ApiError(404, 'not_found', `Course ${req.params.id} was not found.`)
  }

  return res.json(serializeCourse(course))
}))

router.post('/', requireAuth, requireRole('admin'), validateBody(courseBodySchema), asyncHandler(async (req, res) => {
  const courseData = normalizeCourseInput(req.body)
  if (courseData.status === 'published') {
    validatePublicationPayload(courseData)
  }

  if (courseData.status === 'archived') {
    throw new ApiError(422, 'unprocessable_entity', 'New courses cannot start in archived state.')
  }

  await ensureRelationsExist(courseData)

  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        ...courseData,
        publishedAt: courseData.status === 'published' ? new Date() : null,
      },
      include: {
        teacher: true,
        courseCategory: true,
        _count: {
          select: {
            enrollments: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
    })

    await appendAuditLog(tx, {
      req,
      actorUserId: req.user.id,
      entityType: 'course',
      entityId: created.id,
      action: courseData.status === 'published' ? 'publish' : 'create',
      after: created,
    })

    return created
  })

  if (courseData.status === 'published') {
    await queueCoursePublishedEmail({
      course,
      actorEmail: req.user.email,
    })
  }

  return res.status(201).json(serializeCourse(course))
}))

router.put('/:id', requireAuth, requireRole('admin'), validateBody(courseBodySchema), asyncHandler(async (req, res) => {
  const courseId = parseId(req.params.id, 'courseId')
  const courseData = normalizeCourseInput(req.body)
  const existingCourse = await prisma.course.findUnique({
    where: { id: courseId },
  })

  if (!existingCourse) {
    throw new ApiError(404, 'not_found', `Course ${req.params.id} was not found.`)
  }

  if (existingCourse.status === 'archived' && courseData.status === 'published') {
    throw new ApiError(422, 'unprocessable_entity', 'Archived courses cannot be republished.')
  }

  if (existingCourse.status === 'published' && courseData.status === 'draft') {
    throw new ApiError(422, 'unprocessable_entity', 'Published courses cannot move back to draft.')
  }

  if (courseData.status === 'published') {
    validatePublicationPayload(courseData)
  }

  await ensureRelationsExist(courseData)
  const becamePublished = existingCourse.status !== 'published' && courseData.status === 'published'

  const course = await prisma.$transaction(async (tx) => {
    const before = await tx.course.findUnique({
      where: { id: courseId },
    })

    const updated = await tx.course.update({
      where: { id: courseId },
      data: {
        ...courseData,
        publishedAt: courseData.status === 'published'
          ? before.publishedAt ?? new Date()
          : before.publishedAt,
        archivedAt: courseData.status === 'archived'
          ? before.archivedAt ?? new Date()
          : null,
      },
      include: {
        teacher: true,
        courseCategory: true,
        _count: {
          select: {
            enrollments: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
    })

    await appendAuditLog(tx, {
      req,
      actorUserId: req.user.id,
      entityType: 'course',
      entityId: updated.id,
      action: resolveCourseAuditAction(before.status, courseData.status),
      before,
      after: updated,
    })

    return updated
  })

  if (becamePublished) {
    await queueCoursePublishedEmail({
      course,
      actorEmail: req.user.email,
    })
  }

  return res.json(serializeCourse(course))
}))

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const courseId = parseId(req.params.id, 'courseId')

  await prisma.$transaction(async (tx) => {
    const before = await tx.course.findUnique({
      where: { id: courseId },
    })

    if (!before) {
      throw new ApiError(404, 'not_found', `Course ${req.params.id} was not found.`)
    }

    if (before.status !== 'archived') {
      await tx.course.update({
        where: { id: courseId },
        data: {
          status: 'archived',
          archivedAt: before.archivedAt ?? new Date(),
        },
      })
    }

    await appendAuditLog(tx, {
      req,
      actorUserId: req.user.id,
      entityType: 'course',
      entityId: courseId,
      action: 'archive',
      before,
      after: {
        ...before,
        status: 'archived',
        archivedAt: before.archivedAt ?? new Date(),
      },
    })
  })

  return res.json(mutationSuccess('Course archived successfully.'))
}))

export default router
