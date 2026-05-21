FROM node:22-alpine

RUN apk add --no-cache openssl

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

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/index.js"]
