# Changelog

## 2026-05-22 - Final deliverable layout and modular source architecture

- Promoted the repository to a final-deliverable-compatible `apps/api`, `frontend`, `database/prisma`, `migrations`, `tests`, `docs`, and `scripts` root architecture.
- Split backend feature modules into explicit `routes`, `services`, `queues`, `workers`, `jobs`, and `templates` subfolders.
- Split the frontend API layer into feature-owned API adapters under `features/*/api`, with shared HTTP/session infrastructure in `shared/api`.
- Removed empty legacy source folders left from the old flat `routes/services/pages/components/store` layout.
- Restored exact root-level deliverable paths required by the rubric: `frontend/`, `tests/`, `migrations/`, `openapi.yaml`, `CHECKLIST.txt`, `DEPLOYED_URL.txt`, and `VIDEO_LINK.txt`.
- Updated imports, tests, README, architecture notes, checklist, and defense script to match the new layout.

## 2026-05-21 - Final defense packaging

- Replaced Windows junction-based duplicate layout with real source directories.
- Removed legacy `FRONT-4`, nested `SERVER_STABLE`, duplicate backend OpenAPI/tests/migrations, stale nested CI, and corrupted step-by-step notes.
- Added root ESLint/Prettier/editor configuration, frontend alias metadata, and Docker context hygiene through `.dockerignore`.
- Made root `tests/` and root `migrations/` the canonical locations used by Jest and Prisma.
- Added a dedicated `worker` service to Docker Compose for BullMQ email and maintenance jobs.
- Added distinct JWT refresh-token signing secret support through `JWT_REFRESH_SECRET_KEY`.
- Hardened production environment validation for separate access/refresh JWT secrets, SMTP, Redis, CORS, and worker settings.
- Updated root `.env.example`, `README.md`, and `CHECKLIST.txt` for a clean local boot path and explicit production deployment steps.
- Added root `docker-compose.yml` orchestration for PostgreSQL, Redis, API, worker, and frontend.
- Added `frontend/Dockerfile` and nginx reverse proxy for `/api`, `/docs`, `/openapi.yaml`, and SPA routing.
- Added organized deliverables under `openapi.yaml`, `docs/api/postman`, `database/prisma`, `migrations`, `tests`, and root submission files.
- Replaced in-memory-only auth rate limiting with Redis-backed rate limiting plus local fallback.
- Frontend supports password reset, refresh-token rotation, server-side logout, publish/archive workflow, and admin job visibility.
- Added unit tests for course policy, environment validation, email handling, and Redis rate limiter fallback.

## 2026-05-14 - Defense readiness hardening

- Consolidated pagination helpers, tightened course validation, expanded Postman collection, and added pre-defense checks.

## 2026-05-13 - Pre-defense hardening

- Added email verification, password reset, refresh rotation, BullMQ workers, audit logs, and SMTP provider support.
