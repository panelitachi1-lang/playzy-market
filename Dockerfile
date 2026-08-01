# ── Stage 1: deps + build ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy all manifests first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json                    ./lib/db/
COPY lib/api-zod/package.json               ./lib/api-zod/
COPY lib/api-client-react/package.json      ./lib/api-client-react/
COPY lib/api-spec/package.json              ./lib/api-spec/
COPY artifacts/api-server/package.json      ./artifacts/api-server/
COPY artifacts/pleer/package.json           ./artifacts/pleer/

# Install all deps (dev included — needed for build)
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Build Vite frontend (PORT and BASE_PATH required by vite.config.ts)
ENV PORT=3000
ENV BASE_PATH=/
ENV NODE_ENV=production

RUN pnpm --filter "@workspace/pleer" build

# Build Express backend (esbuild bundles everything)
RUN pnpm --filter "@workspace/api-server" build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests for prod install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json                    ./lib/db/
COPY lib/api-zod/package.json               ./lib/api-zod/
COPY lib/api-client-react/package.json      ./lib/api-client-react/
COPY lib/api-spec/package.json              ./lib/api-spec/
COPY artifacts/api-server/package.json      ./artifacts/api-server/
COPY artifacts/pleer/package.json           ./artifacts/pleer/

# Production deps only (pg, drizzle-orm, etc.)
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/artifacts/api-server/dist  ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/pleer/dist        ./artifacts/pleer/dist

# Persistent dirs for user-uploaded files
RUN mkdir -p ./artifacts/api-server/uploads/receipts \
             ./artifacts/api-server/uploads/avatars

# Runtime env
ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_PATH=/

EXPOSE 3000

WORKDIR /app/artifacts/api-server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
