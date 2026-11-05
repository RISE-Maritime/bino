# syntax=docker/dockerfile:1
#
# Bino container images. Two targets share one builder:
#
#   docker build --target node   -t bino-node   .
#   docker build --target viewer -t bino-viewer .
#
# - node   : headless @bino/node service, software GL (Xvfb + bundled
#            SwiftShader). Runs anywhere, no GPU. A GPU variant is deferred.
# - viewer : static @bino/viewer site served by nginx (renders in the
#            browser; no Node/GL on the server).

# ───────────────────────── builder ─────────────────────────
# Builds the Rust→WASM kernels (gitignored, so they MUST be built here)
# and the TypeScript/JS for every package.
FROM node:22.22.2-bookworm AS builder
ENV DEBIAN_FRONTEND=noninteractive

# Headers @kmamal/gl's native binding links against (-lX11 -lXi -lXext);
# the full node image already provides g++/make/python3.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates \
      libx11-dev libxi-dev libxext-dev \
   && rm -rf /var/lib/apt/lists/*

# Rust toolchain + wasm target for the kernels.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --profile minimal --default-toolchain stable --target wasm32-unknown-unknown
ENV PATH="/root/.cargo/bin:${PATH}"

# wasm-bindgen CLI, pinned to the kernels' wasm-bindgen version. Prebuilt
# binary to avoid a multi-minute source compile — for the architecture being
# built, so the image builds on arm64 (Apple Silicon, Graviton) as well as
# amd64. BuildKit sets TARGETARCH; the release names the same machines by
# their triples.
ARG TARGETARCH
RUN case "${TARGETARCH:-amd64}" in \
      amd64) triple=x86_64-unknown-linux-musl ;; \
      arm64) triple=aarch64-unknown-linux-musl ;; \
      *) echo "no prebuilt wasm-bindgen for ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/rustwasm/wasm-bindgen/releases/download/0.2.120/wasm-bindgen-0.2.120-${triple}.tar.gz" \
      | tar -xz -C /usr/local/bin --strip-components=1 --wildcards '*/wasm-bindgen'

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Dependency layer first so it caches across source-only changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/node/package.json ./packages/node/
COPY packages/viewer/package.json ./packages/viewer/
RUN pnpm install --frozen-lockfile

# Source, then build kernels (wasm) before the TS/vite builds that consume them.
COPY kernels ./kernels
COPY packages ./packages
RUN pnpm kernels:build && pnpm -r build

# Self-contained production deployment of the node service (flattens the
# pnpm workspace, including @bino/core + its wasm, into one dir).
RUN pnpm --filter @bino/node deploy --prod /deploy

# ───────────────────────── node (headless service) ─────────────────────────
FROM node:22.22.2-bookworm-slim AS node
ENV DEBIAN_FRONTEND=noninteractive

# Runtime libs @kmamal/gl's prebuilt ANGLE links against, Xvfb (the X
# display its X11 backend attaches to), and tini for PID-1 signal/zombie
# handling.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libx11-6 libxi6 libxext6 libxcb1 libxau6 libxdmcp6 libbsd0 libmd0 \
      xvfb xauth ca-certificates tini \
   && rm -rf /var/lib/apt/lists/* \
   && useradd --system --create-home --uid 10001 bino \
   && mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

WORKDIR /app
COPY --from=builder /deploy ./
COPY docker/node-entrypoint.sh /usr/local/bin/bino-entrypoint
RUN chmod +x /usr/local/bin/bino-entrypoint

# Terrain is fetched once (Overpass + GMRT) and cached here; mount a volume
# at /cache to make it persist / pre-seed it for offline runs.
ENV BINO_TERRAIN_CACHE=/cache/terrain
RUN mkdir -p /cache && chown bino /cache

USER bino
ENTRYPOINT ["tini", "--", "/usr/local/bin/bino-entrypoint"]
# Args go to bino-node: `docker run bino-node /scenarios/foo.yaml --zenoh ws://...`
CMD []

# ───────────────────────── viewer (static site) ─────────────────────────
FROM nginx:1.27-alpine AS viewer
COPY --from=builder /app/packages/viewer/build /usr/share/nginx/html
COPY docker/viewer-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
