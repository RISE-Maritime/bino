#!/usr/bin/env bash
# Wrapper: ensures every spike command runs on Node 22 (the headless-gl
# prebuilt-friendly version) inside this devcontainer. Spike-only.
set -euo pipefail
source /usr/local/share/nvm/nvm.sh
nvm use 22 >/dev/null
cd "$(dirname "$0")"
exec "$@"
