import 'dotenv/config'
import { sendEmailNow } from '../src/services/emailService.js'

const to = process.argv[2] ?? process.env.TEST_EMAIL ?? process.env.ADMIN_EMAIL

if (!to) {
  throw new Error('Pass an email address as the first argument or set TEST_EMAIL/ADMIN_EMAIL.')
}

const result = await sendEmailNow({
  to,
  subject: 'Academy Portal email test',
  text: 'This is a test email from the Academy Portal backend.',
  html: '<p>This is a test email from the Academy Portal backend.</p>',
  metadata: {
    event: 'system.email_test',
  },
})

console.log('Email send result:')
console.log(JSON.stringify(result, null, 2))
