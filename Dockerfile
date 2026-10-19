# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9

# Copy workspace config and lockfile first (better layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/sync-server/package.json apps/sync-server/package.json
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/package.json

RUN pnpm install --frozen-lockfile

# Copy sync server source
COPY apps/sync-server/ apps/sync-server/

WORKDIR /app/apps/sync-server
RUN pnpm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/apps/sync-server/package.json apps/sync-server/package.json
COPY --from=builder /app/packages/typescript-config/ packages/typescript-config/
COPY --from=builder /app/packages/eslint-config/package.json packages/eslint-config/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/sync-server/dist apps/sync-server/dist

# Data volume for SQLite persistence
RUN mkdir -p /app/apps/sync-server/data
VOLUME /app/apps/sync-server/data

ENV PORT=3199
EXPOSE 3199

WORKDIR /app/apps/sync-server
CMD ["node", "dist/index.js"]
