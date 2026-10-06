#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "🚀 Launching QuantPulse Production Cluster..."
docker compose -f "${ROOT_DIR}/devops/compose/docker-compose.prod.yml" up -d --build "$@"

echo "⏳ Waiting for services to become healthy..."
sleep 5
"${SCRIPT_DIR}/healthcheck.sh"

echo "✅ QuantPulse Production Stack is live!"
