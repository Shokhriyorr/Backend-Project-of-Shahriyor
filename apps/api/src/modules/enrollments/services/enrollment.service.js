import prisma, { Prisma } from '../../../shared/database/prisma.js'
import { appendAuditLog } from '../../audit/services/audit.service.js'
import {
  queueEnrollmentCancelledEmail,
  queueEnrollmentCreatedEmail,
} from '../../notifications/services/notification.service.js'
import { ApiError } from '../../../shared/http/api.js'

function isRetryableTransactionError(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
}

export async function createEnrollment({ req, userId, courseId }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const enrollment = await prisma.$transaction(
        async (tx) => {
          const course = await tx.course.findUnique({
            where: { id: courseId },
            select: {
              id: true,
              status: true,
              capacity: true,
              seatsTaken: true,
            },
          })

          if (!course) {
            throw new ApiError(404, 'not_found', `Course ${courseId.toString()} was not found.`)
          }

          if (course.status !== 'published') {
            throw new ApiError(409, 'conflict', 'Only published courses can accept enrollments.', {
              course_id: courseId.toString(),
            })
          }

          const existingEnrollment = await tx.enrollment.findUnique({
            where: {
              userId_courseId: {
                userId,
                courseId,
              },
            },
          })

          if (existingEnrollment?.status === 'active') {
            throw new ApiError(409, 'conflict', 'Student is already enrolled in this course.', {
              course_id: courseId.toString(),
            })
          }

          if (course.seatsTaken >= course.capacity) {
            throw new ApiError(409, 'conflict', 'Course has reached capacity.', {
              course_id: courseId.toString(),
            })
          }

          const seatUpdate = await tx.course.updateMany({
            where: {
              id: courseId,
              status: 'published',
              seatsTaken: course.seatsTaken,
            },
            data: {
              seatsTaken: {
                increment: 1,
              },
            },
          })

          if (seatUpdate.count !== 1) {
            throw new ApiError(
              409,
              'conflict',
              'Enrollment could not be completed because seat availability changed. Please retry.',
              {
                retryable: true,
              },
            )
          }

          const nextEnrollment = existingEnrollment
            ? await tx.enrollment.update({
                where: {
                  userId_courseId: {
                    userId,
                    courseId,
                  },
                },
                data: {
                  status: 'active',
                  cancelledAt: null,
                  enrolledAt: new Date(),
                },
              })
            : await tx.enrollment.create({
                data: {
                  userId,
                  courseId,
                  status: 'active',
                },
              })

          await appendAuditLog(tx, {
            req,
            actorUserId: userId,
            entityType: 'enrollment',
            entityId: nextEnrollment.id,
            action: 'enroll',
            after: nextEnrollment,
          })

          return tx.enrollment.findUnique({
            where: {
              id: nextEnrollment.id,
            },
            include: {
              user: true,
              course: {
                include: {
                  teacher: true,
                  courseCategory: true,
                },
              },
            },
          })
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )

      await queueEnrollmentCreatedEmail({
        user: enrollment.user,
        enrollment,
      })

      return enrollment
    } catch (error) {
      if (error instanceof ApiError && error.details?.retryable && attempt < 2) {
        continue
      }

      if (isRetryableTransactionError(error) && attempt < 2) {
        continue
      }

      throw error
    }
  }

  throw new ApiError(409, 'conflict', 'Enrollment could not be completed after multiple retries.')
}

export async function cancelEnrollment({ req, userId, courseId }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const enrollment = await prisma.$transaction(
        async (tx) => {
          const enrollment = await tx.enrollment.findUnique({
            where: {
              userId_courseId: {
                userId,
                courseId,
              },
            },
            include: {
              course: {
                include: {
                  teacher: true,
                  courseCategory: true,
                },
              },
              user: true,
            },
          })

          if (!enrollment || enrollment.status !== 'active') {
            throw new ApiError(404, 'not_found', 'Active enrollment was not found.', {
              course_id: courseId.toString(),
            })
          }

          const updatedEnrollment = await tx.enrollment.update({
            where: {
              id: enrollment.id,
            },
            data: {
              status: 'cancelled',
              cancelledAt: new Date(),
            },
          })

          const seatUpdate = await tx.course.updateMany({
            where: {
              id: courseId,
              seatsTaken: {
                gt: 0,
              },
            },
            data: {
              seatsTaken: {
                decrement: 1,
              },
            },
          })

          if (seatUpdate.count !== 1) {
            throw new ApiError(409, 'conflict', 'Enrollment could not be cancelled safely.', {
              retryable: true,
            })
          }

          await appendAuditLog(tx, {
            req,
            actorUserId: userId,
            entityType: 'enrollment',
            entityId: updatedEnrollment.id,
            action: 'unenroll',
            before: enrollment,
            after: updatedEnrollment,
          })

          return tx.enrollment.findUnique({
            where: {
              id: updatedEnrollment.id,
            },
            include: {
              user: true,
              course: {
                include: {
                  teacher: true,
                  courseCategory: true,
                },
              },
            },
          })
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )

      await queueEnrollmentCancelledEmail({
        user: enrollment.user,
        enrollment,
      })

      return
    } catch (error) {
      if (error instanceof ApiError && error.details?.retryable && attempt < 2) {
        continue
      }

      if (isRetryableTransactionError(error) && attempt < 2) {
        continue
      }

      throw error
    }
  }

  throw new ApiError(
    409,
    'conflict',
    'Enrollment cancellation could not be completed after multiple retries.',
  )
}
