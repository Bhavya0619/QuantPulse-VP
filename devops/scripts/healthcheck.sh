#!/usr/bin/env bash
set -euo pipefail

TARGET_HOST="${1:-localhost}"
TARGET_PORT="${2:-8000}"

echo "🩺 Inspecting QuantPulse Health at http://${TARGET_HOST}:${TARGET_PORT}/health..."

HTTP_CODE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" "http://${TARGET_HOST}:${TARGET_PORT}/health" || echo "000")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Health Endpoint Response (HTTP $HTTP_CODE):"
    cat /tmp/health_response.json
    echo ""
else
    echo "❌ Health check failed with HTTP status: $HTTP_CODE"
    if [ -f /tmp/health_response.json ]; then
        cat /tmp/health_response.json
        echo ""
    fi
    exit 1
fi
