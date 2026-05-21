import { env } from '../../../config/env.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function userName(user) {
  return user.displayName || user.email
}

export function buildVerificationEmail({ user, token }) {
  const verificationUrl = `${env.PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}`
  const name = escapeHtml(userName(user))

  return {
    to: user.email,
    subject: 'Verify your Academy Portal email',
    text: [
      `Hello ${userName(user)},`,
      '',
      'Verify your Academy Portal account by opening this link:',
      verificationUrl,
      '',
      `This link expires in ${env.EMAIL_VERIFICATION_TTL_MINUTES} minutes.`,
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      '<p>Verify your Academy Portal account by opening this link:</p>',
      `<p><a href="${verificationUrl}">Verify email</a></p>`,
      `<p>This link expires in ${env.EMAIL_VERIFICATION_TTL_MINUTES} minutes.</p>`,
    ].join(''),
    metadata: {
      event: 'auth.email_verification',
      user_id: user.id.toString(),
    },
  }
}

export function buildPasswordResetEmail({ user, token }) {
  const resetUrl = `${env.PUBLIC_APP_URL}/password-reset?token=${encodeURIComponent(token)}`
  const name = escapeHtml(userName(user))

  return {
    to: user.email,
    subject: 'Reset your Academy Portal password',
    text: [
      `Hello ${userName(user)},`,
      '',
      'Use this password reset token in Postman or open the reset link:',
      token,
      resetUrl,
      '',
      `This token expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes.`,
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      '<p>Use this password reset token in Postman or open the reset link:</p>',
      `<p><code>${escapeHtml(token)}</code></p>`,
      `<p><a href="${resetUrl}">Reset password</a></p>`,
      `<p>This token expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes.</p>`,
    ].join(''),
    metadata: {
      event: 'auth.password_reset',
      user_id: user.id.toString(),
    },
  }
}

export function buildEnrollmentConfirmationEmail({ user, enrollment }) {
  const course = enrollment.course
  const name = escapeHtml(userName(user))
  const courseName = escapeHtml(course.name)

  return {
    to: user.email,
    subject: `Enrollment confirmed: ${course.name}`,
    text: [
      `Hello ${userName(user)},`,
      '',
      `You are enrolled in ${course.name}.`,
      `Course level: ${course.level}`,
      `Enrollment id: ${enrollment.id.toString()}`,
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      `<p>You are enrolled in <strong>${courseName}</strong>.</p>`,
      `<p>Course level: ${escapeHtml(course.level)}</p>`,
      `<p>Enrollment id: ${enrollment.id.toString()}</p>`,
    ].join(''),
    metadata: {
      event: 'business.enrollment_created',
      user_id: user.id.toString(),
      course_id: course.id.toString(),
      enrollment_id: enrollment.id.toString(),
    },
  }
}

export function buildEnrollmentCancelledEmail({ user, enrollment }) {
  const course = enrollment.course
  const name = escapeHtml(userName(user))
  const courseName = escapeHtml(course.name)

  return {
    to: user.email,
    subject: `Enrollment cancelled: ${course.name}`,
    text: [
      `Hello ${userName(user)},`,
      '',
      `Your enrollment in ${course.name} was cancelled.`,
      `Enrollment id: ${enrollment.id.toString()}`,
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      `<p>Your enrollment in <strong>${courseName}</strong> was cancelled.</p>`,
      `<p>Enrollment id: ${enrollment.id.toString()}</p>`,
    ].join(''),
    metadata: {
      event: 'business.enrollment_cancelled',
      user_id: user.id.toString(),
      course_id: course.id.toString(),
      enrollment_id: enrollment.id.toString(),
    },
  }
}

export function buildCoursePublishedEmail({ to, course }) {
  const courseName = escapeHtml(course.name)

  return {
    to,
    subject: `Course published: ${course.name}`,
    text: [
      `Course published: ${course.name}`,
      `Slug: ${course.slug}`,
      `Capacity: ${course.capacity}`,
      `Published at: ${course.publishedAt?.toISOString() ?? new Date().toISOString()}`,
    ].join('\n'),
    html: [
      `<p>Course published: <strong>${courseName}</strong></p>`,
      `<p>Slug: ${escapeHtml(course.slug)}</p>`,
      `<p>Capacity: ${course.capacity}</p>`,
      `<p>Published at: ${course.publishedAt?.toISOString() ?? new Date().toISOString()}</p>`,
    ].join(''),
    metadata: {
      event: 'business.course_published',
      course_id: course.id.toString(),
    },
  }
}

export function buildAccountUpdatedEmail({ user, changedFields }) {
  const name = escapeHtml(userName(user))
  const fields = changedFields.length ? changedFields.join(', ') : 'account profile'

  return {
    to: user.email,
    subject: 'Your Academy Portal account was updated',
    text: [
      `Hello ${userName(user)},`,
      '',
      `Your Academy Portal account was updated. Changed fields: ${fields}.`,
      '',
      'If you did not make this change, reset your password and contact support.',
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      `<p>Your Academy Portal account was updated. Changed fields: <strong>${escapeHtml(fields)}</strong>.</p>`,
      '<p>If you did not make this change, reset your password and contact support.</p>',
    ].join(''),
    metadata: {
      event: 'account.profile_updated',
      user_id: user.id.toString(),
      changed_fields: changedFields,
    },
  }
}

export function buildPasswordChangedEmail({ user }) {
  const name = escapeHtml(userName(user))

  return {
    to: user.email,
    subject: 'Your Academy Portal password was changed',
    text: [
      `Hello ${userName(user)},`,
      '',
      'Your Academy Portal password was changed.',
      '',
      'If you did not make this change, request a password reset immediately.',
    ].join('\n'),
    html: [
      `<p>Hello ${name},</p>`,
      '<p>Your Academy Portal password was changed.</p>',
      '<p>If you did not make this change, request a password reset immediately.</p>',
    ].join(''),
    metadata: {
      event: 'account.password_changed',
      user_id: user.id.toString(),
    },
  }
}
