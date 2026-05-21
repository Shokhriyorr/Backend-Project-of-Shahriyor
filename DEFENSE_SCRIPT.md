# Oral Defense Script — Academy Portal (BYOI)

## Before defense (5 minutes)

1. Open live frontend URL from `DEPLOYED_URL.txt`.
2. Open Swagger UI: `<backend-url>/docs`.
3. Import `postman/academy-defense.postman_collection.json` and open one tab per endpoint group.
4. Keep your email inbox open for verification and business notifications.
5. Run `cd server && npm test` if the examiner asks for tests.

## Demo flow (15–20 minutes)

### 1. Live frontend loads

- Show home page and course catalog from the real API.
- Mention Docker Compose stack: PostgreSQL 15, Redis, Express API, React frontend.

### 2. Authentication lifecycle

1. Register a new student account.
2. Show verification email in inbox (or `server/email.out.log` in local log mode).
3. Click verify link → `/verify-email`.
4. Log in and open protected pages (`/my-courses`, `/account`).
5. Log out (refresh session revoked server-side).
6. Demonstrate password reset: `/forgot-password` → email → `/reset-password`.

### 3. Three business workflows

**Workflow A — Publish course (admin)**

- Log in as `admin@academy.dev`.
- Create category + teacher + course (draft).
- Publish course → triggers `business.course_published` email job.
- Show audit log entry in Admin → Operations.

**Workflow B — Student enrollment**

- Log in as student.
- Enroll in published course.
- Show confirmation email (`business.enrollment_created`).
- Explain concurrency-safe seat update in PostgreSQL transaction.

**Workflow C — Analytics / background jobs**

- Admin → Operations → queue counters.
- Trigger “Run stats rollup”.
- Explain `course_daily_stats` rollup (BYOI-5).

### 4. API proof (Postman, if asked)

- `GET /api/courses?q=react` — search + cursor pagination.
- `POST /api/enrollments` — write path with auth.
- `GET /api/admin/audit-logs` — admin RBAC.

### 5. Architecture talking points (BYOI)

1. Concurrency-safe enrollment — `enrollmentService.js`
2. Publication state machine — `coursePolicy.js`
3. Search + cursor pagination — `courses.js`
4. Referential integrity — `teachers.js` / `categories.js`
5. Analytics rollups — `courseDailyStats.js`

## Examiner questions — short answers

- **Why Prisma only?** Type-safe ORM, migrations, no raw SQL in app code.
- **Why Redis?** BullMQ email/maintenance queues + token-bucket rate limiting.
- **Why async email?** API returns fast; SMTP latency handled by workers.
- **How do unverified users get blocked?** No access/refresh tokens until `email_verified_at` is set.
