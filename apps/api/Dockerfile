# ─── Stage 1: Build ───
# ใช้ Debian (slim) แทน Alpine — Prisma ต้องการ OpenSSL libraries ที่ Alpine ขาด
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

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
FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy the entire built monorepo — pnpm uses symlinks across workspaces
# so we need node_modules of every workspace, not just root
COPY --from=builder /app ./

ENV NODE_ENV=production
EXPOSE 4000

# Run migration then start
CMD sh -c "pnpm --filter @grade/database exec prisma migrate deploy && node apps/api/dist/main"
