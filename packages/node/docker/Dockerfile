# @bino/node Dockerfile
#
# Build context = repository root (so pnpm-workspace + packages/* are visible):
#   docker build -t bino-node -f packages/node/docker/Dockerfile .
#
# Run with a scenario file mounted in:
#   docker run --rm -v "$PWD/scenarios:/scenarios" bino-node \
#     /scenarios/v01_smoke.yaml
#
# Hardware GPU on a host with NVIDIA Container Toolkit:
#   docker run --rm --gpus all \
#     -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility,display \
#     -v "$PWD/scenarios:/scenarios" bino-node /scenarios/v01_smoke.yaml
# Without --gpus, the @kmamal/gl prebuilt's bundled software rasterizer
# takes over. v0.1 acceptance is software-rendering throughput.

FROM node:22.22.2-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Runtime libraries the @kmamal/gl prebuilt's bundled ANGLE links
# against (verified via ldd of webgl.node), plus Xvfb to provide the
# X display ANGLE attaches to.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libx11-6 libxext6 libxcb1 libxau6 libxdmcp6 libbsd0 libmd0 \
      xvfb xauth \
      ca-certificates \
   && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Install deps from manifests first so the layer caches across source edits.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/node/package.json ./packages/node/
RUN pnpm install --frozen-lockfile

# Source + build.
COPY packages/core ./packages/core
COPY packages/node ./packages/node
RUN pnpm -r build

COPY packages/node/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD []
