FROM node:22-alpine

WORKDIR /workspace/server

COPY server/package.json server/package-lock.json server/prisma.config.ts ./
COPY server/prisma ./prisma
COPY migrations ../migrations
RUN npm ci

COPY openapi.yaml ../openapi.yaml
COPY server/scripts ./scripts
COPY server/src ./src

# Prisma generate only needs a syntactically valid URL at image build time.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_db
RUN npm run prisma:generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
