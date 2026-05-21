FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY openapi.yaml ./openapi.yaml
COPY scripts ./scripts
COPY src ./src

# Prisma generate only needs a syntactically valid URL at image build time.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_db
RUN npm run prisma:generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
