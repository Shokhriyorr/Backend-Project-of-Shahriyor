# Academy Portal Backend

Production-oriented Express + Prisma backend for the Academy Portal final project. This sprint covers the mandatory authentication/authorization baseline plus the first core business transaction for the BYOI track: concurrency-safe course enrollment.

## What is included

- Validated environment boot with startup failure on missing secrets
- PostgreSQL + Prisma schema aligned to the approved blueprint
- Registration, login, refresh, logout
- JWT access tokens + reusable revocable refresh tokens
- Role-based access control for `student` and `admin`
- Rate limiting on `/api/auth/register` and `/api/auth/login`
- Cursor-based pagination
- Concurrency-safe enrollment transaction
- Course publish/archive state machine
- Audit logs for auth and admin mutations
- Daily rollup job for `course_daily_stats`
- Swagger UI at `/docs`
- Docker, Jest test setup, and GitHub Actions CI

## Quick start

1. Copy `.env.example` to `.env`.
2. Make sure PostgreSQL 15+ is running and `DATABASE_URL` points to it.
3. Install packages:

```bash
npm install
```

4. Apply migrations and generate Prisma client:

```bash
npm run prisma:deploy
npm run prisma:generate
```

5. Start the server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000` and Swagger UI at `http://localhost:3000/docs`.

## Docker

Run the backend and PostgreSQL together:

```bash
docker compose up --build
```

## Useful endpoints for defense

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/courses`
- `POST /api/enrollments`
- `DELETE /api/enrollments/{courseId}`
- `POST /api/categories`
- `POST /api/teachers`
- `POST /api/courses`

## Testing

```bash
npm run lint
npm test
```

## Notes

- Business writes use Prisma only. No raw SQL is used in route handlers.
- Additional rationale is documented in [ARCHITECTURE.md](./ARCHITECTURE.md).
- Compatibility deviations from the original lightweight frontend are documented in [CHANGELOG.md](./CHANGELOG.md).
