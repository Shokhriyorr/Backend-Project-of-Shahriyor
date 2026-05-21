# Architecture Notes

## Stack

- Framework: Express 5
- ORM: Prisma Client only
- Database: PostgreSQL 15+
- Auth: verified-email accounts, JWT access tokens, rotating refresh tokens with database-backed revocation
- Validation: Valibot
- Background jobs: BullMQ + Redis for email and maintenance work
- Email: SMTP provider in production, log provider for local development/tests
- Docs: Swagger UI from local `openapi.yaml`

## Why the auth design looks like this

- Access tokens expire quickly and carry only identity + role claims.
- Access tokens are issued only after `email_verified_at` is set.
- Refresh tokens are stored only as SHA-256 hashes inside `auth_sessions`.
- Refresh tokens rotate: the submitted refresh session is revoked and a new session/token pair is created.
- Logout revokes the session row rather than trusting the client to discard tokens.
- Verification and password reset tokens are random one-time tokens stored only as SHA-256 hashes in `account_tokens`.
- Profile and password changes enqueue confirmation emails. Password changes require the current password and revoke existing refresh sessions.
- RBAC is middleware-based, so protected endpoints fail with `403 Forbidden` for the wrong role and `401 Unauthorized` for missing/invalid tokens.

## Academy Portal complexity requirements

### 1. Concurrency-safe enrollment

Enrollment uses a serializable Prisma transaction plus optimistic seat compare-and-set on `courses.seats_taken`. This prevents oversubscription without raw SQL.

### 2. Course publication state machine

Courses use the enum `draft -> published -> archived`. Publication validation is centralized in the course route before state changes are written.

### 3. Search + cursor pagination

The catalog endpoint uses keyset pagination on `(created_at, id)` and relation-aware filters across teachers and categories.

### 4. Referential integrity and safe archival

Teachers and categories cannot be deleted while non-archived courses still reference them. Courses are archived instead of hard deleted through the API.

### 5. Analytics without OLTP-heavy queries

`course_daily_stats` is refreshed by a lightweight scheduler in local no-Redis mode, or by a repeatable BullMQ maintenance job when `ENABLE_BACKGROUND_WORKERS=true`. Reporting reads use rollups instead of recalculating aggregates on every dashboard request.

## Async email and queue visibility

Auth and business endpoints enqueue email work instead of calling the email provider inline. With workers enabled, BullMQ stores job state in Redis and the worker sends email through SMTP. Admins can inspect queue counts, failed jobs, retry counts, and recent job metadata through `/api/admin/jobs/email` and `/api/admin/jobs/maintenance`.

Business email events implemented for defense:

- `business.enrollment_created`
- `business.enrollment_cancelled`
- `business.course_published`
- `account.profile_updated`
- `account.password_changed`
