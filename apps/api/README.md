# Academy Portal Backend

Production-oriented Express + Prisma backend for the Academy Portal final project. It includes verified accounts, password reset, JWT refresh rotation, RBAC, admin catalog management, concurrency-safe enrollment, async email notifications, Redis-backed jobs, audit logs, OpenAPI docs, and tests.

## Stack

- Node.js + Express
- PostgreSQL + Prisma ORM
- BullMQ + Redis for background jobs
- Nodemailer SMTP/log email provider
- Jest + Supertest

## Quick Start

```bash
cd ../..
cp .env.example .env
cd apps/api
npm install
npm run prisma:deploy
npm run prisma:generate
npm run seed:admin
npm run seed:demo
npm start
```

Prisma schema lives in `../../database/prisma`, migrations live in `../../migrations`, and API Jest tests live in `../../tests`.

Default URLs:

- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI YAML: `http://localhost:3000/openapi.yaml`
- Readiness: `http://localhost:3000/health/ready`

## Environment

Copy the root `.env.example` to root `.env` and set real values. The API loads root `.env` first, then an app-local `.env` if present.

Required for local/demo:

```env
DATABASE_URL=postgresql://postgres:1234@localhost:5432/academy_db
JWT_SECRET=replace-with-a-real-secret-at-least-32-characters
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PUBLIC_APP_URL=http://localhost:5173
```

For full defense email + queue demonstration:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_SECURE=false
EMAIL_FROM=Academy Portal <verified-sender@example.com>
ENABLE_BACKGROUND_WORKERS=true
REDIS_URL=redis://127.0.0.1:6379
```

Local fallback mode:

```env
EMAIL_PROVIDER=log
EMAIL_LOG_PATH=email.out.log
ENABLE_BACKGROUND_WORKERS=false
```

In log mode, verification/reset links are written to `email.out.log`.

## Scripts

```bash
npm run lint
npm test
npm run prisma:deploy
npm run prisma:generate
npm run seed:admin
npm run seed:demo
npm run email:test -- your@email.com
npm run predefense:check
npm run predefense:strict
```

## Main API Areas

- Auth: register, verify email, login, refresh, logout, password reset
- Users: profile and password update
- Courses: public browsing and admin CRUD/publish/archive
- Teachers/categories: public listing and admin CRUD
- Enrollments: student enroll/unenroll with ACID seat protection
- Admin: audit logs, course daily stats, queue visibility, job trigger
- System: health/readiness/OpenAPI/Swagger

## Defense Notes

- Public signup only creates `student` users.
- Admin users are provisioned with `npm run seed:admin`.
- Protected routes reject unverified users.
- Refresh tokens rotate and old refresh sessions are revoked.
- Enrollment uses a serializable transaction and conditional seat update to prevent oversubscription.
- Business writes use Prisma Client only; no raw SQL is used in application code.
- Background email jobs expose queue counts, failures, attempts, and recent jobs through admin endpoints.

See `../../docs/defense-script.md` for the live demonstration flow.
