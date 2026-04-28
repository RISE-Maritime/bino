# Spike Dockerfile: builds a clean, public-base image that runs the
# headless-render bench. Targets Ubuntu 24.04 so the (optional) WebGPU
# candidate's GLIBCXX_3.4.32 requirement is satisfiable.
#
# Run on a host with the NVIDIA Container Toolkit:
#   docker build -t bino-spike-headless -f docker/Dockerfile .
#   docker run --rm --gpus all \
#     -e NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility \
#     -v "$PWD/out:/spike/out" \
#     bino-spike-headless
#
# Without --gpus / without graphics caps the bench falls back to Mesa
# llvmpipe / SwiftShader (software). That still proves the path
# functions; the FPS numbers won't reflect hardware.

FROM nvidia/cuda:13.0.3-runtime-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=graphics,compute,utility

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg xz-utils \
      libegl1 libgl1 libgles2 libosmesa6 libglu1-mesa \
      libgl-dev libegl-dev libgles-dev libosmesa6-dev \
      libxi6 libxext6 libxrandr2 libxcursor1 libxdamage1 libxcomposite1 \
      libxfixes3 libxss1 libxkbcommon0 libcups2t64 libatspi2.0-0 libdbus-1-3 \
      libnss3 libdrm2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 \
      libgtk-3-0t64 fonts-liberation \
      mesa-utils mesa-vulkan-drivers libvulkan1 vulkan-tools \
      xvfb \
      python3 build-essential \
   && rm -rf /var/lib/apt/lists/*

# Node 22 (matches the version the spike was developed against). Use the
# NodeSource tarball — keeps the image self-contained.
RUN curl -fsSL https://nodejs.org/dist/v22.22.2/node-v22.22.2-linux-x64.tar.xz \
      | tar -xJ -C /opt \
   && ln -s /opt/node-v22.22.2-linux-x64/bin/node /usr/local/bin/node \
   && ln -s /opt/node-v22.22.2-linux-x64/bin/npm  /usr/local/bin/npm \
   && ln -s /opt/node-v22.22.2-linux-x64/bin/npx  /usr/local/bin/npx \
   && node --version && npm --version

WORKDIR /spike

# Install spike deps separately from source so the layer caches.
COPY package.json package-lock.json* ./
RUN npm install --include=optional --no-audit --no-fund --foreground-scripts \
   && npx playwright install chromium

COPY shared ./shared
COPY candidates ./candidates
COPY run-all.mjs ./

# The gl / @kmamal/gl npm packages dlopen libX11 (their prebuilt ANGLE
# uses an X11 backend) so they need a display to attach to. Xvfb gives
# them one even on a headless node. Without this they return a null
# context.
COPY docker/entrypoint.sh /spike/entrypoint.sh
RUN chmod +x /spike/entrypoint.sh

RUN mkdir -p /spike/out
ENTRYPOINT ["/spike/entrypoint.sh"]
CMD ["node", "run-all.mjs"]
