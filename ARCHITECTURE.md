# Architecture Notes

## Stack

- Framework: Express 5
- ORM: Prisma Client only
- Database: PostgreSQL 15+
- Auth: JWT access + refresh tokens with database-backed revocation
- Validation: Valibot
- Docs: Swagger UI from local `openapi.yaml`

## Why the auth design looks like this

- Access tokens expire quickly and carry only identity + role claims.
- Refresh tokens are stored only as SHA-256 hashes inside `auth_sessions`.
- Logout revokes the session row rather than trusting the client to discard tokens.
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

`course_daily_stats` is refreshed by a lightweight scheduler (`src/jobs/courseDailyStats.js`) so reporting reads can move to rollups instead of recalculating aggregates on every dashboard request.
