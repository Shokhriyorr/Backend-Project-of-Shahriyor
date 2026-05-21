import { jest } from '@jest/globals'
import fs from 'node:fs/promises'

describe('email service', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  test('sends email through SMTP when EMAIL_PROVIDER=smtp', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-message-id' })
    const createTransport = jest.fn(() => ({ sendMail }))

    jest.unstable_mockModule('nodemailer', () => ({
      default: {
        createTransport,
      },
    }))

    process.env.EMAIL_PROVIDER = 'smtp'
    process.env.EMAIL_FROM = 'Academy Portal <no-reply@example.com>'
    process.env.EMAIL_REPLY_TO = 'support@example.com'
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'smtp-user'
    process.env.SMTP_PASS = 'smtp-pass'
    process.env.SMTP_SECURE = 'false'

    const { sendEmailNow } =
      await import('../../apps/api/src/modules/notifications/services/email.service.js')
    const result = await sendEmailNow({
      to: 'student@example.com',
      subject: 'Welcome',
      text: 'Welcome text',
      html: '<p>Welcome text</p>',
    })

    expect(result).toEqual({
      provider: 'smtp',
      provider_message_id: 'smtp-message-id',
    })
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    })
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Academy Portal <no-reply@example.com>',
      to: ['student@example.com'],
      replyTo: 'support@example.com',
      subject: 'Welcome',
      html: '<p>Welcome text</p>',
      text: 'Welcome text',
    })
  })

  test('writes email to log when EMAIL_PROVIDER=log', async () => {
    const logPath = 'email.log-provider.test.log'
    await fs.rm(logPath, { force: true })

    process.env.EMAIL_PROVIDER = 'log'
    process.env.EMAIL_LOG_PATH = logPath

    const { sendEmailNow } =
      await import('../../apps/api/src/modules/notifications/services/email.service.js')
    const result = await sendEmailNow({
      to: 'student@example.com',
      subject: 'Verify',
      text: 'Verification link',
      html: '<p>Verification link</p>',
      metadata: {
        event: 'auth.email_verification',
      },
    })

    expect(result).toEqual({
      provider: 'log',
      provider_message_id: null,
    })

    const log = await fs.readFile(logPath, 'utf8')
    expect(log).toContain('student@example.com')
    expect(log).toContain('Verification link')

    await fs.rm(logPath, { force: true })
  })
})
