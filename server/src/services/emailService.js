import fs from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let smtpTransport = null

function normalizeRecipients(to) {
  return Array.isArray(to) ? to : [to]
}

async function appendEmailLog(message) {
  const filePath = path.resolve(process.cwd(), env.EMAIL_LOG_PATH)
  const entry = {
    at: new Date().toISOString(),
    provider: env.EMAIL_PROVIDER,
    to: message.to,
    subject: message.subject,
    metadata: message.metadata ?? {},
    text: message.text,
  }

  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8')
}

function getSmtpTransport() {
  if (!smtpTransport) {
    const auth =
      env.SMTP_USER || env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined

    smtpTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth,
    })
  }

  return smtpTransport
}

async function sendWithSmtp(message) {
  const info = await getSmtpTransport().sendMail({
    from: env.EMAIL_FROM,
    to: normalizeRecipients(message.to),
    replyTo: env.EMAIL_REPLY_TO ?? undefined,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })

  return {
    provider: 'smtp',
    provider_message_id: info.messageId ?? null,
  }
}

export async function sendEmailNow(message) {
  if (env.EMAIL_PROVIDER === 'smtp') {
    return sendWithSmtp(message)
  }

  await appendEmailLog(message)
  return {
    provider: 'log',
    provider_message_id: null,
  }
}
