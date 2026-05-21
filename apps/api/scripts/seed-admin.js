import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../src/shared/database/prisma.js'

const email = process.env.ADMIN_EMAIL ?? 'admin@academy.dev'
const password = process.env.ADMIN_PASSWORD ?? 'AdminPass123!'
const displayName = process.env.ADMIN_NAME ?? 'Academy Admin'

if (!password || password.length < 8) {
  throw new Error('ADMIN_PASSWORD must be set and be at least 8 characters long.')
}

const passwordHash = await bcrypt.hash(password, 12)

const admin = await prisma.user.upsert({
  where: { email },
  update: {
    passwordHash,
    displayName,
    role: 'admin',
    emailVerifiedAt: new Date(),
    updatedAt: new Date(),
  },
  create: {
    email,
    passwordHash,
    displayName,
    role: 'admin',
    emailVerifiedAt: new Date(),
  },
})

console.log(`Admin account created or updated: ${admin.email}`)
console.log('Use this admin login:')
console.log(`  email: ${email}`)
console.log(`  password: ${password}`)

await prisma.$disconnect()
