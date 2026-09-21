# syntax=docker/dockerfile:1

# --- Stage 1: build the client -------------------------------------------------
# Debian slim (not alpine) because better-sqlite3 compiles native code; the build
# tools below are only needed when no prebuilt binary matches the image.
FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@11.3.0

WORKDIR /app

# Workspace manifests first, so the dependency layer is cached across source edits.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile

# Build the React client. An empty VITE_API_URL makes the bundle call its own
# origin instead of a hardcoded host, which is what the single-container image needs.
COPY server ./server
COPY client ./client
RUN VITE_API_URL= pnpm --filter client build

# --- Stage 2: runtime ----------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NODE_ENV=production

# Build tools are needed only if better-sqlite3 has to compile from source; they
# are purged right after the production install.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && npm install -g pnpm@11.3.0

WORKDIR /app

# The workspace manifests are required for pnpm to resolve the `--filter server`.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile --prod --filter server \
 && apt-get purge -y --auto-remove python3 make g++ \
 && rm -rf /var/lib/apt/lists/* /pnpm/store

COPY server/src ./server/src
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server

EXPOSE 3000
CMD ["node", "src/server.js"]
