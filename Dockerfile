# Multi-stage Production Dockerfile for CareConnect API
# Stage 1: Build Application
FROM oven/bun:1-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package.json bun.lock tsconfig*.json nest-cli.json ./

# Install dependencies (including devDependencies required for compilation)
RUN bun install --frozen-lockfile

# Copy source code and assets
COPY src ./src

# Compile NestJS TypeScript application into dist/
RUN bun run build

# Stage 2: Production Runtime
FROM node:24-alpine AS runner

WORKDIR /usr/src/app

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests
COPY package.json bun.lock ./

# Install only production dependencies using npm/node
RUN npm install --omit=dev --ignore-scripts

# Copy compiled application from builder
COPY --from=builder /usr/src/app/dist ./dist

# Create uploads directory for document storage
RUN mkdir -p uploads/documents && chown -R node:node /usr/src/app

# Run as non-privileged node user for security
USER node

EXPOSE 3000

# Start production server
CMD ["node", "dist/main.js"]
