import { Router } from 'express'
import prisma from '../../../shared/database/prisma.js'
import { optionalAuth, requireAuth, requireRole } from '../../../shared/middleware/auth.js'
import { validateBody } from '../../../shared/middleware/validate.js'
import { appendAuditLog } from '../../audit/services/audit.service.js'
import { ApiError, asyncHandler, mutationSuccess, parseId } from '../../../shared/http/api.js'
import {
  buildCreatedAtCursorFilter,
  buildStringCursorFilter,
  makeCreatedAtCursor,
  makeStringCursor,
  pageResponse,
  parseLimit,
} from '../../../shared/utils/pagination.js'
import { serializeCategory } from '../../../shared/utils/serializers.js'
import { slugify } from '../../../shared/utils/slug.js'
import { categoryBodySchema } from '../../../shared/validation/schemas.js'

const router = Router()

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit)
    const search = String(req.query.q ?? '').trim()
    const sort = String(req.query.sort ?? 'name')
    const baseWhere = {}

    if (req.user?.role !== 'admin') {
      baseWhere.isActive = true
    }

    let orderBy
    let cursorFilter
    let makeCursor

    if (sort === 'name') {
      orderBy = [{ name: 'asc' }, { id: 'asc' }]
      cursorFilter = buildStringCursorFilter(req.query.cursor, 'name')
      makeCursor = (record) => makeStringCursor(record, 'name')
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

    const categories = await prisma.courseCategory.findMany({
      where: {
        AND: [
          baseWhere,
          search
            ? {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              }
            : {},
          cursorFilter,
        ],
      },
      orderBy,
      take: limit + 1,
    })

    return res.json(pageResponse(categories, limit, serializeCategory, makeCursor))
  }),
)

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validateBody(categoryBodySchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.courseCategory.create({
        data: {
          slug: req.body.slug?.trim() || slugify(req.body.name),
          name: req.body.name.trim(),
          description: req.body.description?.trim() || null,
          isActive: req.body.is_active ?? req.body.isActive ?? true,
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: req.user.id,
        entityType: 'category',
        entityId: created.id,
        action: 'create',
        after: created,
      })

      return created
    })

    return res.status(201).json(serializeCategory(category))
  }),
)

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validateBody(categoryBodySchema),
  asyncHandler(async (req, res) => {
    const categoryId = parseId(req.params.id, 'categoryId')
    const category = await prisma.$transaction(async (tx) => {
      const before = await tx.courseCategory.findUnique({
        where: { id: categoryId },
      })

      if (!before) {
        throw new ApiError(404, 'not_found', `Category ${req.params.id} was not found.`)
      }

      const updated = await tx.courseCategory.update({
        where: { id: categoryId },
        data: {
          slug: req.body.slug?.trim() || slugify(req.body.name),
          name: req.body.name.trim(),
          description: req.body.description?.trim() || null,
          isActive: req.body.is_active ?? req.body.isActive ?? true,
        },
      })

      await appendAuditLog(tx, {
        req,
        actorUserId: req.user.id,
        entityType: 'category',
        entityId: updated.id,
        action: 'update',
        before,
        after: updated,
      })

      return updated
    })

    return res.json(serializeCategory(category))
  }),
)

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const categoryId = parseId(req.params.id, 'categoryId')
    const activeReference = await prisma.course.findFirst({
      where: {
        categoryId,
        status: {
          not: 'archived',
        },
      },
    })

    if (activeReference) {
      throw new ApiError(
        409,
        'conflict',
        'Cannot delete category while non-archived courses still reference it.',
      )
    }

    try {
      await prisma.$transaction(async (tx) => {
        const before = await tx.courseCategory.findUnique({
          where: { id: categoryId },
        })

        if (!before) {
          throw new ApiError(404, 'not_found', `Category ${req.params.id} was not found.`)
        }

        await tx.courseCategory.delete({
          where: { id: categoryId },
        })

        await appendAuditLog(tx, {
          req,
          actorUserId: req.user.id,
          entityType: 'category',
          entityId: categoryId,
          action: 'delete',
          before,
        })
      })
    } catch (error) {
      if (error.code === 'P2003') {
        throw new ApiError(
          409,
          'conflict',
          'Cannot delete category while courses still reference it.',
        )
      }
      throw error
    }

    return res.json(mutationSuccess('Category deleted successfully.'))
  }),
)

export default router
