import { Router } from 'express'
import prisma from '../prisma.js'
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { appendAuditLog } from '../services/auditService.js'
import { ApiError, asyncHandler, mutationSuccess, parseId } from '../utils/api.js'
import {
  buildCreatedAtCursorFilter,
  buildStringCursorFilter,
  makeCreatedAtCursor,
  makeStringCursor,
  pageResponse,
  parseLimit,
} from '../utils/pagination.js'
import { serializeTeacher } from '../utils/serializers.js'
import { teacherBodySchema } from '../validation/schemas.js'

const router = Router()

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit)
    const search = String(req.query.q ?? '').trim()
    const subject = String(req.query.subject ?? '').trim()
    const sort = String(req.query.sort ?? 'name')
    const baseWhere = {}

    if (req.user?.role !== 'admin') {
      baseWhere.isActive = true
    }

    if (subject) {
      baseWhere.subject = {
        contains: subject,
        mode: 'insensitive',
      }
    }

    let orderBy
    let cursorFilter
    let makeCursor

    if (sort === 'name') {
      orderBy = [{ fullName: 'asc' }, { id: 'asc' }]
      cursorFilter = buildStringCursorFilter(req.query.cursor, 'fullName')
      makeCursor = (record) => makeStringCursor(record, 'fullName')
    } else if (sort === 'created_at') {
      orderBy = [{ createdAt: 'asc' }, { id: 'asc' }]
      cursorFilter = buildCreatedAtCursorFilter(req.query.cursor, 'asc')
      makeCursor = makeCreatedAtCursor
    } else if (sort === '-created_at') {
      orderBy = [{ createdAt: 'desc' }, { id: 'desc' }]
      cursorFilter = buildCreatedAtCursorFilter(req.query.cursor, 'desc')
      makeCursor = makeCreatedAtCursor
    } else {
      throw new ApiError(400, 'bad_request', 'Unsupported sort value.', {
        sort: 'expected one of name, created_at, -created_at',
      })
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        AND: [
          baseWhere,
          search
            ? {
                OR: [
                  {
                    fullName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    subject: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {},
          cursorFilter,
        ],
      },
      orderBy,
      take: limit + 1,
    })

    return res.json(pageResponse(teachers, limit, serializeTeacher, makeCursor))
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validateBody(teacherBodySchema),
  asyncHandler(async (req, res) => {
    const teacher = await prisma.$transaction(async (tx) => {
      const created = await tx.teacher.create({
        data: {
          fullName: (req.body.full_name ?? req.body.name).trim(),
          subject: req.body.subject.trim(),
          rating: req.body.rating,
          bio: req.body.bio?.trim() || null,
          isActive: req.body.is_active ?? req.body.isActive ?? true,
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: req.user.id,
        entityType: 'teacher',
        entityId: created.id,
        action: 'create',
        after: created,
      })

      return created
    })

    return res.status(201).json(serializeTeacher(teacher))
  }),
)

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validateBody(teacherBodySchema),
  asyncHandler(async (req, res) => {
    const teacherId = parseId(req.params.id, 'teacherId')
    const teacher = await prisma.$transaction(async (tx) => {
      const before = await tx.teacher.findUnique({
        where: { id: teacherId },
      })

      if (!before) {
        throw new ApiError(404, 'not_found', `Teacher ${req.params.id} was not found.`)
      }

      const updated = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          fullName: (req.body.full_name ?? req.body.name).trim(),
          subject: req.body.subject.trim(),
          rating: req.body.rating,
          bio: req.body.bio?.trim() || null,
          isActive: req.body.is_active ?? req.body.isActive ?? true,
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: req.user.id,
        entityType: 'teacher',
        entityId: updated.id,
        action: 'update',
        before,
        after: updated,
      })

      return updated
    })

    return res.json(serializeTeacher(teacher))
  }),
)

// BYOI-4: Referential integrity — block deletes while active course references exist.
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const teacherId = parseId(req.params.id, 'teacherId')
    const activeReference = await prisma.course.findFirst({
      where: {
        teacherId,
        status: {
          not: 'archived',
        },
      },
    })

    if (activeReference) {
      throw new ApiError(
        409,
        'conflict',
        'Cannot delete teacher while non-archived courses still reference it.',
      )
    }

    try {
      await prisma.$transaction(async (tx) => {
        const before = await tx.teacher.findUnique({
          where: { id: teacherId },
        })

        if (!before) {
          throw new ApiError(404, 'not_found', `Teacher ${req.params.id} was not found.`)
        }

        await tx.teacher.delete({
          where: { id: teacherId },
        })

        await appendAuditLog(tx, {
          req,
          actorUserId: req.user.id,
          entityType: 'teacher',
          entityId: teacherId,
          action: 'delete',
          before,
        })
      })
    } catch (error) {
      if (error.code === 'P2003') {
        throw new ApiError(
          409,
          'conflict',
          'Cannot delete teacher while courses still reference it.',
        )
      }
      throw error
    }

    return res.json(mutationSuccess('Teacher deleted successfully.'))
  }),
)

export default router
