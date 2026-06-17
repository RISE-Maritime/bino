#!/usr/bin/env bash
# @bino/node container entrypoint.
#
# @kmamal/gl's prebuilt ANGLE attaches an X11 backend, so it needs a display
# even on a fully headless host. Xvfb provides one; without it the GL context
# comes back null and the service fails fast in headless-gl.ts.
#
# All positional args are forwarded to bino-node (scenario path, --zenoh,
# --workers, ...). For a debug shell: `docker run --entrypoint bash -it bino-node`.
set -e

DISPLAY_NUM="${DISPLAY_NUM:-99}"
SCREEN_RES="${SCREEN_RES:-1920x1080x24}"

Xvfb ":${DISPLAY_NUM}" -screen 0 "${SCREEN_RES}" -nolisten tcp &
XVFB_PID=$!
export DISPLAY=":${DISPLAY_NUM}"

# Wait briefly for the display socket; fall through if it never appears
# (@kmamal/gl will surface its own error).
for _ in $(seq 1 50); do
  [ -e "/tmp/.X11-unix/X${DISPLAY_NUM}" ] && break
  sleep 0.1
done

cleanup() {
  kill -TERM "${XVFB_PID}" 2>/dev/null || true
  wait "${XVFB_PID}" 2>/dev/null || true
}
trap cleanup EXIT

exec node /app/dist/cli.js "$@"
