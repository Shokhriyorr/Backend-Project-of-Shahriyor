# DeployRocks / Render deployment

## DeployRocks (recommended)

1. Push the latest `main` branch to GitHub.
2. Sign in at [dashboard.deployrocks.com](https://dashboard.deployrocks.com) and connect the repository.
3. Use branch `deployrocks-root-dockerfile` for DeployRocks. Do **not** set a Compose file; DeployRocks should build the root `Dockerfile`.
4. If a deploy failed before, read **`docs/deployment/deployrocks-fix.md`**.
5. Set environment variables in the platform dashboard (do not commit secrets):

| Variable | Example |
|----------|---------|
| `ENVIRONMENT` | `production` |
| `NODE_ENV` | `production` |
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

6. Deploy and wait until the main app is live, with platform Postgres linked. Frontend and API routes run inside the same container on DeployRocks; enable Redis workers later after adding `REDIS_URL`.
7. Copy the public frontend URL into `DEPLOYED_URL.txt` (first line only).
8. Record the defense video against the deployed URL and update `VIDEO_LINK.txt`.

## Render fallback

Use Render only if DeployRocks keeps failing because of the shared nginx
`invalid:3000` issue. The repository includes `render.yaml` for a one-click
Blueprint:

1. Create a new **Blueprint** from the repo.
2. Render will create one public Docker web service from the root `Dockerfile`,
   plus managed Postgres and Key Value (Redis-compatible) services.
3. During Blueprint setup, fill every `sync: false` secret:
   `SMTP_PASS`, `EMAIL_FROM_ADDRESS`, `ADMIN_NOTIFICATION_EMAILS`, and
   `ADMIN_PASSWORD`.
4. Use a provider that supports SMTP port `2525` (SendGrid or Mailgun). Render
   free web services block outbound SMTP on `25`, `465`, and `587`, so Gmail
   SMTP on `587` is not suitable for the free Render fallback.
5. After first deploy, update `PUBLIC_APP_URL` and `CORS_ORIGINS` if Render
   assigned a different URL than:
   `https://shokhriyorr-academy-portal.onrender.com`.
6. Copy the working URL into `DEPLOYED_URL.txt` and smoke test `/health`,
   `/docs`, registration email verification, login, and enrollment.

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
