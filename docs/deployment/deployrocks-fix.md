# DeployRocks failed deploy - fix guide

## Why it failed

| Error | Cause |
|-------|-------|
| `worker` build failed / no web listeners | DeployRocks read a compose file with the local-only worker service |
| `No web listeners specified` | The platform needs explicit `ports` entries for web apps |
| `Network ... does not exist` | Dokku tried to attach apps to a shared network before it was declared/created |
| `PASSWORD_RESET_TTL_MINUTES` random value | Platform auto-generated secrets for **numeric** env vars - you must set them manually |

## Fix (10 minutes)

### 1. Change compose file in DeployRocks

Project settings -> **Compose file**:

```text
compose.deployrocks.yaml
```

`docker-compose.yml` is also safe now, but setting the explicit file keeps the dashboard clear.

Both deploy compose files deploy only **api + frontend** with explicit web ports and the Dokku network name. Workers run inside **api** (`START_WORKERS_IN_API=true`). Postgres and Redis are created by the platform.

### 2. Delete failed worker app (if it exists)

In DeployRocks / Dokku apps list, remove:

`shokhriyorr-backend-project-of-shahriyor-worker`

You do not need a separate worker app.

### 3. Fix environment variables manually

In **Environment**, set these **exact** values (do not let the platform auto-fill TTL fields):

```env
EMAIL_VERIFICATION_TTL_MINUTES=1440
PASSWORD_RESET_TTL_MINUTES=30
STATS_JOB_REPEAT_MS=900000
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_DAYS=30

START_WORKERS_IN_API=true
ENABLE_BACKGROUND_WORKERS=true
EMAIL_PROVIDER=smtp
DEPLOYROCKS_PROJECT_NAME=shokhriyorr-backend-project-of-shahriyor
DEPLOYROCKS_API_HOST=shokhriyorr-backend-project-of-shahriyor-api.web
```

Use your real SMTP, JWT, and URLs. **Delete** wrong auto-generated entries for `PASSWORD_RESET_TTL_MINUTES` if they look like random secrets.

`PUBLIC_APP_URL` and `CORS_ORIGINS` must match your live frontend URL, for example:

```env
PUBLIC_APP_URL=https://shokhriyorr-backend-project-of-shahriyor.kazi.rocks
CORS_ORIGINS=https://shokhriyorr-backend-project-of-shahriyor.kazi.rocks
```

Do **not** set `DATABASE_URL` or `REDIS_URL` yourself unless the dashboard shows them empty - DeployRocks injects them.

### 4. Redeploy

Click **Retry deploy**. Order should be: api -> frontend (both green).

### 5. Smoke test

```text
https://YOUR-DOMAIN.kazi.rocks/health
https://YOUR-DOMAIN.kazi.rocks/docs
```

Register a student and confirm email arrives.

## If api still fails

Open **Logs** for `...-api` and check for:

- `Environment validation failed` -> fix JWT length (32+ chars) and CORS_ORIGINS
- `Prisma` / database -> wait for postgres plugin to be green, redeploy api

## Local Docker

Full stack (rubric): `docker compose -f docker-compose.local.yml up --build`.

`compose.deployrocks.yaml` and root `docker-compose.yml` are **only** for the cloud platform shape.
