# Academy Portal (BYOI Track)

Full-stack final defense project: Express + Prisma backend, React demo frontend, PostgreSQL 15, Redis/BullMQ workers, SMTP email integration, Docker Compose, and OpenAPI documentation.

## Repository layout

```text
.
|-- server/                 Express API, Prisma schema, workers, routes, services
|-- frontend/               React + Vite demo UI served by nginx
|-- migrations/             Canonical Prisma migrate history
|-- tests/                  Canonical Jest unit/integration suites
|-- docs/                   Blueprint notes and defense script
|-- postman/                Defense Postman collection/environment
|-- docker-compose.yml      API + worker + frontend + PostgreSQL + Redis
|-- openapi.yaml            API contract
|-- .env.example            Local and production environment template
|-- CHECKLIST.txt           Self-verification checklist
|-- DEPLOYED_URL.txt        Public deployment URL placeholder
`-- VIDEO_LINK.txt          Defense video URL placeholder
```

## Quick start with Docker

```bash
cp .env.example .env
docker compose up --build
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
- Migrations/tests: kept once at the repository root to satisfy submission requirements and avoid duplicate histories.
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
cd server
cp .env.example .env
npm install
npm run prisma:deploy
npm run prisma:generate
npm run seed:admin
npm run seed:demo
npm run dev
```

Worker:

```bash
cd server
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
cd server
npm test
npm run lint
npm run predefense:check
npm run predefense:strict
```

## Deployment

1. Push the full repository to GitHub.
2. Create a DeployRocks or Render project from the repository.
3. Deploy with Docker Compose using `docker-compose.yml`; use `docker-compose.prod.yml` as the production overlay if the platform supports multiple Compose files.
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
5. Open Swagger UI at `/docs` and the Postman collection in `postman/`.
6. Use `docs/defense-script.md` as the live demo script.
