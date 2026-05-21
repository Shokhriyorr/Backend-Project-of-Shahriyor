import { env } from '../config/env.js'
import { enqueueEmail } from '../queues/emailQueue.js'
import {
  buildAccountUpdatedEmail,
  buildCoursePublishedEmail,
  buildEnrollmentCancelledEmail,
  buildEnrollmentConfirmationEmail,
  buildPasswordChangedEmail,
} from './emailTemplates.js'

async function enqueueBestEffort(message) {
  try {
    return await enqueueEmail(message)
  } catch (error) {
    console.error('Failed to enqueue email notification:', error)
    return {
      queued: false,
      error: error.message,
    }
  }
}

export async function queueEnrollmentCreatedEmail({ user, enrollment }) {
  return enqueueBestEffort(buildEnrollmentConfirmationEmail({ user, enrollment }))
}

export async function queueEnrollmentCancelledEmail({ user, enrollment }) {
  return enqueueBestEffort(buildEnrollmentCancelledEmail({ user, enrollment }))
}

export async function queueCoursePublishedEmail({ course, actorEmail }) {
  const recipients = new Set([actorEmail, ...env.ADMIN_NOTIFICATION_EMAILS].filter(Boolean))

  return Promise.all(
    [...recipients].map((to) => enqueueBestEffort(buildCoursePublishedEmail({ to, course }))),
  )
}

export async function queueAccountUpdatedEmail({ user, changedFields }) {
  return enqueueBestEffort(buildAccountUpdatedEmail({ user, changedFields }))
}

export async function queuePasswordChangedEmail({ user }) {
  return enqueueBestEffort(buildPasswordChangedEmail({ user }))
}
