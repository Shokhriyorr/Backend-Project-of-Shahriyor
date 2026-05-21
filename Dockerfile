# API image (repo root). Used by DeployRocks / Dokku for the api service.
FROM node:22-alpine

WORKDIR /workspace/apps/api

COPY apps/api/package.json apps/api/package-lock.json apps/api/prisma.config.ts ./
COPY database /workspace/database
COPY migrations /workspace/migrations
RUN npm ci

COPY openapi.yaml /workspace/openapi.yaml
COPY apps/api/scripts ./scripts
COPY apps/api/src ./src

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_db
RUN npm run prisma:generate

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["sh", "-c", "npm run prisma:deploy && npm run seed:admin && npm run seed:demo && node src/index.js"]
