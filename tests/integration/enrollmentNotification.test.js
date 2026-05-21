import { jest } from '@jest/globals'

describe('enrollment notification integration', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('queues enrollment confirmation email through BullMQ enqueue', async () => {
    const enqueueEmail = jest.fn(async () => ({ queued: true, job_id: 'job-42' }))

    jest.unstable_mockModule('../../apps/api/src/modules/notifications/queues/email.queue.js', () => ({
      enqueueEmail,
    }))

    const { queueEnrollmentCreatedEmail } =
      await import('../../apps/api/src/modules/notifications/services/notification.service.js')

    const user = {
      id: 2n,
      email: 'student@academy.dev',
      fullName: 'Demo Student',
    }
    const enrollment = {
      id: 99n,
      course: {
        id: 3n,
        name: 'Node.js Foundations',
        level: 'beginner',
      },
    }

    const result = await queueEnrollmentCreatedEmail({ user, enrollment })

    expect(enqueueEmail).toHaveBeenCalledTimes(1)
    expect(enqueueEmail.mock.calls[0][0]).toMatchObject({
      to: 'student@academy.dev',
      subject: expect.stringContaining('Node.js Foundations'),
      metadata: {
        event: 'business.enrollment_created',
      },
    })
    expect(result).toEqual({ queued: true, job_id: 'job-42' })
  })

  test('queues enrollment cancellation email through BullMQ enqueue', async () => {
    const enqueueEmail = jest.fn(async () => ({ queued: true, job_id: 'job-43' }))

    jest.unstable_mockModule('../../apps/api/src/modules/notifications/queues/email.queue.js', () => ({
      enqueueEmail,
    }))

    const { queueEnrollmentCancelledEmail } =
      await import('../../apps/api/src/modules/notifications/services/notification.service.js')

    const user = {
      id: 2n,
      email: 'student@academy.dev',
      fullName: 'Demo Student',
    }
    const enrollment = {
      id: 99n,
      course: {
        id: 3n,
        name: 'Node.js Foundations',
        level: 'beginner',
      },
    }

    await queueEnrollmentCancelledEmail({ user, enrollment })

    expect(enqueueEmail).toHaveBeenCalledTimes(1)
    expect(enqueueEmail.mock.calls[0][0].metadata.event).toBe('business.enrollment_cancelled')
  })
})
