# Changelog

## 2026-05-21 - Final defense packaging

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
