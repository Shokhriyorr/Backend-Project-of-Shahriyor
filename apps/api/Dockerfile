FROM node:22-alpine

WORKDIR /workspace/apps/api

COPY apps/api/package.json apps/api/package-lock.json apps/api/prisma.config.ts ./
COPY database /workspace/database
COPY migrations /workspace/migrations
RUN npm ci

COPY openapi.yaml /workspace/openapi.yaml
COPY apps/api/scripts ./scripts
COPY apps/api/src ./src

# Prisma generate only needs a syntactically valid URL at image build time.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_db
RUN npm run prisma:generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
