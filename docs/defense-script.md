# Oral Defense Script - Academy Portal (BYOI)

## Before Defense

1. Open live frontend URL from `DEPLOYED_URL.txt`.
2. Open Swagger UI: `<backend-url>/docs`.
3. Import `docs/api/postman/academy-defense.postman_collection.json`.
4. Keep your email inbox open for verification and business notifications.
5. Run `cd apps/api && npm test` if the examiner asks for tests.

## Demo Flow

### 1. Live Frontend Loads

- Show home page and course catalog from the real API.
- Mention Docker Compose stack: PostgreSQL 15, Redis, Express API, React frontend.

### 2. Authentication Lifecycle

1. Register a new student account.
2. Show verification email in inbox, or `apps/api/email.out.log` in local log mode.
3. Click verify link: `/verify-email`.
4. Log in and open protected pages: `/my-courses`, `/account`.
5. Log out and mention server-side refresh session revocation.
6. Demonstrate password reset: `/forgot-password` -> email -> `/reset-password`.

### 3. Business Workflows

- Publish course: admin creates category, teacher, draft course, then publishes it.
- Student enrollment: student enrolls in a published course and receives notification email.
- Analytics/background jobs: admin opens Operations, reviews queues, and triggers stats rollup.

### 4. API Proof

- `GET /api/courses?q=react`: search + cursor pagination.
- `POST /api/enrollments`: authenticated write path.
- `GET /api/admin/audit-logs`: admin RBAC.

### 5. Architecture Talking Points

1. Concurrency-safe enrollment: `apps/api/src/modules/enrollments/services/enrollment.service.js`
2. Publication state machine: `apps/api/src/modules/catalog/services/course-policy.service.js`
3. Search + cursor pagination: `apps/api/src/modules/catalog/routes/courses.routes.js`
4. Referential integrity: `apps/api/src/modules/catalog/routes/teachers.routes.js` and `apps/api/src/modules/catalog/routes/categories.routes.js`
5. Analytics rollups: `apps/api/src/modules/catalog/jobs/course-daily-stats.job.js`

## Examiner Questions

- **Why Prisma only?** Type-safe ORM, migrations, no raw SQL in app code.
- **Why Redis?** BullMQ email/maintenance queues plus token-bucket rate limiting.
- **Why async email?** API returns fast; SMTP latency is handled by workers.
- **How do unverified users get blocked?** No access/refresh tokens until `email_verified_at` is set.
