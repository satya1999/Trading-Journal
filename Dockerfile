# Build stage
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm@10.10.0

WORKDIR /app

# Copy workspace configuration and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy package files for workspace packages to install dependencies first (caching layer)
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY tools/dev-db/package.json ./tools/dev-db/
COPY tools/ea-simulator/package.json ./tools/ea-simulator/

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Build packages/shared first, then apps/api
WORKDIR /app
RUN pnpm --filter @trademind/shared build
RUN pnpm --filter @trademind/api build

# Prune devDependencies for a smaller production image
RUN pnpm install --prod --frozen-lockfile

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy runtime packages and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000

# Run prisma migration deployment and start the server
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
