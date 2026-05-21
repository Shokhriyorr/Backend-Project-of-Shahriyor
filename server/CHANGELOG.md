# Changelog

## 2026-05-14 - Defense readiness hardening

- Consolidated repeated paginated response shaping into one helper and added test coverage.
- Tightened course create/update validation so missing teacher/category references fail consistently with `422`.
- Removed an unused seed script alias and expanded ignore rules for logs, environment files, build output, and coverage.
- Completed the Postman defense collection so every OpenAPI endpoint has a ready tab.
- Added `npm run predefense:check` and `npm run predefense:strict`.
- Added `DEFENSE_SCRIPT.md` for the oral defense flow.
- Restored operational scripts for linting, admin seeding, demo seeding, and email testing.
- Added readiness checks for PostgreSQL and Redis through `/health/ready`.
- Added integration tests for auth middleware/RBAC and public registration security.
- Added production environment checks for placeholder JWT secrets and wildcard CORS origins.
- Restricted public signup to `student` accounts; admin accounts are provisioned through `seed-admin`.
- Added a lint guard that blocks raw SQL-like access in application code.

## 2026-05-13 - Pre-defense hardening

- Added email verification before login/token issuance.
- Added password reset request/confirm flow with single-use hashed account tokens.
- Changed refresh behavior to rotation with revocable refresh sessions.
- Added async email notifications for verification, password reset, enrollment confirmation, enrollment cancellation, course publication, account update, and password change.
- Added SMTP email provider support while keeping the local log provider for development.
- Added BullMQ/Redis queues for email and maintenance work.
- Added admin queue visibility endpoints.
- Added audit log and course daily stats inspection endpoints.
