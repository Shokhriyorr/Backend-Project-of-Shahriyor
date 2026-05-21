# DeployRocks failed deploy - fix guide

## Why it failed

| Error | Cause |
|-------|-------|
| `worker` build failed / no web listeners | DeployRocks read a compose file with multiple web apps |
| `No web listeners specified` | The platform needs explicit `ports` entries for web apps |
| `Network ... does not exist` | DeployRocks entered multi-app Compose mode and tried to attach apps to a shared network |
| `PASSWORD_RESET_TTL_MINUTES` random value | Platform auto-generated secrets for **numeric** env vars - you must set them manually |

## Fix (10 minutes)

### 1. Use Dockerfile deploy mode

Do **not** set a Compose file in DeployRocks. The repository root `Dockerfile` is the production image.

The root `Dockerfile` deploys **one web app**: nginx serves the frontend and proxies to the API inside the same container. This avoids the broken cross-app Dokku network. Workers run inside the same app (`START_WORKERS_IN_API=true`). Postgres and Redis are created/linked by the platform.

### 2. Delete failed old apps (if they exist)

In DeployRocks / Dokku apps list, remove old failed separate apps:

`shokhriyorr-backend-project-of-shahriyor-api`
`shokhriyorr-backend-project-of-shahriyor-worker`

You only need the main app now; it contains frontend + API + workers.

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
```

Use your real SMTP, JWT, and URLs. **Delete** wrong auto-generated entries for `PASSWORD_RESET_TTL_MINUTES` if they look like random secrets.

`PUBLIC_APP_URL` and `CORS_ORIGINS` must match your live frontend URL, for example:

```env
PUBLIC_APP_URL=https://shokhriyorr-backend-project-of-shahriyor.kazi.rocks
CORS_ORIGINS=https://shokhriyorr-backend-project-of-shahriyor.kazi.rocks
```

Do **not** set `DATABASE_URL` or `REDIS_URL` yourself unless the dashboard shows them empty - DeployRocks injects them.

### 4. Redeploy

Click **Retry deploy**. The dashboard should build the root `Dockerfile` and deploy only the main app.

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

The root `Dockerfile` is for DeployRocks. `docker-compose.local.yml` is for local full-stack runs.
