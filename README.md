# Academy Portal (BYOI Track)

Full-stack final defense project: Express + Prisma backend, React demo frontend, PostgreSQL 15, Redis/BullMQ workers, SMTP email integration, Docker Compose, and OpenAPI documentation.

## Repository layout

```text
.
|-- apps/
|   |-- api/                Express API application
|   |   |-- src/
|   |   |   |-- app/        Express app composition and HTTP wiring
|   |   |   |-- config/     Runtime environment validation
|   |   |   |-- modules/    Backend feature modules
|   |   |   `-- shared/     Cross-cutting database, HTTP, middleware, queues, utils
|   |   `-- scripts/       API maintenance and seed scripts
|-- frontend/                React + Vite UI served by nginx
|   `-- src/
|       |-- app/            App shell, routing, store, startup hooks, global styles
|       |-- entities/       Reusable domain UI such as course and teacher cards
|       |-- features/       Frontend feature modules with pages/model/api
|       `-- shared/         Shared HTTP client, layout, UI, assets/hooks/types/utils
|-- database/
|   `-- prisma/             Prisma schema
|-- migrations/             Canonical Prisma migrate history
|-- tests/                  Backend unit and integration tests
|-- docs/
|   |-- api/postman/        Postman collection/environment
|   `-- blueprint/          Original blueprint notes
|-- openapi.yaml            Complete API contract
|-- CHECKLIST.txt           Final submission checklist
|-- DEPLOYED_URL.txt        Public deployed frontend URL
|-- VIDEO_LINK.txt          Defense video link
|-- scripts/                Root verification/automation scripts
|-- docker-compose.full.yml API + worker + frontend + PostgreSQL + Redis (rubric)
|-- docker-compose.local.yml Alias that includes docker-compose.full.yml
|-- Dockerfile              DeployRocks single-container image
|-- .env.example            Local and production environment template
`-- package.json            Root orchestration scripts
```

## Quick start with Docker

```bash
cp .env.example .env
docker compose -f docker-compose.full.yml up --build
```

Default local URLs from `.env.example`:

- Frontend: `http://localhost:8080`
- API docs: `http://localhost:3000/docs`
- Readiness: `http://localhost:3000/health/ready`

If those ports are busy, edit `BACKEND_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`, and `REDIS_PORT` in `.env`.

Seeded admin:

- Email: `admin@academy.dev`
- Password: `AdminPass123!`

## Architecture decisions

- Backend framework: Express.js, matching the Week 1 JavaScript/Node choice.
- ORM: Prisma only. Application source is scanned by `npm run lint` for raw SQL-like access.
- API source is feature-based: `apps/api/src/modules/*` owns its `routes`, `services`, `queues`, `workers`, or `jobs`; shared HTTP/middleware/database helpers live in `apps/api/src/shared`.
- Frontend source follows `app/features/entities/shared`; each feature owns its pages, Redux model, and API adapter, while the shared layer keeps only reusable infrastructure and UI.
- Prisma schema lives in `database/prisma`; migration history is root-level `migrations/` to match the final submission rubric.
- Database: PostgreSQL 15 with Prisma migrations and ACID transactions for enrollment seat changes.
- Cache/queue: Redis powers BullMQ email and maintenance queues plus Redis-backed auth rate limiting.
- Frontend: React + Vite consumes the live API through `/api`; nginx proxies API/docs/openapi traffic to the backend container.
- Background processing: the `worker` Compose service runs email delivery and recurring analytics rollups separately from the API service.

## BYOI complexity requirements

1. Concurrency-safe enrollment with serializable Prisma transactions and seat compare-and-set.
2. Course publication state machine: draft -> published -> archived.
3. Search, filters, and cursor pagination for course catalog reads.
4. Referential integrity on teacher/category deletion.
5. Analytics rollups in `course_daily_stats` via a Redis/BullMQ maintenance job.

## Email events

Production uses `EMAIL_PROVIDER=smtp` with SendGrid/Mailgun/AWS SES-compatible SMTP credentials. Local development can use `EMAIL_PROVIDER=log`.

Implemented queued emails:

- Account verification
- Password reset
- Enrollment created
- Enrollment cancelled
- Course published
- Profile updated
- Password changed

## Local development

Backend:

```bash
cd apps/api
cp ../../.env.example ../../.env
npm install
npm run prisma:deploy
npm run prisma:generate
npm run seed:admin
npm run seed:demo
npm run dev
```

Worker:

```bash
cd apps/api
ENABLE_BACKGROUND_WORKERS=true npm run worker
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Testing and verification

```bash
npm run verify
```

This runs backend Jest tests, syntax/raw-SQL lint checks, frontend production build, and `docker compose config`.

Quality tooling:

```bash
npm run lint
npm run format:check
```

Backend-only checks:

```bash
cd apps/api
npm test
npm run lint
npm run predefense:check
npm run predefense:strict
```

## Deployment

See `docs/deployment/deployrocks.md` for the full DeployRocks/Render checklist.

1. Push the full repository to GitHub.
2. Create a DeployRocks or Render project from the repository.
3. On DeployRocks, do not set a Compose file. Deploy the repository from the root `Dockerfile`, which runs frontend and API in one web container to avoid cross-app Dokku network failures. For Render or local production smoke tests, use `docker compose -f docker-compose.full.yml -f docker-compose.prod.yml up --build`.
4. Configure production environment variables in the platform dashboard:
   - `ENVIRONMENT=production`
   - `NODE_ENV=production`
   - `JWT_SECRET_KEY`
   - `JWT_REFRESH_SECRET_KEY` (different from the access secret)
   - `DATABASE_URL=postgresql://postgres:<password>@db:5432/academy_db`
   - `REDIS_URL=redis://redis:6379`
   - `EMAIL_PROVIDER=smtp`
   - `EMAIL_API_KEY` or `SMTP_PASS`
   - `EMAIL_FROM_ADDRESS`
   - `PUBLIC_APP_URL`
   - `CORS_ORIGINS`
5. Update `DEPLOYED_URL.txt` with the public frontend URL.
6. Update `VIDEO_LINK.txt` with the defense recording URL.

## Defense flow

1. Open the deployed frontend.
2. Register a student, verify through the real email, log in, and log out.
3. Demonstrate browsing courses, enrolling, cancelling enrollment, and admin course publishing.
4. Show queued/completed jobs at `/api/admin/jobs/email` and `/api/admin/jobs/maintenance`.
5. Open Swagger UI at `/docs` and the Postman collection in `docs/api/postman/`.
6. Use `docs/defense-script.md` as the live demo script.
