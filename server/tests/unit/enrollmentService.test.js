import { describe, expect, it, jest } from '@jest/globals'
import { ApiError } from '../../src/utils/api.js'

describe('enrollment service guards', () => {
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

    jest.unstable_mockModule('../../src/prisma.js', () => ({
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

    jest.unstable_mockModule('../../src/services/auditService.js', () => ({
      appendAuditLog: jest.fn(),
    }))

    jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
      queueEnrollmentCreatedEmail: jest.fn(),
      queueEnrollmentCancelledEmail: jest.fn(),
    }))

    const { createEnrollment } = await import('../../src/services/enrollmentService.js')

    await expect(createEnrollment({
      req: { headers: {} },
      userId: 2n,
      courseId: 1n,
    })).rejects.toMatchObject({
      status: 409,
      message: 'Only published courses can accept enrollments.',
    })
  })
})
