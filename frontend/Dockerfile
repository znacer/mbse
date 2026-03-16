# ─── MBSE Explorer — Dockerfile ───────────────────────────────────────────────
#
# Multi-stage build:
#   1. builder  – Bun (Debian slim) installs deps and runs `vite build`
#   2. runner   – nginx Alpine serves the compiled static assets
#
# Build context must be the repo root (mbse/), not the frontend sub-directory,
# because the real UAF.xmi lives in resources/ while public/UAF.xmi is a
# symlink that would be dangling inside an isolated frontend-only context.
#
#   docker build -f frontend/Dockerfile -t mbse-explorer .
#
# Cross-compile for Raspberry Pi (arm64):
#
#   docker buildx build --platform linux/arm64 -f frontend/Dockerfile -t mbse-explorer .
#
# NOTE: oven/bun:1 (Debian slim) is used instead of oven/bun:1-alpine because
# the Alpine (musl libc) variant has known issues on linux/arm64. The runner
# stage still uses nginx:alpine since bun is not present there at all.
#
# ──────────────────────────────────────────────────────────────────────────────

# BUILDPLATFORM = the machine running the build (e.g. linux/amd64)
ARG BUILDPLATFORM


# ── Stage 1: build ────────────────────────────────────────────────────────────
# Always run the build on the *host* platform so bun executes natively.
# The output is pure JS/CSS/HTML, so it runs on any target regardless.
FROM --platform=$BUILDPLATFORM oven/bun:1 AS builder

WORKDIR /app

# Copy manifest files first so bun install is cached as a separate layer and
# is only re-run when dependencies actually change.
COPY frontend/package.json frontend/package-lock.json ./

RUN bun install --frozen-lockfile

# Copy the rest of the frontend source (includes public/UAF.xmi as a symlink).
COPY frontend/ ./

# Resolve the symlink: remove it and replace it with the real file.
# Docker COPY preserves symlinks as-is, so public/UAF.xmi would otherwise
# point to ../../resources/UAF.xmi which does not exist inside the container.
RUN rm public/UAF.xmi
COPY resources/UAF.xmi ./public/UAF.xmi

# Produce the production bundle.
RUN bun run build


# ── Stage 2: serve ────────────────────────────────────────────────────────────
# buildx automatically pulls nginx for the target platform; no --platform pin
# needed. We avoid any RUN instruction here so no shell execution is required
# under QEMU emulation, which is unreliable on some host setups.
FROM nginx:alpine AS runner

# Overwrite the default config directly — no RUN rm needed.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled assets from the builder stage.
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck: verify nginx is up and serving.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO /dev/null http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
