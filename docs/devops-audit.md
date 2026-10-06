# DevOps Audit Report: QuantPulse Platform

**Date:** 2026-09-30  
**Project:** QuantPulse-VP Monorepo  
**Author:** Senior DevOps & Software Architecture Team  

---

## 1. Executive Summary

QuantPulse is a high-performance quantitative trading and market analytics platform consisting of:
- **React + Vite Frontend** (Single Page Application in TypeScript with Tailwind CSS & Recharts).
- **Node.js + Express Backend** (REST API, SSE streaming, MongoDB persistence, child-process IPC to native engine).
- **C++20 Quantitative Analytics Engine** (`quantpulse_core` static library, `quantpulse_cli` stdin/stdout JSON processor, `quantpulse_tests` Google Test suite, and `quantpulse_benchmarks` Google Benchmark suite).
- **External Data Feeds** (Alpha Vantage, Binance, Polygon, Zerodha, Upstox, simulated feeds).

This audit documents the current state, runtime dependencies, build/test workflows, configuration parameters, and architectural findings, establishing the roadmap for production DevOps, Docker containerization, CI/CD, DevSecOps, observability, and Kubernetes deployment.

---

## 2. Existing Architecture & Inter-Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER / CLIENT                                │
│                         (React 19 + Vite Frontend)                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST / SSE (Port 8000)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NODE.JS / EXPRESS BACKEND                         │
│   - Modules: analytics, backtesting, market-data, risk, realtime, etc.       │
│   - Logger: Structured terminal logger with HTTP / C++ timing tags          │
│   - Data Pipeline: Ingestion, Validation, Normalization, Deduplication       │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    │ Stdin/Stdout JSON IPC               │ MongoDB Connection (Wire)
                    │ (Spawn: quantpulse_cli analyze-json)│ (mongodb://127.0.0.1:27017)
                    ▼                                     ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     C++20 QUANT ANALYTICS ENGINE     │  │       MONGODB DATABASE            │
│  - quantpulse_core (C++20 lib)       │  │  - Database: quantpulse           │
│  - quantpulse_cli (Executable)       │  │  - Collections: datasets,         │
│  - Volatility, Risk, Squeeze, OFI,   │  │    market_bars, backtests,        │
│    Kelly Criterion, Microstructure   │  │    analytics, users, strategies   │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

### Communication Interface Analysis:
- **Frontend &rarr; Backend**: Axios REST API calls targeting `http://localhost:8000/api/...` (or reverse proxied `/api`).
- **Backend &rarr; C++ Engine**: Child process execution (`child_process.spawn`) invoking the compiled binary `quantpulse_cli` with argument `analyze-json`. Request JSON is written to `stdin` and response JSON is parsed from `stdout`.
- **Backend &rarr; MongoDB**: MongoDB Native Driver (`mongodb` v7.6.0) connecting to `MONGODB_URI` (default: `mongodb://127.0.0.1:27017`) and database `MONGODB_DATABASE` (default: `quantpulse`).
- **Redis Integration**: Architecture stubbed in `src/infrastructure/redis/redis.ts`, ready for session caching and job worker queues.

---

## 3. Build & Test Commands Matrix

| Component | Language / Framework | Build Command | Test Command | Benchmark Command |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | TypeScript / React 19 / Vite | `npm run build` (`tsc -b && vite build`) &rarr; `dist/` | `npm run typecheck` (`tsc --noEmit`) | N/A |
| **Backend** | TypeScript / Node.js 20+ | `npm run build` (`tsc`) &rarr; `dist/` | `npm test` (`vitest run`), `npm run typecheck` | N/A |
| **C++ Engine** | C++20 / CMake 3.20+ / GCC 13+ | `cmake -B build-release -DCMAKE_BUILD_TYPE=Release && cmake --build build-release -j` | `ctest --test-dir build-release --output-on-failure` (661 Google Tests) | `./cpp-engine/build-release/quantpulse_benchmarks` (Google Benchmark) |

---

## 4. Build Artifacts & Targets

1. **C++ Engine Targets**:
   - `libquantpulse_core.a` (Static core library)
   - `quantpulse_cli` (Production CLI & IPC processor)
   - `quantpulse_demo` (Standalone demonstration binary)
   - `quantpulse_tests` (GTest binary containing 661 test cases)
   - `quantpulse_benchmarks` (Google Benchmark binary containing 120+ microbenchmarks)
2. **Backend Targets**:
   - `backend/dist/server.js` (Compiled ESM entry point)
   - `backend/dist/app.js`
   - `backend/dist/config/` and `backend/dist/modules/`
3. **Frontend Targets**:
   - `frontend/dist/index.html`
   - `frontend/dist/assets/*.js`, `*.css`, font assets

---

## 5. Environment Variables & Runtime Dependencies

| Variable Name | Default / Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` / `production` / `test` | Node.js execution mode |
| `PORT` | `8000` | Backend listening HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` or `*` | Allowed CORS origins for browser security |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` / `mongodb://mongodb:27017` | MongoDB connection URI |
| `MONGODB_DATABASE`| `quantpulse` | Main application database name |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `QUANTPULSE_ENGINE_PATH`| `../cpp-engine/build-release/quantpulse_cli` | Absolute or relative path to the C++ engine binary |
| `MARKET_DATA_PROVIDER`| `simulated` | Active market feed provider |
| `ALPHA_VANTAGE_API_KEY`| `(secret)` | API key for Alpha Vantage |
| `BINANCE_API_KEY` | `(secret)` | API key for Binance Spot |
| `BINANCE_API_SECRET`| `(secret)` | Secret key for Binance Spot |
| `VITE_API_BASE_URL`| `http://localhost:8000` | Frontend backend API target |
| `VITE_BACKEND_URL` | `http://localhost:8000` | Frontend backend base URL |

---

## 6. Current Docker & Container Configuration Issues Discovered

1. **Root `docker-compose.yml`**: Currently placeholder comments without service definitions.
2. **Missing Containerization**: No `Dockerfile` files existed for frontend, backend, or C++ engine.
3. **C++ Path in Container**: In containerized environments, the backend needs `QUANTPULSE_ENGINE_PATH` pointing to `/usr/local/bin/quantpulse_cli` (or bundled shared volume / container filesystem).
4. **Health Check Endpoints**: Backend `/health` was minimal (`{status: 'ok'}`); needs deep dependency checking (MongoDB connection ping, Redis check, C++ engine binary accessibility).
5. **Logs & Metrics**: Backend logger was console-colored text only; production requires structured JSON logging and Prometheus metric scrape endpoints (`/metrics`).
6. **Reverse Proxy**: Need an Nginx reverse proxy to route `/` to the React SPA frontend and `/api/` & `/health` to the backend.

---

## 7. Recommended Production DevOps Architecture

```
                                  Internet
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    Nginx (Port 80 / 443)     │
                      │  Reverse Proxy & Static SPA  │
                      └───────┬──────────────┬───────┘
                              │              │
                   / (Static) │              │ /api, /health
                              ▼              ▼
                     ┌─────────────┐   ┌──────────────────────────────┐
                     │  Frontend   │   │     QuantPulse Backend       │
                     │  (HTML/JS)  │   │     (Node.js 20+ / TS)       │
                     └─────────────┘   └──────┬───────────────┬───────┘
                                              │               │
                                              │ ChildProcess  │ Wire Protocol
                                              ▼               ▼
                                       ┌─────────────┐  ┌─────────────┐
                                       │ C++ Engine  │  │   MongoDB   │
                                       │ (quantpulse_│  │ (Port 27017)│
                                       │    cli)     │  └─────────────┘
                                       └─────────────┘        │
                                              ▲               ▼
                                              │         ┌─────────────┐
                                              └─────────┤    Redis    │
                                                        │ (Port 6379) │
                                                        └─────────────┘
```

### Proposed Structure:
- `devops/docker/backend/Dockerfile`: Multi-stage build with `node:22-alpine` builder and lean runtime with non-root user and `quantpulse_cli` binary bundled.
- `devops/docker/frontend/Dockerfile`: Multi-stage build with `node:22-alpine` builder and `nginx:alpine` runtime.
- `devops/docker/cpp-engine/Dockerfile`: Multi-stage build with `gcc`/`cmake` builder compiling `quantpulse_cli`, `quantpulse_tests`, `quantpulse_benchmarks` and testing with CTest.
- `devops/compose/`: `docker-compose.dev.yml`, `docker-compose.test.yml`, `docker-compose.prod.yml`, and root `docker-compose.yml`.
- `devops/monitoring/`: Prometheus configuration (`prometheus.yml`) and Grafana dashboards.
- `.github/workflows/`: GitHub Actions workflows for CI, C++ testing, C++ benchmarks, Docker publishing, and CD deployment.
- `k8s/`: Complete Kubernetes manifests (Deployments, Services, ConfigMaps, Secrets, Ingress, Probes, Resource limits).
