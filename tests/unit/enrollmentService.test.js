import { describe, expect, it, jest } from '@jest/globals'
import { ApiError } from '../../apps/api/src/shared/http/api.js'

describe('enrollment service guards', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('rejects enrollment into unpublished courses', async () => {
    const tx = {
      course: {
        findUnique: jest.fn(async () => ({
          id: 1n,
          status: 'draft',
          capacity: 10,
          seatsTaken: 0,
        })),
      },
      enrollment: {
        findUnique: jest.fn(async () => null),
      },
    }

    jest.unstable_mockModule('../../apps/api/src/shared/database/prisma.js', () => ({
      Prisma: {
        PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
        TransactionIsolationLevel: {
          Serializable: 'Serializable',
        },
      },
      default: {
        $transaction: jest.fn(async (callback) => callback(tx)),
      },
    }))

    jest.unstable_mockModule('../../apps/api/src/modules/audit/services/audit.service.js', () => ({
      appendAuditLog: jest.fn(),
    }))

    jest.unstable_mockModule(
      '../../apps/api/src/modules/notifications/services/notification.service.js',
      () => ({
        queueEnrollmentCreatedEmail: jest.fn(),
        queueEnrollmentCancelledEmail: jest.fn(),
      }),
    )

    const { createEnrollment } =
      await import('../../apps/api/src/modules/enrollments/services/enrollment.service.js')

    await expect(
      createEnrollment({
        req: { headers: {} },
        userId: 2n,
        courseId: 1n,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Only published courses can accept enrollments.',
    })
  })

  it('rejects enrollment when published course is at capacity', async () => {
    const tx = {
      course: {
        findUnique: jest.fn(async () => ({
          id: 1n,
          status: 'published',
          capacity: 2,
          seatsTaken: 2,
        })),
      },
      enrollment: {
        findUnique: jest.fn(async () => null),
      },
    }

    jest.unstable_mockModule('../../apps/api/src/shared/database/prisma.js', () => ({
      Prisma: {
        PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
        TransactionIsolationLevel: {
          Serializable: 'Serializable',
        },
      },
      default: {
        $transaction: jest.fn(async (callback) => callback(tx)),
      },
    }))

    jest.unstable_mockModule('../../apps/api/src/modules/audit/services/audit.service.js', () => ({
      appendAuditLog: jest.fn(),
    }))

    jest.unstable_mockModule(
      '../../apps/api/src/modules/notifications/services/notification.service.js',
      () => ({
        queueEnrollmentCreatedEmail: jest.fn(),
        queueEnrollmentCancelledEmail: jest.fn(),
      }),
    )

    const { createEnrollment } =
      await import('../../apps/api/src/modules/enrollments/services/enrollment.service.js')

    await expect(
      createEnrollment({
        req: { headers: {} },
        userId: 2n,
        courseId: 1n,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Course has reached capacity.',
    })
  })

  it('increments seat count atomically and queues confirmation email on success', async () => {
    const updateMany = jest.fn(async () => ({ count: 1 }))
    const tx = {
      course: {
        findUnique: jest.fn(async () => ({
          id: 1n,
          status: 'published',
          capacity: 10,
          seatsTaken: 4,
        })),
        updateMany,
      },
      enrollment: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 99n,
            status: 'active',
            user: { id: 2n, email: 'student@academy.dev', fullName: 'Student' },
            course: {
              id: 1n,
              name: 'Node.js Foundations',
              teacher: { fullName: 'Aida Teacher' },
              courseCategory: { name: 'Backend' },
            },
          }),
        create: jest.fn(async () => ({
          id: 99n,
          userId: 2n,
          courseId: 1n,
          status: 'active',
        })),
      },
    }

    const queueEnrollmentCreatedEmail = jest.fn(async () => ({ queued: true, job_id: 'job-1' }))

    jest.unstable_mockModule('../../apps/api/src/shared/database/prisma.js', () => ({
      Prisma: {
        PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {},
        TransactionIsolationLevel: {
          Serializable: 'Serializable',
        },
      },
      default: {
        $transaction: jest.fn(async (callback, options) => {
          expect(options.isolationLevel).toBe('Serializable')
          return callback(tx)
        }),
      },
    }))

    jest.unstable_mockModule('../../apps/api/src/modules/audit/services/audit.service.js', () => ({
      appendAuditLog: jest.fn(),
    }))

    jest.unstable_mockModule(
      '../../apps/api/src/modules/notifications/services/notification.service.js',
      () => ({
        queueEnrollmentCreatedEmail,
        queueEnrollmentCancelledEmail: jest.fn(),
      }),
    )

    const { createEnrollment } =
      await import('../../apps/api/src/modules/enrollments/services/enrollment.service.js')

    const enrollment = await createEnrollment({
      req: { headers: {} },
      userId: 2n,
      courseId: 1n,
    })

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 1n,
        status: 'published',
        seatsTaken: 4,
      },
      data: {
        seatsTaken: {
          increment: 1,
        },
      },
    })
    expect(queueEnrollmentCreatedEmail).toHaveBeenCalledWith({
      user: expect.objectContaining({ email: 'student@academy.dev' }),
      enrollment: expect.objectContaining({ id: 99n }),
    })
    expect(enrollment.course.name).toBe('Node.js Foundations')
  })
})
