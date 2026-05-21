import {
  buildAccountUpdatedEmail,
  buildCoursePublishedEmail,
  buildEnrollmentCancelledEmail,
  buildEnrollmentConfirmationEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  buildVerificationEmail,
} from '../../server/src/services/emailTemplates.js'

describe('email templates', () => {
  const user = {
    id: 10n,
    email: 'student@academy.dev',
    displayName: 'Ayan',
  }

  const course = {
    id: 20n,
    slug: 'react-fundamentals',
    name: 'React Fundamentals',
    level: 'beginner',
    capacity: 30,
    publishedAt: new Date('2026-05-13T10:00:00.000Z'),
  }

  const enrollment = {
    id: 30n,
    course,
  }

  test('builds verification email with account token metadata', () => {
    const email = buildVerificationEmail({ user, token: 'verify-token' })
    expect(email.to).toBe(user.email)
    expect(email.text).toContain('/verify-email?token=verify-token')
    expect(email.metadata.event).toBe('auth.email_verification')
  })

  test('builds password reset email without hiding the token from Postman users', () => {
    const email = buildPasswordResetEmail({ user, token: 'reset-token' })
    expect(email.text).toContain('reset-token')
    expect(email.metadata.event).toBe('auth.password_reset')
  })

  test('builds business notification emails', () => {
    expect(buildEnrollmentConfirmationEmail({ user, enrollment }).metadata.event).toBe(
      'business.enrollment_created',
    )
    expect(buildEnrollmentCancelledEmail({ user, enrollment }).metadata.event).toBe(
      'business.enrollment_cancelled',
    )
    expect(buildCoursePublishedEmail({ to: 'admin@academy.dev', course }).metadata.event).toBe(
      'business.course_published',
    )
  })

  test('builds account security notification emails', () => {
    const profileEmail = buildAccountUpdatedEmail({ user, changedFields: ['display_name'] })
    const passwordEmail = buildPasswordChangedEmail({ user })

    expect(profileEmail.to).toBe(user.email)
    expect(profileEmail.metadata.event).toBe('account.profile_updated')
    expect(profileEmail.metadata.changed_fields).toEqual(['display_name'])
    expect(passwordEmail.metadata.event).toBe('account.password_changed')
  })
})
