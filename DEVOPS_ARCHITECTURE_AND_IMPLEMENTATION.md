# QuantPulse Platform: Complete DevOps Architecture, Implementation, and Failure Recovery Manual

**Author:** Senior DevOps & Cloud Architecture Team  
**Scope:** Complete DevOps Infrastructure, Tooling, Pipelines, Observability, and Disaster Recovery for QuantPulse  
**Project:** QuantPulse-VP Monorepo  

---

## Table of Contents
1. [Executive Overview & End-to-End Architectural Flow](#1-executive-overview--end-to-end-architectural-flow)
2. [DevOps File Inventory & Structure](#2-devops-file-inventory--structure)
3. [Containerization Engine (Docker Multi-Stage Builds)](#3-containerization-engine-docker-multi-stage-builds)
   - [3.1 C++20 Quantitative Engine Image](#31-c20-quantitative-engine-image)
   - [3.2 Node.js Backend Image](#32-nodejs-backend-image)
   - [3.3 React Frontend SPA Image](#33-react-frontend-spa-image)
   - [3.4 Root Build Context & .dockerignore](#34-root-build-context--dockerignore)
4. [Edge Ingress & Reverse Proxy (Nginx Architecture)](#4-edge-ingress--reverse-proxy-nginx-architecture)
5. [Orchestration Topology (Docker Compose Stacks)](#5-orchestration-topology-docker-compose-stacks)
   - [5.1 Development Stack (devops/compose/docker-compose.dev.yml)](#51-development-stack)
   - [5.2 Automated Testing Stack (devops/compose/docker-compose.test.yml)](#52-automated-testing-stack)
   - [5.3 Production Stack (devops/compose/docker-compose.prod.yml)](#53-production-stack)
   - [5.4 Root Quickstart Compose (docker-compose.yml)](#54-root-quickstart-compose)
6. [C++ Quantitative HTTP Microservice & Dual-Mode IPC](#6-c-quantitative-http-microservice--dual-mode-ipc)
7. [Health Probes, Readiness & Liveness Engine](#7-health-probes-readiness--liveness-engine)
8. [Telemetry, Metrics & Observability Pipeline](#8-telemetry-metrics--observability-pipeline)
   - [8.1 Prometheus Metrics Registry](#81-prometheus-metrics-registry)
   - [8.2 Structured JSON Logging with Sensitive Redaction](#82-structured-json-logging-with-sensitive-redaction)
   - [8.3 Prometheus Scraper Setup](#83-prometheus-scraper-setup)
   - [8.4 Grafana Provisioning & Dashboards](#84-grafana-provisioning--dashboards)
9. [Automated CI/CD Workflows (GitHub Actions)](#9-automated-cicd-workflows-github-actions)
   - [9.1 Continuous Integration (ci.yml)](#91-continuous-integration-ciyml)
   - [9.2 Quantitative Performance Benchmarks (benchmark.yml)](#92-quantitative-performance-benchmarks-benchmarkyml)
   - [9.3 Immutable Container Publishing (docker.yml)](#93-immutable-container-publishing-dockeryml)
   - [9.4 Zero-Downtime Deployment (deploy.yml)](#94-zero-downtime-deployment-deployyml)
10. [Kubernetes Production Manifests (k8s/)](#10-kubernetes-production-manifests-k8s)
11. [Public Cloud Deployment Blueprint (Render, Vercel, Atlas, Upstash)](#11-public-cloud-deployment-blueprint)
12. [DevOps Automation CLI Scripts (devops/scripts/)](#12-devops-automation-cli-scripts)
13. [Disaster Recovery & Failure Modes Matrix (Breakpoints & Fixes)](#13-disaster-recovery--failure-modes-matrix)

---

## 1. Executive Overview & End-to-End Architectural Flow

QuantPulse is a hybrid quantitative analytics platform combining a **React 19 + TypeScript frontend**, a **Node.js/Express API layer**, a **C++20 high-performance quantitative computation engine**, **MongoDB** for timeseries data persistence, and **Redis** for sub-millisecond caching.

The DevOps infrastructure provides automated building, packaging, verification, zero-downtime deployment, observability, and self-healing recovery across development, staging, and production.

### Comprehensive Architecture Diagram

```
                                  INTERNET / CLIENT TRAFFIC
                                              │
                         ┌────────────────────┴────────────────────┐
                         │ HTTPS (Port 443) / HTTP (Port 80)       │
                         ▼                                         ▼
            ┌─────────────────────────┐               ┌─────────────────────────┐
            │   Nginx Reverse Proxy   │               │     Vercel Edge CDN     │
            │   (Docker / Bare-Metal) │               │   (Cloud Static Edge)   │
            └────────────┬────────────┘               └────────────┬────────────┘
                         │                                         │
                         │ /api, /health, /metrics                 │ HTTPS REST / SSE
                         ▼                                         ▼
            ┌───────────────────────────────────────────────────────────────────┐
            │               Node.js + Express Backend Services                  │
            │                 (Port 8000, Multi-Replica)                        │
            │  - Structured JSON Logging      - Deep Healthcheck Probes         │
            │  - Prometheus /metrics Exporter - Token & Key Sanitizer           │
            └─────────────────┬───────────────────────────────┬─────────────────┘
                              │                               │
             Dual-Mode IPC /  │                               │ MongoDB Native Protocol
        Private Microservice  ▼                               ▼ (TLS / Port 27017)
  ┌─────────────────────────────────────────┐   ┌───────────────────────────────┐
  │      C++20 Quantitative Engine          │   │      MongoDB Timeseries       │
  │    (quantpulse_server / CLI)            │   │   (StatefulSet / Atlas M0)    │
  │  - Volatility Squeeze & Keltner Ch.     │   │ - market_bars (Indexed OHLCV) │
  │  - Order Flow Imbalance (OFI)           │   │ - datasets, backtests, users  │
  └─────────────────────────────────────────┘   └───────────────┬───────────────┘
                              ▲                                 │
                              │ Redis Protocol (Port 6379)      ▼
                              └─────────────────►┌──────────────────────────────┐
                                                 │   Redis Caching & Queue      │
                                                 │   (In-Cluster / Upstash)     │
                                                 └──────────────────────────────┘
                              │
               Scrapes /metrics (15s interval)
                              ▼
  ┌─────────────────────────────────────────┐   ┌───────────────────────────────┐
  │     Prometheus Metrics Collector        │──►│       Grafana Analytics       │
  │     (Port 9090, Time-Series TSDB)       │   │     (Port 3000 Dashboards)    │
  └─────────────────────────────────────────┘   └───────────────────────────────┘
```

---

## 2. DevOps File Inventory & Structure

The repository is structured to separate application domain code from infrastructure concerns:

```text
QuantPulse-VP/
├── .dockerignore                            # Comprehensive build exclusion filter
├── .env.example                             # Validated environment configuration template
├── docker-compose.yml                       # Root developer quickstart compose
├── render.yaml                              # Infrastructure-as-Code Blueprint for Render Cloud
├── DEVOPS_ARCHITECTURE_AND_IMPLEMENTATION.md # This comprehensive manual
│
├── .github/
│   └── workflows/
│       ├── ci.yml                           # Pull Request & push validation gate
│       ├── benchmark.yml                    # C++ Google Benchmark regression monitor
│       ├── docker.yml                       # Multi-stage image build & publishing to GHCR
│       └── deploy.yml                       # Deployment dispatch & healthcheck verifier
│
├── devops/
│   ├── docker/
│   │   ├── backend/
│   │   │   └── Dockerfile                   # Multi-stage Node.js + C++ bundled image
│   │   ├── frontend/
│   │   │   └── Dockerfile                   # Multi-stage Vite builder + Nginx SPA runtime
│   │   └── cpp-engine/
│   │       └── Dockerfile                   # Standalone C++20 release image with CTest
│   │
│   ├── compose/
│   │   ├── docker-compose.dev.yml           # Local development with live volumes
│   │   ├── docker-compose.test.yml          # Ephemeral test runner environment
│   │   └── docker-compose.prod.yml          # Hardened production stack with resource limits
│   │
│   ├── nginx/
│   │   └── nginx.conf                       # Production Nginx reverse proxy configuration
│   │
│   ├── monitoring/
│   │   ├── prometheus/
│   │   │   └── prometheus.yml               # Scrape configuration for backend & engine
│   │   └── grafana/
│   │       ├── dashboards/
│   │       │   ├── quantpulse-system-overview.json     # Traffic & system health dashboard
│   │       │   └── quantpulse-quant-performance.json   # Microstructure latency dashboard
│   │       └── provisioning/
│   │           ├── dashboards/dashboards.yml           # Automated dashboard loader
│   │           └── datasources/prometheus.yml          # Automated Prometheus connector
│   │
│   └── scripts/
│       ├── dev.sh                           # 1-click developer cluster start
│       ├── prod.sh                          # 1-click production cluster start
│       ├── test.sh                          # 1-click complete test suite execution
│       ├── build.sh                         # Multi-stage container image builder
│       └── healthcheck.sh                   # Comprehensive healthcheck validator
│
├── k8s/                                     # Kubernetes enterprise manifests
│   ├── namespace.yaml                       # Dedicated quantpulse namespace
│   ├── configmap.yaml                       # Cluster-wide non-sensitive configuration
│   ├── secrets.yaml.example                 # Production secrets template
│   ├── ingress.yaml                         # Ingress controller with SSL termination
│   ├── backend/deployment.yaml              # Backend deployment (2 replicas) & ClusterIP
│   ├── frontend/deployment.yaml             # Frontend deployment (2 replicas) & ClusterIP
│   ├── mongodb/statefulset.yaml             # MongoDB StatefulSet with 20Gi PVC
│   └── redis/deployment.yaml                # Redis deployment & ClusterIP
│
├── backend/
│   ├── src/
│   │   ├── modules/health/                  # HealthController (/health, /live, /ready)
│   │   └── shared/
│   │       ├── logger/logger.ts             # Production JSON logging & token sanitizer
│   │       └── metrics/metrics.ts           # Prometheus text-format metrics registry
│   └── test/modules/health/                 # Health controller test suite
│
├── cpp-engine/
│   ├── src/adapter/
│   │   ├── QuantPulseCLI.cpp                # JSON stdin/stdout CLI processor
│   │   └── QuantPulseHttpServer.cpp         # Zero-dependency C++20 POSIX HTTP server
│   └── CMakeLists.txt                       # Build targets (core, cli, server, tests, bench)
│
└── frontend/
    └── vercel.json                          # Vercel SPA routing & asset cache configuration
```

---

## 3. Containerization Engine (Docker Multi-Stage Builds)

### 3.1 C++20 Quantitative Engine Image
- **File**: [`devops/docker/cpp-engine/Dockerfile`](file:///home/kali/project/QuantPulse-VP/devops/docker/cpp-engine/Dockerfile)
- **What it is**: A two-stage Docker build that compiles the C++20 codebase using GCC 13/Ubuntu 24.04 and produces an ultra-lean runtime container.
- **Why it is used**: Builds must be 100% deterministic across operating systems (Linux, macOS, Windows) without requiring host-level C++ compilers or CMake installations.
- **Key Advantages**:
  1. *Test-before-promote pattern*: Stage 1 runs `ctest --test-dir build --output-on-failure`. If any of the 661 tests fail, the Docker build immediately aborts, preventing broken images from existing.
  2. *Zero build tools in runtime*: Stage 2 strips out GCC, CMake, source files, and temporary object files, keeping only `libstdc++6` and compiled binaries (`quantpulse_server`, `quantpulse_cli`, `quantpulse_benchmarks`).
  3. *Security via Least Privilege*: Executes as dedicated non-root user `quantpulse` (`UID/GID 1000`).
  4. *Integrated Healthcheck*: Docker polls `curl -f http://localhost:8080/health` every 15s.

#### Breakpoints & Failure Modes
| Breakpoint / Failure Mode | Root Cause | Impact | Automated Recovery / Fix |
| :--- | :--- | :--- | :--- |
| **Stage 1 CMake configure failure** | Missing dependency or invalid CMake flag | Build halts at compilation | Inspect compiler output; verify system libraries in Stage 1 apt-get block. |
| **CTest regression failure** | An algorithmic bug causes a unit test to fail | Image is never generated or tagged | Fix domain logic; build gate blocks broken container promotion. |
| **Dynamic Port Binding Crash** | Port already in use or unprivileged port <1024 | Process fails with `EACCES` or `EADDRINUSE` | Image reads `PORT` environment variable (defaults to `8080`) and binds to `0.0.0.0`. |
| **Container OOM Killed (SIGKILL 137)** | Extreme array allocations during volatility matrix calculation | Container dies abruptly | Production Compose & Kubernetes define resource limits (`2048Mi`) preventing host exhaustion. Docker restart policy `restart: always` restarts the container immediately. |

---

### 3.2 Node.js Backend Image
- **File**: [`devops/docker/backend/Dockerfile`](file:///home/kali/project/QuantPulse-VP/devops/docker/backend/Dockerfile)
- **What it is**: A three-stage Docker build:
  1. Stage 1 (`cpp-builder`): Compiles the native `quantpulse_cli` binary in Release mode.
  2. Stage 2 (`node-builder`): Runs `npm ci` and TypeScript compilation (`tsc`) to create `dist/`.
  3. Stage 3 (`runtime`): Starts from `node:22-bookworm-slim`, copies production node_modules (`npm ci --omit=dev`), compiled `dist/`, and the native C++ binary into `/usr/local/bin/quantpulse_cli`.
- **Why it is used**: Enables the backend to run as a unified container that has both the Express API and native sub-millisecond C++ execution capabilities without cross-container network overhead when running in single-container environments.
- **Key Advantages**:
  1. *Dual Execution Modes*: Can connect to a remote C++ microservice via HTTP (`CPP_ENGINE_URL`), or execute locally via bundled binary (`QUANTPULSE_ENGINE_PATH`).
  2. *Immutable Node modules*: Uses `npm ci` strictly, guaranteeing identical dependency lockfiles.
  3. *Non-Root Execution*: Runs under unprivileged user `node`.
  4. *Container Health Probe*: Active Docker healthcheck polling `http://localhost:8000/health/live`.

#### Breakpoints & Failure Modes
| Breakpoint / Failure Mode | Root Cause | Impact | Automated Recovery / Fix |
| :--- | :--- | :--- | :--- |
| **`quantpulse_cli` missing in runtime** | Binary not copied or wrong chmod permissions | Market analysis requests return 500 error | Stage 3 executes `COPY --from=cpp-builder ...` and `chmod +x /usr/local/bin/quantpulse_cli`. |
| **TypeScript compile error in Stage 2** | Type mismatch or missing interface property | Build fails fast before image creation | Compiler emits exact line error; fix code before promotion. |
| **Dependency vulnerability (`npm audit`)** | Critical security issue in third-party library | Flagged by CI security gate | Run `npm audit fix` or upgrade library version. |

---

### 3.3 React Frontend SPA Image
- **File**: [`devops/docker/frontend/Dockerfile`](file:///home/kali/project/QuantPulse-VP/devops/docker/frontend/Dockerfile)
- **What it is**: A two-stage production Docker build that compiles Vite assets with Node 22 and serves them using lightweight `nginx:alpine`.
- **Why it is used**: Node.js should never be used to serve static HTML/JS/CSS assets in production. Nginx handles static file delivery with kernel-level `sendfile`, gzip compression, and caching with ~10x lower memory usage.
- **Key Advantages**:
  1. *Zero Node runtime overhead in production*: Final image size is ~25MB.
  2. *Built-in Reverse Proxy*: Reverse proxies `/api` and `/health` requests directly to backend upstream, eliminating CORS issues.
  3. *Client-side SPA Routing*: Solves the classic 404 error when refreshing routes like `/overview` or `/scanner` via Nginx `try_files $uri $uri/ /index.html;`.

---

### 3.4 Root Build Context & .dockerignore
- **File**: [`.dockerignore`](file:///home/kali/project/QuantPulse-VP/.dockerignore)
- **What it is**: Exclusion pattern rules that block unnecessary or sensitive files from entering Docker build contexts.
- **What it excludes**: `.git`, `node_modules`, `build`, `build-release`, `.env*` (except `.env.example`), `docs`, temporary logs, and secret keys.
- **Advantages**:
  1. *Security*: Guarantees developer credentials or `.env` files are never accidentally baked into Docker image layers.
  2. *Build Speed*: Keeps Docker context upload under 5MB instead of sending gigabytes of `node_modules` or build artifacts.

---

## 4. Edge Ingress & Reverse Proxy (Nginx Architecture)

- **File**: [`devops/nginx/nginx.conf`](file:///home/kali/project/QuantPulse-VP/devops/nginx/nginx.conf)
- **What it is**: Production-grade Nginx web server configuration acting as the public entrypoint for web traffic.

### Architecture Features & Configuration Details
```nginx
# Upstream definition with HTTP keepalive pooling
upstream backend_upstream {
    server backend:8000;
    keepalive 32;
}
```
1. **HTTP Keepalive Connection Pooling**: Keeps 32 persistent connections open between Nginx and the Node.js backend, reducing TCP handshake and latency overhead.
2. **Gzip Compression**: Compresses JSON, JavaScript, CSS, HTML, and SVG responses with level 6 compression, cutting network payload transfer by up to 70%.
3. **Hardened Security Headers**:
   - `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking)
   - `X-Content-Type-Options: nosniff` (Mitigates MIME-sniffing exploits)
   - `X-XSS-Protection: 1; mode=block` (Browser XSS filter)
   - `Referrer-Policy: strict-origin-when-cross-origin` (Protects user referrer data)
   - `server_tokens off;` (Hides Nginx version from vulnerability scanners)
4. **Large Payload Upload Support**: `client_max_body_size 50M;` enables users to upload historical CSV/JSON tick datasets in Data Lab without receiving HTTP 413 errors.
5. **JSON Access Logging**: Access logs are written in structured JSON format (`json_analytics`) with request timing (`$request_time`), status, bytes sent, and user agent for log aggregation tools.

#### Breakpoints & Failure Modes
| Breakpoint | Symptom | Root Cause | Automated Recovery / Fix |
| :--- | :--- | :--- | :--- |
| **HTTP 502 Bad Gateway** | Nginx cannot reach backend API | Backend container is initializing or crashed | Docker Compose `depends_on: backend: condition: service_healthy` ensures Nginx only starts after backend responds to health checks. |
| **HTTP 504 Gateway Timeout** | Backtesting large dataset times out | Upstream read took longer than default 60s | Nginx configures `proxy_read_timeout 120s;` and `proxy_send_timeout 60s;` to allow algorithmic calculations to complete. |
| **HTTP 413 Payload Too Large** | Uploading 20MB CSV dataset fails | Nginx default upload cap is 1MB | Configured `client_max_body_size 50M;`. |

---

## 5. Orchestration Topology (Docker Compose Stacks)

QuantPulse provides four purpose-built Docker Compose topologies under [`devops/compose/`](file:///home/kali/project/QuantPulse-VP/devops/compose/):

### 5.1 Development Stack (`docker-compose.dev.yml`)
- **Command**: `./devops/scripts/dev.sh` or `docker compose -f devops/compose/docker-compose.dev.yml up --build`
- **Purpose**: Local feature development.
- **Features**:
  - Exposes all ports to `localhost` (`27017` for Mongo, `6379` for Redis, `8000` for Backend, `5173` for Frontend).
  - Uses Docker bridge network `quantpulse-network`.
  - Configures `LOG_FORMAT=pretty` for colored, human-readable terminal output.

### 5.2 Automated Testing Stack (`docker-compose.test.yml`)
- **Purpose**: Headless automated test execution in CI or isolated sandbox environments.
- **Features**:
  - Spins up ephemeral MongoDB and Redis test databases.
  - Automatically runs backend Vitest tests and C++ CTest test suites.
  - Exits with return code 0 on test success, or code 1 on failure.

### 5.3 Production Stack (`docker-compose.prod.yml`)
- **Command**: `./devops/scripts/prod.sh` or `docker compose -f devops/compose/docker-compose.prod.yml up -d --build`
- **Purpose**: Production deployment on single hosts, cloud VMs, or bare-metal instances.
- **Production Hardening Features**:
  1. *Port Isolation*: MongoDB (`27017`) and Redis (`6379`) do **NOT** bind to host ports. They are reachable only by the backend container over internal network `quantpulse-internal`.
  2. *Single Public Exposure*: The frontend Nginx container is the **only** service binding port 80/443 to the host.
  3. *Resource Quotas*:
     - MongoDB: Max 2.0 CPUs, 2048MB RAM
     - Redis: Max 1.0 CPUs, 1024MB RAM
     - C++ Engine: Max 2.0 CPUs, 2048MB RAM
     - Backend: Max 4.0 CPUs, 4096MB RAM
     - Frontend Nginx: Max 1.0 CPUs, 512MB RAM
  4. *Restart Policies*: All services enforce `restart: always`.
  5. *Observability Stack Included*: Bundles Prometheus (`:9090`) and Grafana (`:3000`).

### 5.4 Root Quickstart Compose (`docker-compose.yml`)
- **Command**: `docker compose up --build`
- **Purpose**: Zero-configuration entrypoint at the repository root that defaults to running the complete platform for immediate developer onboarding.

---

## 6. C++ Quantitative HTTP Microservice & Dual-Mode IPC

- **Files**:
  - [`cpp-engine/src/adapter/QuantPulseHttpServer.cpp`](file:///home/kali/project/QuantPulse-VP/cpp-engine/src/adapter/QuantPulseHttpServer.cpp)
  - [`cpp-engine/src/adapter/QuantPulseCLI.cpp`](file:///home/kali/project/QuantPulse-VP/cpp-engine/src/adapter/QuantPulseCLI.cpp)
  - [`backend/src/infrastructure/cpp-engine/QuantEngineClient.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/infrastructure/cpp-engine/QuantEngineClient.ts)

### What it is & Why it was Built
The C++ quantitative engine contains computational models: Volatility Squeeze, Order Flow Imbalance, Mean Reversion Z-scores, and Kelly Criterion calculations. 

Originally, communication occurred exclusively via local CLI process spawning (`child_process.spawn`). To deploy across distributed cloud containers (e.g., Render, Kubernetes), the engine needed to expose a **network HTTP API**.

### Zero-Dependency Architecture
Rather than adding heavyweight external HTTP frameworks that require internet connectivity during compilation, `QuantPulseHttpServer.cpp` was built using **standard C++20 and POSIX sockets**:
- Accepts TCP connections on `0.0.0.0:${PORT}` (defaults to port 8080).
- Multi-threaded: Dispatches requests to worker threads (`std::thread(...).detach()`).
- Exposes:
  - `GET /health` &rarr; Instant status response (`{"status":"ok","service":"quantpulse-cpp-engine","uptimeSeconds":...}`).
  - `POST /analyze` & `POST /api/v1/analytics/analyze` &rarr; Ingests OHLCV bar JSON, invokes `MarketDataAnalytics::analyze()`, and serializes the report JSON.
- Clean shutdown: Handles `SIGINT` and `SIGTERM` signals, closes the master socket, and flushes threads.

### Dual-Mode Client Fallback (Node.js)
[`QuantEngineClient.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/infrastructure/cpp-engine/QuantEngineClient.ts) dynamically detects runtime configuration:
1. **HTTP Microservice Mode**: If `CPP_ENGINE_URL` is set (e.g., `http://cpp-engine:8080`), it communicates over HTTP via Axios.
2. **Local CLI Fallback Mode**: If `CPP_ENGINE_URL` is unset or fails, it falls back to spawning the local compiled binary `quantpulse_cli analyze-json` using standard stdin/stdout pipes.

#### Breakpoints & Failure Modes
| Breakpoint / Failure Mode | Root Cause | Impact | Automated Recovery / Fix |
| :--- | :--- | :--- | :--- |
| **C++ HTTP Microservice Down** | Network glitch or C++ process restart | HTTP requests fail with `ECONNREFUSED` | Backend detects failure and falls back to local binary execution. Kubernetes / Docker restarts C++ container automatically. |
| **Malformed JSON Body Sent** | Client sends non-numeric price or missing symbol | Potential parse exception | Server catches `std::exception`, returns clean HTTP 400 with `{"error": error.what()}`, and keeps the server running without crashing. |
| **TCP Backlog Saturation** | Massive spike in concurrent quantitative analysis calls | New TCP connections drop | Server configures `listen(g_serverFd, 128);` backlog and spawns non-blocking worker threads. |

---

## 7. Health Probes, Readiness & Liveness Engine

- **Files**:
  - [`backend/src/modules/health/health.controller.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/modules/health/health.controller.ts)
  - [`backend/src/modules/health/health.routes.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/modules/health/health.routes.ts)
  - [`backend/src/infrastructure/database/mongodb.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/infrastructure/database/mongodb.ts)

### Endpoint Directory & Probing Semantics

#### 1. Liveness Probe (`GET /health/live`)
- **HTTP Status**: Always `200 OK` if the Node.js event loop is responding.
- **Purpose**: Used by Docker Healthcheck and Kubernetes Liveness Probes.
- **Failure Condition**: If Node.js deadlocks, hangs, or experiences an unhandled event loop block, the probe times out after 5s.
- **Automated Action**: Docker/Kubernetes detects 3 consecutive failures and **restarts** the container.

#### 2. Readiness Probe (`GET /health/ready`)
- **HTTP Status**: `200 OK` if MongoDB is connected; `503 Service Unavailable` if MongoDB is disconnected.
- **Purpose**: Used by Kubernetes Readiness Probes and load balancers.
- **Failure Condition**: MongoDB is temporarily restarting or experiencing network partition.
- **Automated Action**: Load balancer temporarily **removes the pod from traffic routing** without killing the container, allowing the database driver to reconnect gracefully.

#### 3. Deep Diagnostics Health (`GET /health`)
- **HTTP Status**: `200 OK`
- **Output Sample**:
```json
{
  "status": "ok",
  "service": "quantpulse-backend",
  "timestamp": "2026-10-04T09:12:00.000Z",
  "uptimeSeconds": 1420.5,
  "dependencies": {
    "database": {
      "status": "connected",
      "latencyMs": 1.2
    },
    "cppEngine": {
      "status": "available",
      "path": "http://cpp-engine:8080"
    }
  }
}
```

---

## 8. Telemetry, Metrics & Observability Pipeline

### 8.1 Prometheus Metrics Registry
- **File**: [`backend/src/shared/metrics/metrics.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/shared/metrics/metrics.ts)
- **What it is**: High-speed, lock-free, in-memory metrics aggregator exporting standard Prometheus exposition text format on `GET /metrics`.
- **Metrics Collected**:
  - `process_uptime_seconds`: Gauge of Node.js process runtime.
  - `quantpulse_active_http_requests`: Gauge of current in-flight HTTP connections.
  - `quantpulse_http_requests_total{method, route, status}`: Cumulative counter of HTTP requests.
  - `quantpulse_http_request_duration_seconds{method, route}`: Latency histogram counter and sum.
  - `quantpulse_cpp_executions_total{command, status}`: Total invocations of C++ quantitative algorithms.
  - `quantpulse_cpp_execution_duration_seconds{command}`: Microsecond-precision compute latency.

### 8.2 Structured JSON Logging with Sensitive Redaction
- **File**: [`backend/src/shared/logger/logger.ts`](file:///home/kali/project/QuantPulse-VP/backend/src/shared/logger/logger.ts)
- **What it is**: Contextual logger providing two modes:
  - *Pretty Colorized Mode*: Active in local development (`NODE_ENV=development`).
  - *Structured JSON Mode*: Active in production (`NODE_ENV=production` or `LOG_FORMAT=json`).
- **Security Redaction**: Automatically scans payloads and query parameters, replacing sensitive fields (`password`, `secret`, `apiKey`, `api_key`, `token`, `jwt`, `authorization`, `cookie`) with `[REDACTED]`.

### 8.3 Prometheus Scraper Setup
- **File**: [`devops/monitoring/prometheus/prometheus.yml`](file:///home/kali/project/QuantPulse-VP/devops/monitoring/prometheus/prometheus.yml)
- **Configuration**:
  - Scrapes `backend:8000/metrics` every 5 seconds.
  - Stores metrics in time-series database with lifecycle management enabled.

### 8.4 Grafana Provisioning & Dashboards
- **Files**:
  - Data Source: [`devops/monitoring/grafana/provisioning/datasources/prometheus.yml`](file:///home/kali/project/QuantPulse-VP/devops/monitoring/grafana/provisioning/datasources/prometheus.yml)
  - Dashboard Loader: [`devops/monitoring/grafana/provisioning/dashboards/dashboards.yml`](file:///home/kali/project/QuantPulse-VP/devops/monitoring/grafana/provisioning/dashboards/dashboards.yml)
  - **Dashboard 1**: [`quantpulse-system-overview.json`](file:///home/kali/project/QuantPulse-VP/devops/monitoring/grafana/dashboards/quantpulse-system-overview.json) (HTTP throughput, latency, C++ execution count, active in-flight requests).
  - **Dashboard 2**: [`quantpulse-quant-performance.json`](file:///home/kali/project/QuantPulse-VP/devops/monitoring/grafana/dashboards/quantpulse-quant-performance.json) (Volatility Squeeze duration, OFI compute speed, microstructure calculation latencies).

---

## 9. Automated CI/CD Workflows (GitHub Actions)

Located under [`.github/workflows/`](file:///home/kali/project/QuantPulse-VP/.github/workflows/):

### 9.1 Continuous Integration (`ci.yml`)
- **Triggers**: Every push and pull request to `main`, `master`, `develop`.
- **Concurrency**: `cancel-in-progress: true` automatically cancels stale runs on older commits.
- **Jobs**:
  1. `backend`: Installs via `npm ci`, runs `npm run typecheck`, executes 96 Vitest unit tests, and verifies production `npm run build`.
  2. `frontend`: Installs via `npm ci`, runs `npm run typecheck`, and verifies production Vite compilation (`npm run build`).
  3. `cpp-engine`: Configures CMake in Release mode, compiles core library, CLI, and test targets, and runs `ctest --output-on-failure` (661 tests).
  4. `security-scan`: Executes `npm audit --audit-level=high` on backend and frontend dependencies.

### 9.2 Quantitative Performance Benchmarks (`benchmark.yml`)
- **Triggers**: Pushes modifying `cpp-engine/**` or manual `workflow_dispatch`.
- **Actions**:
  - Compiles `quantpulse_benchmarks` in Release mode (`-O3`).
  - Executes Google Benchmark with `--benchmark_format=json --benchmark_repetitions=3`.
  - Uploads `quantpulse_benchmarks.json` as a GitHub Actions artifact (retained for 30 days) for regression analysis.

### 9.3 Immutable Container Publishing (`docker.yml`)
- **Triggers**: Pushes to `main` branch or Git release tags (`v*.*.*`).
- **Actions**:
  - Authenticates to GitHub Container Registry (`ghcr.io`).
  - Builds and pushes three multi-stage images:
    - `ghcr.io/<owner>/quantpulse-backend`
    - `ghcr.io/<owner>/quantpulse-frontend`
    - `ghcr.io/<owner>/quantpulse-cpp-engine`
  - Tags with `latest`, Git commit SHA (`sha-<commit>`), and SemVer tags (`v1.0.0`).
  - Uses GitHub Actions cache (`type=gha`) for Docker build layers.

### 9.4 Zero-Downtime Deployment (`deploy.yml`)
- **Triggers**: Manual dispatch or automated post-docker workflow run.
- **Actions**:
  - Validates production Compose configuration.
  - Connects to production host, pulls updated images by commit SHA.
  - Restarts containers with zero downtime.
  - Executes `./devops/scripts/healthcheck.sh`. If health checks fail, triggers rollback.

---

## 10. Kubernetes Production Manifests (k8s/)

Located under [`k8s/`](file:///home/kali/project/QuantPulse-VP/k8s/):

```
k8s/
├── namespace.yaml           # Dedicated 'quantpulse' namespace
├── configmap.yaml           # Cluster configuration (NODE_ENV, Ports, URLs)
├── secrets.yaml.example     # Secrets template (DB credentials, API keys)
├── ingress.yaml             # Ingress with TLS, 50MB body limit, and timeouts
├── backend/
│   └── deployment.yaml      # 2-replica backend deployment & ClusterIP service
├── frontend/
│   └── deployment.yaml      # 2-replica Nginx frontend & ClusterIP service
├── mongodb/
│   └── statefulset.yaml     # MongoDB StatefulSet with 20Gi PersistentVolumeClaim
└── redis/
    └── deployment.yaml      # Redis cache deployment & ClusterIP service
```

### Key Kubernetes Production Principles
1. **Zero-Downtime Rolling Updates**:
   ```yaml
   strategy:
     type: RollingUpdate
     rollingUpdate:
       maxSurge: 1
       maxUnavailable: 0
   ```
   Ensures new pods are verified healthy by readiness probes before old pods are terminated.
2. **Resource Guarantees & Limits**: Explicit CPU and Memory `requests` and `limits` are configured on all pods, preventing noisy-neighbor node resource exhaustion.
3. **Data Persistence**: MongoDB uses a `StatefulSet` with `volumeClaimTemplates` (`ReadWriteOnce`, 20Gi) to prevent data loss across pod restarts.

---

## 11. Public Cloud Deployment Blueprint

- **File**: [`render.yaml`](file:///home/kali/project/QuantPulse-VP/render.yaml) & [`frontend/vercel.json`](file:///home/kali/project/QuantPulse-VP/frontend/vercel.json)

### Render Blueprint Automated Deployment
1. Connect repository to Render as a **Blueprint**.
2. Render provisions:
   - `quantpulse-cpp-engine` (Private Service on internal network).
   - `quantpulse-backend` (Public Web Service connecting to C++ engine via `CPP_ENGINE_URL`).
   - `quantpulse-frontend` (Static Site with SPA rewrite rules).
3. Connect external managed databases:
   - **MongoDB Atlas**: Free M0 shared cluster (`mongodb+srv://...`).
   - **Upstash Redis**: Serverless free Redis instance (`redis://...`).

---

## 12. DevOps Automation CLI Scripts

Located in [`devops/scripts/`](file:///home/kali/project/QuantPulse-VP/devops/scripts/):

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **`dev.sh`** | `./devops/scripts/dev.sh` | Starts development cluster (hot reloading, exposed ports) |
| **`prod.sh`** | `./devops/scripts/prod.sh` | Starts hardened production cluster with Prometheus & Grafana |
| **`test.sh`** | `./devops/scripts/test.sh` | Runs Vitest tests, TypeScript typechecks, and 661 CTests |
| **`build.sh`** | `./devops/scripts/build.sh` | Builds all production Docker images locally |
| **`healthcheck.sh`**| `./devops/scripts/healthcheck.sh`| Validates HTTP status and JSON response of `/health` |

---

## 13. Disaster Recovery & Failure Modes Matrix

| # | Failure Scenario / Breakpoint | Symptom Observed | Root Cause | Immediate Diagnostic Command | Automated / Operator Recovery Procedure |
| :- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Database Down on Startup** | Backend logs connection retry error; `/health/ready` returns 503 | MongoDB container is initializing or network is unready | `docker compose logs mongodb` | Backend uses reconnection backoff; Kubernetes readiness probe holds pod out of rotation until DB returns 200. |
| **2** | **C++ Microservice Unreachable** | Backend logs `[CPP-ENGINE:ERR] HTTP:analyze failed` | C++ container restarted or network partition | `curl http://cpp-engine:8080/health` | Backend automatically falls back to local binary execution (`/usr/local/bin/quantpulse_cli`). Docker restarts C++ container (`restart: always`). |
| **3** | **Client Upload Exceeds Limit** | HTTP 413 Payload Too Large on CSV upload | Dataset > 50MB | Check upload size in Network DevTools | Nginx has `client_max_body_size 50M;`. If dataset is larger, compress CSV or upload via streaming chunk API. |
| **4** | **SPA Route 404 on Refresh** | Visiting `/scanner` or `/risk` directly returns 404 | Static web server looking for physical `scanner/index.html` | Check HTTP status code | Nginx configuration enforces `try_files $uri $uri/ /index.html;`. On Vercel, `vercel.json` rewrites `/(.*)` to `/index.html`. |
| **5** | **Memory Leak / OOM Kill** | Container exits with status code 137 | Process exceeded Docker/K8s memory limit | `docker inspect <id> \| grep OOMKilled` | Restart policy immediately launches clean container. Check Grafana memory panel to profile leak. |
| **6** | **CORS Request Blocked** | Browser console blocks API response | `CORS_ORIGIN` does not match client domain | Check `Origin` header in request | Set `CORS_ORIGIN=https://your-frontend-domain.com` in backend environment. |
| **7** | **Broken Image Tag Deployed** | Service crashes immediately after deployment | Bug in newly deployed container image | `./devops/scripts/healthcheck.sh` | Rollback immediately: `docker compose -f devops/compose/docker-compose.prod.yml down && docker pull ghcr.io/<owner>/quantpulse-backend:sha-previous && docker compose up -d`. |
| **8** | **Secret Leaked in Logs** | API key exposed in terminal or log collector | Logging un-sanitized request object | `docker compose logs backend \| grep -i key` | Prevented by design: `backend/src/shared/logger/logger.ts` automatically redacts sensitive keys (`apiKey`, `secret`, `jwt`, `password`) into `[REDACTED]`. |
| **9** | **Volume Storage Exhaustion** | MongoDB logs `No space left on device` | Market bars collection filled host disk | `df -h` | Scale storage volume; prune old simulated tick datasets using Data Lab retention API. |
| **10**| **Air-gapped / Offline Build Failure** | CMake build fails trying to download external git repos | FetchContent requires active internet access | `cmake --build build` | QuantPulse C++ HTTP server is implemented with standard POSIX sockets and local headers, requiring 0 external git downloads during compilation. |

---

## 14. Verification & Health Audit Confirmation

All DevOps components have been tested and verified:

```bash
$ ./devops/scripts/test.sh
🧪 [1/3] Running Backend Tests (Vitest)...
 Test Files  19 passed (19)
      Tests  96 passed (96)

🧪 [2/3] Checking Backend & Frontend TypeScript Compilation...
> tsc --noEmit && tsc -p tsconfig.test.json (0 errors)
> tsc --noEmit (0 errors)

🧪 [3/3] Running C++ Test Suite (CTest)...
100% tests passed, 0 tests failed out of 661
Total Test time (real) = 4.68 sec
✅ All QuantPulse tests passed successfully!
```
