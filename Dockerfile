# DeployRocks / Dokku image.
# Nginx serves the Vite frontend on $PORT and proxies API routes to Node on 127.0.0.1:5000.

FROM node:22-bookworm-slim AS api-build

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/apps/api

COPY apps/api/package.json apps/api/package-lock.json apps/api/prisma.config.ts ./
COPY database/prisma ./prisma
COPY migrations /workspace/migrations
RUN npm ci --include=dev

COPY openapi.yaml /workspace/openapi.yaml
COPY apps/api/scripts ./scripts
COPY apps/api/src ./src

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_db
ENV DOCKER_BUILD=true
RUN npm run prisma:generate

FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM node:22-alpine AS runtime

RUN apk add --no-cache nginx openssl gettext

WORKDIR /workspace/apps/api

COPY --from=api-build /workspace/apps/api/node_modules ./node_modules
COPY --from=api-build /workspace/apps/api/package.json /workspace/apps/api/package-lock.json /workspace/apps/api/prisma.config.ts ./
COPY --from=api-build /workspace/apps/api/prisma ./prisma
COPY --from=api-build /workspace/migrations /workspace/migrations
COPY --from=api-build /workspace/openapi.yaml /workspace/openapi.yaml
COPY --from=api-build /workspace/apps/api/scripts ./scripts
COPY --from=api-build /workspace/apps/api/src ./src
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY scripts/start-deployrocks.sh /usr/local/bin/start-deployrocks.sh

RUN chmod +x /usr/local/bin/start-deployrocks.sh

ENV NODE_ENV=production
ENV ENVIRONMENT=production
ENV PORT=80
ENV BACKEND_PORT=5000
ENV API_HOST=127.0.0.1
ENV API_PORT=5000
ENV DOCKER_BUILD=true
# Bootstrap defaults for DeployRocks first deploy (before Environment tab unlocks).
# Override these in the dashboard after the first Live deploy.
ENV ENABLE_BACKGROUND_WORKERS=true
ENV START_WORKERS_IN_API=true
ENV ENABLE_DAILY_STATS_JOB=true
ENV EMAIL_PROVIDER=smtp
ENV SMTP_HOST=smtp.gmail.com
ENV SMTP_PORT=587
ENV SMTP_USER=bootstrap@deployrocks.local
ENV SMTP_PASS=bootstrap-smtp-pass-change-in-dashboard
ENV EMAIL_FROM_ADDRESS=Academy Portal <bootstrap@deployrocks.local>
ENV PUBLIC_APP_URL=https://shokhriyorr-backend-project-of-shahriyor.kazi.rocks
ENV CORS_ORIGINS=https://shokhriyorr-backend-project-of-shahriyor.kazi.rocks
ENV EMAIL_VERIFICATION_TTL_MINUTES=1440
ENV PASSWORD_RESET_TTL_MINUTES=30
ENV STATS_JOB_REPEAT_MS=900000
ENV JWT_ACCESS_TTL_SECONDS=900
ENV JWT_REFRESH_TTL_DAYS=30

EXPOSE 80

CMD ["start-deployrocks.sh"]
