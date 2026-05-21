# Academy Portal Backend

Production-oriented Express + Prisma backend for the Academy Portal final project. It implements the approved Academy Portal blueprint plus pre-defense hardening: verified accounts, password reset, async email notifications, Redis-backed BullMQ workers, queue visibility, audit trails, and concurrency-safe course enrollment.

## What is included

- Validated environment boot with startup failure on missing secrets
- PostgreSQL + Prisma schema aligned to the approved blueprint
- Student registration with email verification, login, refresh, logout
- Password reset by emailed one-time token
- Account profile editing and password change with email security notifications
- JWT access tokens + rotating revocable refresh tokens
- Role-based access control for `student` and `admin`; admin accounts are provisioned through `npm run seed:admin`
- Rate limiting on auth and sensitive public auth endpoints
- Cursor-based pagination
- Concurrency-safe enrollment transaction
- Course publish/archive state machine
- Audit logs for auth and admin mutations
- Daily rollup job for `course_daily_stats`
- Async email queue for verification, password reset, enrollment created, enrollment cancelled, and course published events
- Admin queue visibility endpoints for email and maintenance jobs
- Process and dependency health checks at `/health` and `/health/ready`
- Swagger UI at `/docs`
- Docker Compose for PostgreSQL, Redis, and API

## Quick start

1. Copy `.env.example` to `.env`.
2. Make sure PostgreSQL 15+ is running and `DATABASE_URL` points to it.
3. For Redis-backed jobs, run Redis and set `ENABLE_BACKGROUND_WORKERS=true`. For local no-Redis development, keep it `false`; email is still sent asynchronously through the log fallback.
4. Install packages:

```bash
npm install
```

5. Apply migrations and generate Prisma client:

```bash
npm run prisma:deploy
npm run prisma:generate
```

6. Create or refresh the defense admin:

```bash
npm run seed:admin
```

Public signup is intentionally limited to `student` accounts. Use `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` with `npm run seed:admin` to provision the defense/admin operator.

7. Start the server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`, Swagger UI at `http://localhost:3000/docs`, and the raw contract at `http://localhost:3000/openapi.yaml`.

Check runtime readiness before opening Postman:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

## Email setup

Local mode:

```env
EMAIL_PROVIDER=log
EMAIL_LOG_PATH=email.out.log
ENABLE_BACKGROUND_WORKERS=false
```

Production or live defense mode with SMTP:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SECURE=false
EMAIL_FROM=Academy Portal <verified-sender@your-domain.com>
PUBLIC_APP_URL=http://localhost:5173
ENABLE_BACKGROUND_WORKERS=true
REDIS_URL=redis://127.0.0.1:6379
```

`SMTP_SECURE=true` is normally used for port `465`; port `587` usually uses STARTTLS and should stay `false`.

The API never waits for the third-party email response on auth or business endpoints. It enqueues the email job; the worker sends it and exposes completed/failed/retry state through admin queue endpoints.

## Docker

Run PostgreSQL, Redis, and the API together:

```bash
docker compose up --build
```

## Useful endpoints for defense

- `GET /health`
- `GET /health/ready`
- `GET /openapi.yaml`
- `POST /api/auth/register`
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/resend-verification`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `PUT /api/users/me/password`
- `GET /api/courses`
- `POST /api/enrollments`
- `DELETE /api/enrollments/{courseId}`
- `POST /api/categories`
- `POST /api/teachers`
- `POST /api/courses`
- `GET /api/admin/audit-logs`
- `GET /api/admin/course-daily-stats`
- `GET /api/admin/jobs/email`
- `GET /api/admin/jobs/maintenance`
- `POST /api/admin/jobs/course-daily-stats`

Defense auth flow:

1. Register a user.
2. Open the verification email from the inbox or `email.out.log`.
3. Open the verification link in the frontend.
4. Login and copy the access token.
5. Call `GET /api/users/me` with `Authorization: Bearer <token>`.
6. Refresh the token and confirm the old refresh token no longer works.
7. Logout.

Business workflow demonstration:

1. Login as admin.
2. Create category, teacher, and draft course.
3. Publish course and inspect the course-published email job.
4. Login as verified student.
5. Enroll, then inspect seat count, audit log, and enrollment email job.
6. Unenroll, then inspect seat count, audit log, and cancellation email job.
7. Trigger `POST /api/admin/jobs/course-daily-stats` and inspect maintenance queue or rollup rows.

Recurring jobs:

- Email jobs are queued on every auth/business email event and retried up to 3 times with exponential backoff.
- Course daily stats are scheduled through BullMQ every `STATS_JOB_REPEAT_MS` when `ENABLE_BACKGROUND_WORKERS=true` and `ENABLE_DAILY_STATS_JOB=true`.
- If workers are disabled for local development, the same rollup can be triggered synchronously with `POST /api/admin/jobs/course-daily-stats`.

## Testing

```bash
npm run lint
npm test
```

`npm test` runs unit tests for pure business logic such as publication state validation, slug generation, pagination cursor handling, email template metadata, environment validation, readiness checks, plus integration tests for auth middleware and public registration security.

## Notes

- Business writes use Prisma only. No raw SQL is used in route handlers.
- Additional rationale is documented in [ARCHITECTURE.md](./ARCHITECTURE.md).
- Compatibility deviations from the original lightweight frontend are documented in [CHANGELOG.md](./CHANGELOG.md).
