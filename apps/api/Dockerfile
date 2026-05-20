# ─── Stage 1: Build ───
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy monorepo files needed for install
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy sources
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter @grade/database exec prisma generate

# Build shared + api
RUN pnpm --filter @grade/shared build
RUN pnpm --filter @grade/api build

# ─── Stage 2: Runtime ───
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy only what's needed
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

ENV NODE_ENV=production
EXPOSE 4000

# Run migration then start
CMD sh -c "pnpm --filter @grade/database exec prisma migrate deploy && node apps/api/dist/main"
