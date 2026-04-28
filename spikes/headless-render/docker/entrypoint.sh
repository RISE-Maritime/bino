#!/usr/bin/env bash
# Spike entrypoint: starts Xvfb so the gl-based candidates can attach
# their X11-backed ANGLE context, sets DISPLAY, then runs whatever
# command was passed in.
#
# Tested with `node run-all.mjs` and individual `node candidates/*`.

set -e

DISPLAY_NUM="${DISPLAY_NUM:-99}"
SCREEN="${SCREEN:-0}"
RES="${RES:-1920x1080x24}"

Xvfb ":${DISPLAY_NUM}" -screen "${SCREEN}" "${RES}" -nolisten tcp &
XVFB_PID=$!

# Wait for Xvfb to be ready. xdpyinfo is in mesa-utils. Bail after a
# few seconds rather than hanging — the gl package will return null on
# its own and the bench will record the failure.
export DISPLAY=":${DISPLAY_NUM}"
for i in $(seq 1 30); do
  if xdpyinfo >/dev/null 2>&1; then break; fi
  sleep 0.2
done

cleanup() {
  kill -TERM "${XVFB_PID}" 2>/dev/null || true
  wait "${XVFB_PID}" 2>/dev/null || true
}
trap cleanup EXIT

exec "$@"
