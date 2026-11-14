# Multi-stage Production Dockerfile for CareConnect Frontend (Next.js)
FROM oven/bun:1-alpine AS builder

WORKDIR /usr/src/app

COPY package.json bun.lock tsconfig.json next.config.ts eslint.config.mjs ./
RUN bun install --frozen-lockfile

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY proxy.ts ./proxy.ts

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=true

RUN bun run build

FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /usr/src/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
