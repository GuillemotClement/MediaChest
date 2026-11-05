#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
exec docker compose --env-file "${PROD_ENV_FILE:-.env.prod}" -f compose.prod.yml "$@"
