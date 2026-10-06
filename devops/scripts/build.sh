#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "📦 Building QuantPulse Production Docker Images..."

echo "🔨 [1/3] Building C++ Engine Image..."
docker build -t quantpulse-cpp-engine:latest -f "${ROOT_DIR}/devops/docker/cpp-engine/Dockerfile" "${ROOT_DIR}"

echo "🔨 [2/3] Building Backend Image..."
docker build -t quantpulse-backend:latest -f "${ROOT_DIR}/devops/docker/backend/Dockerfile" "${ROOT_DIR}"

echo "🔨 [3/3] Building Frontend Image..."
docker build -t quantpulse-frontend:latest -f "${ROOT_DIR}/devops/docker/frontend/Dockerfile" "${ROOT_DIR}"

echo "✅ All Docker images built successfully!"
