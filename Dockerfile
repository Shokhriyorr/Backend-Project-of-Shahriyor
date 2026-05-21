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
ENV PORT=80
ENV BACKEND_PORT=5000
ENV API_HOST=127.0.0.1
ENV API_PORT=5000
ENV DOCKER_BUILD=true

EXPOSE 80

CMD ["start-deployrocks.sh"]
