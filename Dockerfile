# ==============================================================================
# QuantPulse Production All-in-One Multi-Stage Dockerfile (Root Entrypoint)
# Builds Native C++ Engine (Server + CLI) + Node.js Backend API
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Native C++ Engine Binaries (quantpulse_cli + quantpulse_server)
# ------------------------------------------------------------------------------
FROM ubuntu:24.04 AS cpp-builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    g++ \
    git \
    nlohmann-json3-dev \
    libgtest-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/cpp-engine
COPY cpp-engine/CMakeLists.txt ./
COPY cpp-engine/include/ ./include/
COPY cpp-engine/src/ ./src/
COPY cpp-engine/tests/ ./tests/
COPY cpp-engine/benchmarks/ ./benchmarks/

RUN rm -rf build build-release && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=20 -DBENCHMARK_ENABLE_TESTING=OFF && \
    cmake --build build --target quantpulse_cli quantpulse_server -j$(nproc)

# ------------------------------------------------------------------------------
# Stage 2: Node.js TypeScript Build
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS node-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig*.json ./
COPY backend/src/ ./src/

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runtime Image
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8000
ENV CPP_ENGINE_PORT=9000
ENV CPP_ENGINE_URL=http://127.0.0.1:9000
ENV QUANTPULSE_ENGINE_PATH=/usr/local/bin/quantpulse_cli
ENV QUANTPULSE_SERVER_PATH=/usr/local/bin/quantpulse_server

# Install runtime libraries needed by C++ binary and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy C++ binaries from cpp-builder
COPY --from=cpp-builder /app/cpp-engine/build/quantpulse_cli /usr/local/bin/quantpulse_cli
COPY --from=cpp-builder /app/cpp-engine/build/quantpulse_server /usr/local/bin/quantpulse_server
RUN chmod +x /usr/local/bin/quantpulse_cli /usr/local/bin/quantpulse_server

# Copy entrypoint script
COPY devops/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy backend dependencies and compiled JS
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=node-builder /app/backend/dist ./dist

# Use standard non-root node user
USER node

EXPOSE 8000 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
