FROM node:22-alpine AS deps
WORKDIR /app
# Зеркало npm. По умолчанию официальный реестр; в РФ он недоступен — тогда
# передаём npm-зеркало через build-arg (см. deploy/rf-setup.sh).
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
# --ignore-scripts: пропускаем postinstall (prisma generate), потому что
# prisma/schema.prisma ещё не скопирована. Генерация делается в builder-стадии.
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
# Пусто = качать движки Prisma с официального CDN; в РФ передаём зеркало.
ARG PRISMA_ENGINES_MIRROR=
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
ENV PRISMA_ENGINES_MIRROR=$PRISMA_ENGINES_MIRROR
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache openssl libc6-compat postgresql-client
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
# server.ts -> src/server/ws-handler.ts (через tsx при старте), а ws-handler
# импортирует @/lib/auth и @/lib/prisma — поэтому копируем весь src, не только server.
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
USER nextjs
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
