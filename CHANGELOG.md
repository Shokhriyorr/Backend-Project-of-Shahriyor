# Changelog

## 2026-05-21 - Final defense packaging

- Replaced Windows junction-based duplicate layout with real `server/`, `frontend/`, `tests/`, and `migrations/` directories.
- Removed legacy `FRONT-4`, nested `SERVER_STABLE`, duplicate backend OpenAPI/tests/migrations, stale nested CI, and corrupted step-by-step notes.
- Added root ESLint/Prettier/editor configuration, frontend alias metadata, and Docker context hygiene through `.dockerignore`.
- Made root `tests/` and `migrations/` the canonical locations used by Jest and Prisma.
- Added a dedicated `worker` service to Docker Compose for BullMQ email and maintenance jobs.
- Added distinct JWT refresh-token signing secret support through `JWT_REFRESH_SECRET_KEY`.
- Hardened production environment validation for separate access/refresh JWT secrets, SMTP, Redis, CORS, and worker settings.
- Updated root `.env.example`, `README.md`, and `CHECKLIST.txt` for a clean local boot path and explicit production deployment steps.
- Added root `docker-compose.yml` orchestration for PostgreSQL, Redis, API, worker, and frontend.
- Added `frontend/Dockerfile` and nginx reverse proxy for `/api`, `/docs`, `/openapi.yaml`, and SPA routing.
- Added root deliverables: `openapi.yaml`, `migrations/`, `tests/`, `CHECKLIST.txt`, `DEPLOYED_URL.txt`, and `VIDEO_LINK.txt`.
- Replaced in-memory-only auth rate limiting with Redis-backed rate limiting plus local fallback.
- Frontend supports password reset, refresh-token rotation, server-side logout, publish/archive workflow, and admin job visibility.
- Added unit tests for course policy, environment validation, email handling, and Redis rate limiter fallback.

## 2026-05-14 - Defense readiness hardening

- Consolidated pagination helpers, tightened course validation, expanded Postman collection, and added pre-defense checks.

## 2026-05-13 - Pre-defense hardening

- Added email verification, password reset, refresh rotation, BullMQ workers, audit logs, and SMTP provider support.
