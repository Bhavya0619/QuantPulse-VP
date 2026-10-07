#!/bin/sh
set -e

# Default CPP_ENGINE_URL to local C++ HTTP endpoint if unset
TARGET_URL="${CPP_ENGINE_URL:-http://127.0.0.1:9000}"

case "$TARGET_URL" in
  *127.0.0.1*|*localhost*)
    if [ -x /usr/local/bin/quantpulse_server ]; then
      SERVER_PORT="${CPP_ENGINE_PORT:-9000}"
      echo "[STARTUP] Launching native C++ Dragon HTTP Server on port ${SERVER_PORT} in background..."
      /usr/local/bin/quantpulse_server --port "${SERVER_PORT}" &
      sleep 1
    fi
    ;;
esac

echo "[STARTUP] Launching QuantPulse Backend API on port ${PORT:-8000}..."
exec node dist/server.js

