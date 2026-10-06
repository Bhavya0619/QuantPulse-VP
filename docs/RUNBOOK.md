# QuantPulse Platform: Complete Operational Runbook

**Comprehensive Engineering, Setup, Execution, and DevOps Manual**

---

## Table of Contents

1. [System Overview & Architecture Flow](#1-system-overview--architecture-flow)
2. [DevOps Architecture & Infrastructure Directory](#2-devops-architecture--infrastructure-directory)
   - [2.1 Docker Multi-Stage Containerization](#21-docker-multi-stage-containerization)
   - [2.2 Docker Compose Environments (Dev, Test, Prod)](#22-docker-compose-environments-dev-test-prod)
   - [2.3 Kubernetes (K8s) Production Manifests](#23-kubernetes-k8s-production-manifests)
   - [2.4 Observability Stack (Prometheus + Grafana)](#24-observability-stack-prometheus--grafana)
   - [2.5 CI/CD Automation Workflows (.github/workflows)](#25-cicd-automation-workflows-githubworkflows)
3. [System Prerequisites & Environment Setup](#3-system-prerequisites--environment-setup)
4. [Step-by-Step: How to Run the Project Fully](#4-step-by-step-how-to-run-the-project-fully)
   - [Workflow A: 1-Click Development Stack (Docker Compose Dev)](#workflow-a-1-click-development-stack-docker-compose-dev)
   - [Workflow B: Production Deployment Stack (Docker Compose Prod)](#workflow-b-production-deployment-stack-docker-compose-prod)
   - [Workflow C: Full Kubernetes Cluster Deployment (Local or Cloud K8s)](#workflow-c-full-kubernetes-cluster-deployment-local-or-cloud-k8s)
   - [Workflow D: Local Bare-Metal Native Development](#workflow-d-local-bare-metal-native-development)
5. [Building, Pulling & Managing Docker Images](#5-building-pulling--managing-docker-images)
6. [Testing, Benchmarking & Quality Assurance](#6-testing-benchmarking--quality-assurance)
   - [6.1 1-Click Automated Multi-Service Test Runner](#61-1-click-automated-multi-service-test-runner)
   - [6.2 Component-Level Test Commands](#62-component-level-test-commands)
7. [Service Endpoints & Telemetry Directory](#7-service-endpoints--telemetry-directory)
8. [Troubleshooting & Resolving Operational Hurdles](#8-troubleshooting--resolving-operational-hurdles)
9. [Zero-Downtime Updates, Maintenance & Rollback](#9-zero-downtime-updates-maintenance--rollback)

---

## 1. System Overview & Architecture Flow

QuantPulse is an ultra-low latency quantitative trading, market microstructure analytics, and algorithmic risk platform designed with a high-performance multi-tier architecture:

```
                                  USER BROWSER / CLIENT
                                            │
                                            │ HTTP / WebSocket (Port 80 Prod / 5173 Dev)
                                            ▼
                    ┌───────────────────────────────────────────────────┐
                    │      Nginx Reverse Proxy & Frontend Container     │
                    │      (Static SPA Assets, SSL/TLS, Caching, Gzip)  │
                    └───────────┬───────────────────────────┬───────────┘
                                │                           │
                 /              │                           │ /api, /health, /metrics
                 ▼              ▼                           ▼
        ┌───────────────────────────────┐   ┌───────────────────────────────┐
        │   React 19 + Vite Frontend    │   │   Node.js + Express 5 Backend │
        │   - Financial Canvas Charts   │   │   - API Gateway & Controllers │
        │   - Opportunity Scanner       │   │   - Market Data Ingestion     │
        │   - Risk Intelligence UI      │   │   - Prometheus Telemetry      │
        └───────────────────────────────┘   └───────┬───────────────┬───────┘
                                                    │               │
                            HTTP / REST (Port 9000) │               │ Wire Protocol (27017)
                                                    ▼               ▼
                    ┌───────────────────────────────┐ ┌───────────────────────────┐
                    │   C++20 Quantitative Engine   │ │     MongoDB Timeseries    │
                    │   - Market Microstructure/OFI │ │     (Market Bars & State) │
                    │   - Volatility Squeeze        │ └─────────────┬─────────────┘
                    │   - Kelly Criterion Sizing    │               │
                    │   - LOB Matching Engine       │               ▼
                    │   - Value at Risk (VaR/CVaR)  │ ┌───────────────────────────┐
                    └───────────────────────────────┘ │        Redis Cache        │
                                                      │        (Port 6379)        │
                                                      └───────────────────────────┘
                                                                    ▲
                                            Prometheus Scraping     │ Scrapes :8000
                                            ┌───────────────────────┴─────────────┐
                                            │        Prometheus (:9090)           │
                                            │                 │                   │
                                            │                 ▼                   │
                                            │         Grafana (:3000)             │
                                            └─────────────────────────────────────┘
```

---

## 2. DevOps Architecture & Infrastructure Directory

The project includes an enterprise-grade DevOps infrastructure split cleanly into containerization, orchestration, telemetry, orchestration scripts, Kubernetes manifests, and CI/CD automation pipelines.

### 2.1 Docker Multi-Stage Containerization

All application components have dedicated, security-hardened, multi-stage Dockerfiles located in `devops/docker/`:

| Component | Dockerfile Location | Base Image | Multi-Stage Build Description | Security Features |
| :--- | :--- | :--- | :--- | :--- |
| **C++ Quantitative Engine** | `devops/docker/cpp-engine/Dockerfile` | `gcc:13` → `debian:12-slim` | Stage 1 builds CMake Release binaries (`-O3`, static linking where applicable). Stage 2 copies only compiled binaries (`quantpulse_server`, `quantpulse_cli`). | Non-root `quant` user (UID 10001), minimal runtime image, no build tools in final layer. |
| **Node.js Backend** | `devops/docker/backend/Dockerfile` | `node:22-bookworm` → `node:22-alpine` | Stage 1 compiles TypeScript (`tsc`). Stage 2 prunes devDependencies and bundles compiled C++ CLI tools. | Non-root `node` user, minimal alpine footprint, explicit dumb-init signal handling. |
| **React Frontend & Nginx** | `devops/docker/frontend/Dockerfile` | `node:22-alpine` → `nginx:alpine` | Stage 1 compiles React 19 SPA (`npm run build`). Stage 2 serves static assets via Nginx with reverse proxy to backend `/api`. | Read-only webroot, hardened security headers (CSP, HSTS, X-Frame-Options), gzip compression. |

---

### 2.2 Docker Compose Environments (Dev, Test, Prod)

QuantPulse provides three purpose-built Docker Compose topologies located in `devops/compose/`:

#### 1. `docker-compose.dev.yml` (Development Mode)
- **When to use**: During day-to-day coding, feature engineering, and UI hacking.
- **Key Characteristics**:
  - Exposes all database ports (`27017:27017` for Mongo, `6379:6379` for Redis) for direct GUI inspection (Compass, RedisInsight).
  - Backend runs on `8000:8000` with hot-reload support.
  - Frontend runs on `5173:80` with mock providers pre-configured.
  - Utilizes named volumes (`mongodb_dev_data`, `redis_dev_data`) for local state persistence.

#### 2. `docker-compose.prod.yml` (Production & Portfolio Showcase Mode)
- **When to use**: For public demos, production deployment, performance evaluations, and telemetry inspection.
- **Key Characteristics**:
  - Single public entry point: Frontend + Nginx on **Port 80** (`${HTTP_PORT:-80}`). All `/api`, `/health`, and `/metrics` requests are proxied internally.
  - Database ports (`27017`, `6379`) and C++ engine (`9000`) are **isolated** inside the private `quantpulse-internal` bridge network (never exposed to host/internet).
  - Enforces strict Docker resource limits (CPU quotas, memory caps) to prevent out-of-memory (OOM) host crashes.
  - Integrated healthchecks on all services with `depends_on: condition: service_healthy` to guarantee deterministic, zero-race startup order.
  - Runs Prometheus on port `9090` and Grafana on port `3000`.

#### 3. `docker-compose.test.yml` (Automated CI/CD Test Harness)
- **When to use**: For running end-to-end integration tests inside disposable containers before committing code.
- **Key Characteristics**:
  - Spins up isolated `mongodb-test` and `redis-test` containers.
  - Executes test suites in an ephemeral environment without polluting local or production databases.

---

### 2.3 Kubernetes (K8s) Production Manifests

The `k8s/` directory contains standard Kubernetes resources for deploying QuantPulse to any cloud Kubernetes cluster (Amazon EKS, Google GKE, Azure AKS) or local clusters (Minikube, Kind, K3s):

```text
k8s/
├── namespace.yaml           # Dedicated 'quantpulse' namespace
├── configmap.yaml           # Production environment variables
├── secrets.yaml.example     # API keys & database credentials template
├── ingress.yaml             # Nginx Ingress Controller routing rules & SSL termination
├── mongodb/
│   └── statefulset.yaml     # MongoDB StatefulSet with PersistentVolumeClaim (10Gi) & Headless Service
├── redis/
│   └── deployment.yaml      # Redis Deployment with Service & liveness/readiness probes
├── backend/
│   └── deployment.yaml      # Node.js API Deployment (2 replicas, rolling updates, CPU/RAM limits)
└── frontend/
    └── deployment.yaml      # Nginx + React SPA Deployment (2 replicas, rolling updates)
```

---

### 2.4 Observability Stack (Prometheus + Grafana)

Located in `devops/monitoring/`:
- **Prometheus** (`devops/monitoring/prometheus/prometheus.yml`): Configured to scrape the Node.js backend metrics endpoint (`/metrics`) and C++ engine telemetry at 5-second intervals.
- **Grafana** (`devops/monitoring/grafana/`): Pre-provisioned dashboards visualizing:
  - System throughput (HTTP requests per second).
  - Microstructure calculation latency (p50, p95, p99 histograms).
  - Memory & CPU resource consumption per container.
  - Active market data streaming feeds and WebSocket connections.

---

### 2.5 CI/CD Automation Workflows (`.github/workflows`)

| Workflow File | Trigger Conditions | Operational Tasks |
| :--- | :--- | :--- |
| **`ci.yml`** | Push & PR to `main`, `master`, `develop` | - Backend Vitest test suite (96 tests) & TypeScript typecheck.<br>- Frontend TypeScript typecheck & Vite production build.<br>- C++20 engine build with GCC 13 & CTest execution (661 tests). |
| **`docker.yml`** | Push to `main`, tags `v*.*.*`, PR to docker files | - Multi-platform Docker builds using Buildx.<br>- Publishes hardened container images to GitHub Container Registry (`ghcr.io`).<br>- Implements Docker layer caching (`type=gha`) for fast builds. |
| **`benchmark.yml`** | Scheduled weekly & manual dispatch | - Executes Google Benchmark suite (`quantpulse_benchmarks`).<br>- Verifies no execution time regressions in C++ quantitative algorithms. |
| **`deploy.yml`** | Release tag creation | - Deploys verified manifests to production clusters or cloud providers. |

---

## 3. System Prerequisites & Environment Setup

Before starting, ensure your host machine meets the following requirements:

### Hardware Requirements
- **CPU**: 4 Cores minimum (x86_64 or ARM64)
- **RAM**: 8 GB RAM minimum (16 GB recommended for concurrent C++ compilation and Docker builds)
- **Disk**: 15 GB free disk space

### Software Requirements
| Software | Minimum Version | Installation Check Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Docker Engine** | `24.0+` | `docker --version` | Container virtualization |
| **Docker Compose** | `v2.20+` | `docker compose version` | Multi-container orchestration |
| **Git** | `2.30+` | `git --version` | Source control |
| **Node.js** *(Optional for Docker)* | `20.x` or `22.x` | `node -v` | Bare-metal development |
| **CMake & GCC** *(Optional for Docker)* | CMake `3.28+`, GCC `13+` | `cmake --version && g++ --version` | Native C++ compilation |
| **kubectl** *(Optional for K8s)* | `1.28+` | `kubectl version --client` | Kubernetes cluster control |

### Environment Configuration Setup

1. Clone the repository and navigate to root:
   ```bash
   git clone https://github.com/your-org/QuantPulse-VP.git
   cd QuantPulse-VP
   ```

2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```

3. Review the environment variables in `.env`:
   ```ini
   NODE_ENV=development
   PORT=8000
   CORS_ORIGIN=http://localhost:5173
   MONGODB_URI=mongodb://127.0.0.1:27017
   MONGODB_DATABASE=quantpulse
   REDIS_URL=redis://127.0.0.1:6379
   QUANTPULSE_ENGINE_PATH=../cpp-engine/build-release/quantpulse_cli
   MARKET_DATA_PROVIDER=simulated
   ```

---

## 4. Step-by-Step: How to Run the Project Fully

QuantPulse can be executed depending on your operational goal. Follow the exact workflow that matches your scenario.

---

### Workflow A: 1-Click Development Stack (Docker Compose Dev)

**When to run**: When you want to develop, test code changes with live reloading, and inspect databases directly via host ports.

#### Step 1: Launch Development Environment
Run the automated dev launcher script:
```bash
./devops/scripts/dev.sh
```
*Or execute directly via Docker Compose:*
```bash
docker compose -f devops/compose/docker-compose.dev.yml up --build
```

#### Step 2: Access Your Services
Once the startup logs display `Server running on port 8000`:
- **Frontend UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API**: Accessible at [http://localhost:8000/api](http://localhost:8000/api).
- **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health).
- **MongoDB**: Connect via MongoDB Compass to `mongodb://localhost:27017`.
- **Redis**: Connect via Redis CLI or RedisInsight to `localhost:6379`.

#### Step 3: Stopping the Dev Stack
Press `Ctrl + C` in the running terminal, or run:
```bash
docker compose -f devops/compose/docker-compose.dev.yml down
```

---

### Workflow B: Production Deployment Stack (Docker Compose Prod)

**When to run**: When you want to run the fully hardened, production-grade platform with the Nginx reverse proxy, Prometheus telemetry, Grafana dashboards, and isolated internal networking.

#### Step 1: Launch Production Environment
Run the automated production script:
```bash
./devops/scripts/prod.sh
```
*Or execute directly in detached mode:*
```bash
docker compose -f devops/compose/docker-compose.prod.yml up -d --build
```

#### Step 2: Verify Health of All Services
Run the built-in health inspection script:
```bash
./devops/scripts/healthcheck.sh localhost 80
```
Or check container statuses:
```bash
docker compose -f devops/compose/docker-compose.prod.yml ps
```
You should see all containers in an `Up (healthy)` state:
```text
NAME                     IMAGE                         STATUS                    PORTS
quantpulse-frontend      quantpulse-frontend:latest    Up (healthy)              0.0.0.0:80->80/tcp
quantpulse-backend       quantpulse-backend:latest     Up (healthy)              
quantpulse-cpp-engine    quantpulse-cpp-engine:latest  Up (healthy)              
quantpulse-mongodb       mongo:7.0                     Up (healthy)              
quantpulse-redis         redis:7.2-alpine              Up (healthy)              
quantpulse-prometheus    prom/prometheus:v2.51.0       Up                        0.0.0.0:9090->9090/tcp
quantpulse-grafana       grafana/grafana:10.4.0        Up                        0.0.0.0:3000->3000/tcp
```

#### Step 3: Access Production Endpoints
- **Main Trading Terminal**: [http://localhost](http://localhost) (Port 80)
- **API Health Inspection**: [http://localhost/health](http://localhost/health)
- **System Metrics**: [http://localhost/metrics](http://localhost/metrics)
- **Prometheus Dashboard**: [http://localhost:9090](http://localhost:9090)
- **Grafana Observability**: [http://localhost:3000](http://localhost:3000) *(Default login: `admin` / `admin`)*

#### Step 4: Inspecting Production Logs
```bash
# View unified follow logs
docker compose -f devops/compose/docker-compose.prod.yml logs -f

# View only backend logs
docker compose -f devops/compose/docker-compose.prod.yml logs -f backend

# View only C++ quantitative engine logs
docker compose -f devops/compose/docker-compose.prod.yml logs -f cpp-engine
```

#### Step 5: Graceful Teardown
```bash
# Graceful shutdown (preserves databases)
docker compose -f devops/compose/docker-compose.prod.yml down

# Complete teardown (wipes database volumes)
docker compose -f devops/compose/docker-compose.prod.yml down -v
```

---

### Workflow C: Full Kubernetes Cluster Deployment (Local or Cloud K8s)

**When to run**: When deploying QuantPulse to a Kubernetes cluster (Kind, Minikube, EKS, GKE, AKS).

#### Step 1: Start a Local Kubernetes Cluster (if testing locally)
Using **Kind**:
```bash
kind create cluster --name quantpulse
```
Or using **Minikube**:
```bash
minikube start --cpus 4 --memory 8192
```

#### Step 2: Build Images and Load into Local Cluster (Local K8s only)
```bash
# Build local images
./devops/scripts/build.sh

# If using Kind, load images directly into cluster nodes:
kind load docker-image quantpulse-backend:latest --name quantpulse
kind load docker-image quantpulse-frontend:latest --name quantpulse

# If using Minikube:
minikube image load quantpulse-backend:latest
minikube image load quantpulse-frontend:latest
```

#### Step 3: Deploy Kubernetes Manifests Step-by-Step
Deploy the manifests in exact dependency order:

```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply ConfigMap and Secrets
kubectl apply -f k8s/configmap.yaml
cp k8s/secrets.yaml.example k8s/secrets.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Deploy Data Services (StatefulSet & Redis)
kubectl apply -f k8s/mongodb/statefulset.yaml
kubectl apply -f k8s/redis/deployment.yaml

# 4. Wait for database readiness
kubectl rollout status statefulset/mongodb -n quantpulse --timeout=120s
kubectl rollout status deployment/redis -n quantpulse --timeout=60s

# 5. Deploy Core Workloads (Backend & Frontend)
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/frontend/deployment.yaml

# 6. Wait for application pods to be ready
kubectl rollout status deployment/backend -n quantpulse --timeout=120s
kubectl rollout status deployment/frontend -n quantpulse --timeout=60s

# 7. Apply Ingress Routing
kubectl apply -f k8s/ingress.yaml
```

#### Step 4: Verify Kubernetes Pods & Services
```bash
kubectl get pods,svc,pvc -n quantpulse -o wide
```
Output should display all pods with status `Running` (e.g. 2 backend pods, 2 frontend pods, 1 mongo pod, 1 redis pod).

#### Step 5: Accessing the Cluster
If you do not have an external Cloud LoadBalancer / Ingress controller active:
```bash
# Port-forward the Frontend service to port 8080 on your host
kubectl port-forward svc/frontend 8080:80 -n quantpulse

# Port-forward the Backend service to port 8000 on your host
kubectl port-forward svc/backend 8000:8000 -n quantpulse
```
Then visit [http://localhost:8080](http://localhost:8080) in your browser.

#### Step 6: Deleting the Kubernetes Deployment
```bash
kubectl delete namespace quantpulse
```

---

### Workflow D: Local Bare-Metal Native Development

**When to run**: When you want maximum C++ compilation speed, direct GDB/LLDB debugging, or frontend hot-module replacement without Docker.

#### Step 1: Install System Compilers & Tools
```bash
# Ubuntu / Debian
sudo apt-get update && sudo apt-get install -y build-essential cmake g++ libgtest-dev nlohmann-json3-dev

# macOS
brew install cmake gcc googletest nlohmann-json
```

#### Step 2: Build the C++20 Quantitative Engine
```bash
# Configure CMake in Release mode
cmake -B cpp-engine/build-release -DCMAKE_BUILD_TYPE=Release -S cpp-engine

# Compile all targets (CLI, HTTP server, test suites, benchmarks)
cmake --build cpp-engine/build-release --config Release -j$(nproc)
```

#### Step 3: Start MongoDB & Redis via Quick Docker Containers
```bash
docker run -d --name qp-mongo -p 27017:27017 mongo:7.0
docker run -d --name qp-redis -p 6379:6379 redis:7.2-alpine
```

#### Step 4: Start Backend Server
```bash
cd backend
npm install
npm run dev
```
*(Backend runs on [http://localhost:8000](http://localhost:8000))*

#### Step 5: Start Frontend Server
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
*(Frontend runs on [http://localhost:5173](http://localhost:5173))*

---

## 5. Building, Pulling & Managing Docker Images

### 5.1 Build All Images Locally (1-Click)
Run the master build script from the repository root:
```bash
./devops/scripts/build.sh
```
This builds all three production images:
1. `quantpulse-cpp-engine:latest`
2. `quantpulse-backend:latest`
3. `quantpulse-frontend:latest`

### 5.2 Build Images Individually with Docker
```bash
# Build C++ Engine
docker build -t quantpulse-cpp-engine:latest -f devops/docker/cpp-engine/Dockerfile .

# Build Node.js Backend
docker build -t quantpulse-backend:latest -f devops/docker/backend/Dockerfile .

# Build Frontend with custom API endpoint
docker build -t quantpulse-frontend:latest \
  --build-arg VITE_API_BASE_URL="http://your-server-ip:8000" \
  -f devops/docker/frontend/Dockerfile .
```

### 5.3 Pull Pre-Built Images from GitHub Container Registry (GHCR)
When deploying to cloud servers without building from source:
```bash
docker pull ghcr.io/quantpulse/quantpulse-backend:latest
docker pull ghcr.io/quantpulse/quantpulse-frontend:latest
docker pull ghcr.io/quantpulse/quantpulse-cpp-engine:latest
```

---

## 6. Testing, Benchmarking & Quality Assurance

QuantPulse incorporates strict automated testing gates across TypeScript and C++20.

### 6.1 1-Click Automated Multi-Service Test Runner
Run the automated test script to run the entire verification suite:
```bash
./devops/scripts/test.sh
```
Or execute the automated test runner inside Docker Compose:
```bash
docker compose -f devops/compose/docker-compose.test.yml up --build --abort-on-container-exit
```

---

### 6.2 Component-Level Test Commands

#### 1. Backend Unit & Integration Tests (Vitest)
```bash
cd backend
npm test
```
*Expected result: 19 test files passed, 96 passed tests (100% pass rate).*

#### 2. TypeScript Static Typecheck
```bash
# Check Backend
npm --prefix backend run typecheck

# Check Frontend
npm --prefix frontend run typecheck
```

#### 3. C++20 Google Test Suite (661 Tests)
```bash
ctest --test-dir cpp-engine/build-release --output-on-failure
```
*Expected result: 661 test suites passed, 0 failures.*

#### 4. C++ Quantitative Microbenchmarks (Google Benchmark)
```bash
./cpp-engine/build-release/quantpulse_benchmarks --benchmark_report_aggregates_only=true
```
Measures nanosecond-level execution times for:
- `StatisticsEngine`: Mean, Variance, Covariance, Correlation ($O(n)$ scaling).
- `ReturnsEngine`: Simple returns, Log returns, Cumulative returns.
- `VolatilityEngine`: Historical & Realized Volatility ($O(n)$).
- `RiskEngine`: Sharpe ratio, Maximum Drawdown, Value at Risk.

---

## 7. Service Endpoints & Telemetry Directory

| Endpoint | Protocol | Port | Access URL | Description & Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Trading Terminal UI** | HTTP | 80 (Prod) / 5173 (Dev) | [http://localhost](http://localhost) | React 19 Institutional Dashboard |
| **Backend REST API** | HTTP | 8000 | [http://localhost:8000/api](http://localhost:8000/api) | Market Data, Scanner, Signals, Risk API |
| **System Deep Health** | HTTP | 8000 / 80 | [http://localhost/health](http://localhost/health) | Verifies DB, Redis, and C++ engine status |
| **Liveness Probe** | HTTP | 8000 / 80 | [http://localhost/health/live](http://localhost/health/live) | K8s / Docker container liveness check |
| **Readiness Probe** | HTTP | 8000 / 80 | [http://localhost/health/ready](http://localhost/health/ready) | K8s / Docker traffic routing readiness |
| **Prometheus Metrics**| HTTP | 8000 / 80 | [http://localhost/metrics](http://localhost/metrics) | Scraped telemetry, latencies, error counters |
| **Prometheus Web UI** | HTTP | 9090 | [http://localhost:9090](http://localhost:9090) | Prometheus metric exploration console |
| **Grafana Dashboard** | HTTP | 3000 | [http://localhost:3000](http://localhost:3000) | Observability visualizations (`admin`/`admin`) |
| **MongoDB** | Wire | 27017 | `mongodb://localhost:27017` | Timeseries market database *(Dev only)* |
| **Redis** | RESP | 6379 | `redis://localhost:6379` | Order book & session cache *(Dev only)* |

---

## 8. Troubleshooting & Resolving Operational Hurdles

### Hurdle 1: Port Collision on Port 80, 8000, or 5173
- **Symptoms**: `Error: listen EADDRINUSE: address already in use :::8000` or `bind: address already in use`.
- **Root Cause**: Another service (Apache, local Node, or older Docker container) is holding the port.
- **Solution**:
  1. Identify the blocking process:
     ```bash
     sudo lsof -i :80 -i :8000 -i :5173
     ```
  2. Terminate the conflicting process:
     ```bash
     sudo kill -9 <PID>
     ```
  3. Alternatively, override the production HTTP port via environment variable:
     ```bash
     HTTP_PORT=8080 ./devops/scripts/prod.sh
     ```

---

### Hurdle 2: Docker Permission Denied (`Got permission denied while trying to connect to the Docker daemon`)
- **Symptoms**: `docker` commands fail unless run with `sudo`.
- **Root Cause**: Current Linux user is not assigned to the `docker` security group.
- **Solution**:
  ```bash
  sudo usermod -aG docker $USER
  newgrp docker
  ```

---

### Hurdle 3: MongoDB Connection Refused (`MongoServerSelectionError`)
- **Symptoms**: Backend crashes on startup with `MongoServerSelectionError: connect ECONNREFUSED`.
- **Root Cause**: MongoDB is either starting up slowly or not running on the expected host/port.
- **Solution**:
  1. If running under Docker Compose, verify MongoDB is healthy:
     ```bash
     docker compose -f devops/compose/docker-compose.prod.yml ps mongodb
     ```
  2. Check MongoDB internal logs:
     ```bash
     docker compose -f devops/compose/docker-compose.prod.yml logs mongodb
     ```
  3. Verify connection via MongoDB ping:
     ```bash
     docker exec -it quantpulse-mongodb mongosh --eval "db.adminCommand('ping')"
     ```

---

### Hurdle 4: C++ Engine Binary Not Found (`quantpulse_cli: No such file or directory`)
- **Symptoms**: Backend logs report `[CPP-ENGINE:ERR] ENOENT: quantpulse_cli not found`.
- **Root Cause**: Native build missing or path misconfigured in `.env`.
- **Solution**:
  1. In Docker Compose, the C++ binaries are automatically built and packaged at `/usr/local/bin/quantpulse_cli`. Verify the container path.
  2. For local native development, rebuild C++ targets:
     ```bash
     cmake -B cpp-engine/build-release -DCMAKE_BUILD_TYPE=Release -S cpp-engine
     cmake --build cpp-engine/build-release -j$(nproc)
     ```
  3. Ensure `QUANTPULSE_ENGINE_PATH=../cpp-engine/build-release/quantpulse_cli` is set in `backend/.env`.

---

### Hurdle 5: Kubernetes Pod in `CrashLoopBackOff` or `Pending`
- **Symptoms**: `kubectl get pods -n quantpulse` displays pod state `CrashLoopBackOff`.
- **Root Cause**: Missing secrets, unfulfilled PersistentVolumeClaim, or probe timeout.
- **Solution**:
  1. Inspect pod events:
     ```bash
     kubectl describe pod <pod-name> -n quantpulse
     ```
  2. View crashing container logs:
     ```bash
     kubectl logs <pod-name> -n quantpulse --previous
     ```
  3. If MongoDB is `Pending`, check if your cluster has a default StorageClass:
     ```bash
     kubectl get storageclass
     ```

---

### Hurdle 6: CORS Errors in Web Browser Console
- **Symptoms**: `Access to XMLHttpRequest at 'http://localhost:8000/api' from origin 'http://localhost:5173' has been blocked by CORS policy`.
- **Root Cause**: The backend `CORS_ORIGIN` configuration does not match the frontend origin.
- **Solution**:
  - In `backend/.env` or Docker Compose environment, set:
    ```ini
    CORS_ORIGIN=http://localhost:5173
    ```
  - For production with Nginx reverse proxy, API requests are routed on the same origin (`/api`), entirely eliminating CORS overhead.

---

## 9. Zero-Downtime Updates, Maintenance & Rollback

### 9.1 Zero-Downtime Rolling Update (Docker Compose)
To update the application without taking down the database:
```bash
# 1. Pull or rebuild updated code
git pull origin main
./devops/scripts/build.sh

# 2. Re-create updated containers in-place
docker compose -f devops/compose/docker-compose.prod.yml up -d --no-deps --build backend frontend
```

### 9.2 Zero-Downtime Rolling Update (Kubernetes)
```bash
# Trigger rolling update with new container tag
kubectl set image deployment/backend backend=ghcr.io/quantpulse/quantpulse-backend:sha-new -n quantpulse

# Monitor rollout progression
kubectl rollout status deployment/backend -n quantpulse
```

### 9.3 Rollback to Previous Version
If an unexpected regression occurs in production:
```bash
# Docker Compose Rollback:
docker compose -f devops/compose/docker-compose.prod.yml down
docker tag quantpulse-backend:previous quantpulse-backend:latest
docker compose -f devops/compose/docker-compose.prod.yml up -d

# Kubernetes Instant Rollback:
kubectl rollout undo deployment/backend -n quantpulse
kubectl rollout undo deployment/frontend -n quantpulse
```
