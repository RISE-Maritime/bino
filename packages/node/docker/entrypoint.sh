#!/usr/bin/env bash
# @bino/node container entrypoint.
#
# @kmamal/gl's prebuilt ANGLE attaches an X11 backend, so it needs a
# display to bind to even on a fully-headless node. Xvfb gives it one.
# Without this the GL context comes back null and the runner fails fast
# in service.ts.

set -e

DISPLAY_NUM="${DISPLAY_NUM:-99}"
SCREEN="${SCREEN:-0}"
RES="${RES:-1920x1080x24}"

Xvfb ":${DISPLAY_NUM}" -screen "${SCREEN}" "${RES}" -nolisten tcp &
XVFB_PID=$!
export DISPLAY=":${DISPLAY_NUM}"

# Wait briefly for Xvfb to come up; if it never does, fall through —
# @kmamal/gl will surface its own error.
for _ in $(seq 1 30); do
  if [ -e "/tmp/.X11-unix/X${DISPLAY_NUM}" ]; then break; fi
  sleep 0.1
done

cleanup() {
  kill -TERM "${XVFB_PID}" 2>/dev/null || true
  wait "${XVFB_PID}" 2>/dev/null || true
}
trap cleanup EXIT

# Treat all positional args as CLI args (scenario path, --zenoh, etc.).
# To get a debug shell instead: `docker run --entrypoint bash -it bino-node`.
exec node /app/packages/node/dist/cli.js "$@"
