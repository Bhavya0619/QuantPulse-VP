#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "🚀 Starting QuantPulse Development Environment..."
docker compose -f "${ROOT_DIR}/devops/compose/docker-compose.dev.yml" up --build "$@"
