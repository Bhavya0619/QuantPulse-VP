# ==============================================================================
# QuantPulse C++20 Analytics Engine - Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Test Environment
# ------------------------------------------------------------------------------
FROM ubuntu:24.04 AS builder

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

WORKDIR /app

# Copy CMake files and C++ engine source
COPY cpp-engine/CMakeLists.txt ./cpp-engine/
COPY cpp-engine/include/ ./cpp-engine/include/
COPY cpp-engine/src/ ./cpp-engine/src/
COPY cpp-engine/tests/ ./cpp-engine/tests/
COPY cpp-engine/benchmarks/ ./cpp-engine/benchmarks/

# Configure and Build in Release mode
WORKDIR /app/cpp-engine
RUN cmake -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_STANDARD=20 \
    -DBENCHMARK_ENABLE_TESTING=OFF \
    -DBENCHMARK_ENABLE_GTEST_TESTS=OFF

RUN cmake --build build --config Release -j$(nproc)

# Run test suite during build stage to ensure binary correctness
RUN ctest --test-dir build --output-on-failure

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=9000

RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r quantpulse && useradd -r -g quantpulse -m -s /bin/bash quantpulse

# Copy compiled production binaries from builder
COPY --from=builder /app/cpp-engine/build/quantpulse_server /usr/local/bin/quantpulse_server
COPY --from=builder /app/cpp-engine/build/quantpulse_cli /usr/local/bin/quantpulse_cli
COPY --from=builder /app/cpp-engine/build/quantpulse_demo /usr/local/bin/quantpulse_demo
COPY --from=builder /app/cpp-engine/build/quantpulse_benchmarks /usr/local/bin/quantpulse_benchmarks

RUN chmod +x /usr/local/bin/quantpulse_*

USER quantpulse
WORKDIR /home/quantpulse

EXPOSE 9000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-9000}/health || exit 1

ENTRYPOINT ["/usr/local/bin/quantpulse_server"]
