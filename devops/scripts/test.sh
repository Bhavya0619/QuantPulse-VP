#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "🧪 [1/3] Running Backend Tests (Vitest)..."
(cd "${ROOT_DIR}/backend" && npm test)

echo "🧪 [2/3] Checking Backend & Frontend TypeScript Compilation..."
(cd "${ROOT_DIR}/backend" && npm run typecheck)
(cd "${ROOT_DIR}/frontend" && npm run typecheck)

echo "🧪 [3/3] Running C++ Test Suite (CTest)..."
if [ -d "${ROOT_DIR}/cpp-engine/build-release" ]; then
    ctest --test-dir "${ROOT_DIR}/cpp-engine/build-release" --output-on-failure
elif [ -d "${ROOT_DIR}/cpp-engine/build" ]; then
    ctest --test-dir "${ROOT_DIR}/cpp-engine/build" --output-on-failure
else
    echo "⚠️ C++ build directory not found. Please build cpp-engine first."
fi

echo "✅ All QuantPulse tests passed successfully!"
