# API image (repo root). Used by DeployRocks / Dokku for the api service.
FROM node:22-bookworm-slim AS build

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

FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl

WORKDIR /workspace/apps/api

COPY --from=build /workspace/apps/api/node_modules ./node_modules
COPY --from=build /workspace/apps/api/package.json /workspace/apps/api/package-lock.json /workspace/apps/api/prisma.config.ts ./
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/migrations /workspace/migrations
COPY --from=build /workspace/openapi.yaml /workspace/openapi.yaml
COPY --from=build /workspace/apps/api/scripts ./scripts
COPY --from=build /workspace/apps/api/src ./src

ENV NODE_ENV=production
ENV PORT=5000
ENV DOCKER_BUILD=true
EXPOSE 5000

CMD ["sh", "-c", "npm run prisma:deploy && npm run seed:admin && npm run seed:demo && node src/index.js"]
