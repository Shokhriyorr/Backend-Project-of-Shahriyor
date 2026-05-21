# Changelog

## 2026-05-13 - Pre-defense hardening

- Added required email verification before login/token issuance. Existing users are marked verified by migration so seeded/admin accounts remain usable.
- Added password reset request/confirm flow with single-use hashed account tokens.
- Changed refresh behavior from reusable refresh tokens to rotation: every refresh revokes the submitted refresh session and returns a new pair.
- Added async email notifications for verification, password reset, enrollment confirmation, enrollment cancellation, and course publication.
- Added SMTP email provider configuration through `SMTP_*` variables while keeping the local log provider for development/tests.
- Added authenticated account profile and password update endpoints with email security notifications.
- Added BullMQ/Redis queues for email and maintenance work, plus admin visibility endpoints for queue counts, failures, retries, and recent jobs.
- Kept the original Academy Portal role model (`student`, `admin`). Teacher remains a managed catalog profile, not a login role, matching the approved blueprint.
- Added admin endpoints for audit log inspection and `course_daily_stats` rollup inspection/triggering.
- Restricted public signup to `student` accounts. Admin users are provisioned by `npm run seed:admin` so anonymous users cannot grant themselves admin RBAC.
- Added production boot checks for placeholder JWT secrets and wildcard CORS origins.
- Added a lint guard that fails if raw SQL-like access appears in `src/` JavaScript files.
- Added `/health/ready` for dependency readiness checks against PostgreSQL through Prisma and Redis when workers are enabled.
- Added integration tests for auth middleware/RBAC and public registration security.
- Updated the defense Postman collection with system checks and corrected paginated list/enrollment requests.

Architectural note: the approved v1 blueprint did not require email verification, password reset, or Redis workers. They were added to satisfy the stricter pre-defense rubric without changing core catalog/enrollment business rules.
