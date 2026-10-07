# QuantPulse-VP

**Production-Grade Quantitative Trading, Market Microstructure & Analytics Platform**

QuantPulse is an enterprise quantitative analytics and market-microstructure research platform powered by a high-performance C++20 quantitative engine, a Node.js/TypeScript API layer, MongoDB timeseries storage, and a modern React 19 web terminal.

---

## 🏗️ Architecture

```
                                  Internet
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    Nginx (Port 80 / 443)     │
                      │  Reverse Proxy & Static SPA  │
                      └───────┬──────────────┬───────┘
                              │              │
                   / (Static) │              │ /api, /health, /metrics
                              ▼              ▼
                     ┌─────────────┐   ┌──────────────────────────────┐
                     │  Frontend   │   │     QuantPulse Backend       │
                     │  (HTML/JS)  │   │     (Node.js 22 + TS)        │
                     └─────────────┘   └──────┬───────────────┬───────┘
                                              │               │
                                 Stdin/Stdout │               │ Wire Protocol
                                     JSON IPC ▼               ▼
                                       ┌─────────────┐  ┌─────────────┐
                                       │ C++ Engine  │  │   MongoDB   │
                                       │(quantpulse_ │  │ (Port 27017)│
                                       │    cli)     │  └─────────────┘
                                       └─────────────┘        │
                                              ▲               ▼
                                              │         ┌─────────────┐
                                              └─────────┤    Redis    │
                                                        │ (Port 6379) │
                                                        └─────────────┘
```

---

## ⚡ Quickstart (Docker Compose)

### 1. Start Complete Development Stack
```bash
# Clone the repository
git clone https://github.com/your-org/QuantPulse-VP.git
cd QuantPulse-VP

# Start services (MongoDB, Redis, Backend, Frontend with hot-reloading)
docker compose -f devops/compose/docker-compose.dev.yml up --build

# Or use the helper script:
./devops/scripts/dev.sh
```

### 2. Start Production Stack
```bash
./devops/scripts/prod.sh
```

### 3. Service URLs
| Service | Development URL | Production URL |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` | `http://localhost:80` |
| **Backend API** | `http://localhost:8000/api` | `http://localhost/api` (via Nginx) |
| **Health Check** | `http://localhost:8000/health` | `http://localhost/health` |
| **Prometheus Metrics**| `http://localhost:8000/metrics` | `http://localhost:9090` (Prometheus) |
| **Grafana Dashboards**| N/A | `http://localhost:3000` (`admin`/`quantpulse`) |

---

## 🧪 Testing & Quality Gates

Run all automated unit, integration, typecheck, and C++ tests:
```bash
./devops/scripts/test.sh
```

- **Backend Tests**: 96 Vitest unit & integration tests (`cd backend && npm test`)
- **C++20 Engine Tests**: 661 Google Tests via CTest (`ctest --test-dir cpp-engine/build-release --output-on-failure`)
- **TypeScript Typechecking**: Zero errors across backend & frontend (`npm run typecheck`)
- **C++ Benchmarks**: 120+ microbenchmarks measuring order book matching, volatility, and OFI latency (`./cpp-engine/build-release/quantpulse_benchmarks`)

---

## 🚢 Continuous Integration & Deployment (CI/CD)

The repository includes enterprise GitHub Actions workflows under `.github/workflows/`:
- **`ci.yml`**: Backend & frontend testing, TypeScript verification, C++ Release compilation & 661 CTests, and security auditing on every PR.
- **`benchmark.yml`**: Automates Google Benchmark execution and stores JSON performance reports as artifacts.
- **`docker.yml`**: Builds and publishes multi-stage container images to GitHub Container Registry (`ghcr.io`).
- **`deploy.yml`**: Automated zero-downtime deployment with health check verification and instant rollback.

---

## 📊 Observability & Monitoring

Prometheus and Grafana configurations are pre-packaged under `devops/monitoring/`:
- **Prometheus** (`prometheus.yml`): Scrapes `/metrics` for HTTP latency, request rate, and C++ execution duration.
- **Grafana Dashboards**:
  - *QuantPulse System Overview*: Real-time traffic, error rates, active requests, and uptime.
  - *QuantPulse Quant Performance*: Sub-millisecond volatility calculations, order flow imbalance timings, and backtest profiling.

---

## 📚 Documentation Index

- [Complete DevOps Implementation & Failure Recovery Manual](DEVOPS_ARCHITECTURE_AND_IMPLEMENTATION.md)
- [DevOps Architecture & Operations Guide](docs/devops.md)
- [Public Cloud Deployment Guide](docs/cloud-deployment.md)
- [DevOps Repository Audit](docs/devops-audit.md)
- [Deployment & Rollback Strategy](docs/deployment.md)
- [Operational Runbook & Troubleshooting](docs/RUNBOOK.md)
- [System Architecture Specification](docs/architecture.md)
- [Quantitative Algorithms, Mathematical Models & Viva Q&A Guide](docs/ALGORITHMS_GUIDE.md)
- [Quantitative Mathematical Models Specification](docs/quant-model.md)
- [Quantitative Concepts & Architectural Formulas](docs/concepts.md)
- [Benchmarking Guide](docs/benchmarking.md)
