# Architecture

Academy Portal is organized around a small but production-shaped backend: HTTP routes stay thin, service modules hold business rules, Prisma owns database access, and background work is isolated behind BullMQ queues.

## Boundaries

- `src/routes`: HTTP endpoints, request parsing, authorization boundaries
- `src/services`: auth, account tokens, enrollment rules, notifications, readiness, audit logic
- `src/queues`: BullMQ queue creation and queue snapshots
- `src/workers`: BullMQ workers for email and maintenance jobs
- `src/jobs`: recurring or manually triggered jobs
- `src/validation`: Valibot request schemas
- `src/utils`: serialization, pagination, common API errors

## Key Decisions

- Prisma Client is the only runtime database access layer.
- JWT access tokens are short-lived; refresh tokens rotate and are stored hashed.
- Email verification is required before login and protected route access.
- Admin accounts are not created through public signup.
- Enrollment uses serializable transactions and conditional seat updates.
- Cursor pagination is used for list endpoints.
- Email sending is asynchronous through BullMQ when workers are enabled.
- Readiness checks verify database and Redis dependency health.

## Critical Workflows

### Auth

Registration creates a student account, stores a bcrypt password hash, creates a hashed email verification token, and queues a verification email. Login is blocked until `emailVerifiedAt` is set.

### Enrollment

The enrollment service validates course publication state, duplicate enrollment, and seat availability inside one transaction. Seats are incremented or decremented in the same transaction as enrollment state changes.

### Admin Catalog

Admins manage categories, teachers, and courses. Course publication is treated as a state transition from `draft` to `published`, and archive is a one-way public visibility removal.

### Background Jobs

Email jobs are queued with retry/backoff. Maintenance jobs refresh `course_daily_stats`, so admin reporting does not require expensive live aggregation on every request.
