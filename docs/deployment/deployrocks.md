# DeployRocks / Render deployment

## DeployRocks (recommended)

1. Push the latest `main` branch to GitHub.
2. Sign in at [dashboard.deployrocks.com](https://dashboard.deployrocks.com) and connect the repository.
3. Choose **Docker Compose** deployment and set the compose file to **`compose.deployrocks.yaml`**. The root `docker-compose.yml` has the same DeployRocks-safe api + frontend shape in case the dashboard falls back to the default file.
4. If a deploy failed before, read **`docs/deployment/deployrocks-fix.md`**.
5. Set environment variables in the platform dashboard (do not commit secrets):

| Variable | Example |
|----------|---------|
| `ENVIRONMENT` | `production` |
| `NODE_ENV` | `production` |
| `DEPLOYROCKS_PROJECT_NAME` | `shokhriyorr-backend-project-of-shahriyor` |
| `DEPLOYROCKS_API_HOST` | `shokhriyorr-backend-project-of-shahriyor-api.web` |
| `JWT_SECRET_KEY` | 32+ random chars |
| `JWT_REFRESH_SECRET_KEY` | different 32+ random chars |
| `POSTGRES_PASSWORD` | strong password |
| `DATABASE_URL` | Platform-injected, or `postgresql://postgres:<password>@db:5432/academy_db` |
| `REDIS_URL` | Platform-injected, or `redis://redis:6379` |
| `EMAIL_PROVIDER` | `smtp` |
| `EMAIL_FROM_ADDRESS` | verified sender |
| `SMTP_PASS` or `EMAIL_API_KEY` | provider secret |
| `PUBLIC_APP_URL` | `https://<your-frontend-domain>` |
| `CORS_ORIGINS` | `https://<your-frontend-domain>` |
| `ADMIN_NOTIFICATION_EMAILS` | your inbox for course-published alerts |

6. Deploy and wait until `api` and `frontend` are live, with platform Postgres/Redis healthy. Workers run inside `api` on DeployRocks.
7. Copy the public frontend URL into `DEPLOYED_URL.txt` (first line only).
8. Record the defense video against the deployed URL and update `VIDEO_LINK.txt`.

## Render fallback

Render can run the same Compose stack with a **Docker Compose** blueprint:

1. Create a new **Blueprint** from the repo.
2. Use `docker-compose.local.yml` plus `docker-compose.prod.yml`.
3. Configure the same environment variables in the Render dashboard.
4. Expose the `frontend` service publicly and keep `db`/`redis` internal.

## Post-deploy smoke test

```text
GET  https://<frontend>/health
GET  https://<frontend>/docs
POST https://<frontend>/api/auth/register
```

Register a student, confirm the verification email arrives, verify the account, enroll in a published course, and inspect:

```text
GET https://<frontend>/api/admin/jobs/email
```
