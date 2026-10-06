# QuantPulse DevOps & Infrastructure Guide

Welcome to the comprehensive DevOps documentation for **QuantPulse-VP**, a production-grade quantitative trading and analytics platform.

---

## 1. System Architecture

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
                                              │ Stdin/Stdout  │ Wire Protocol
                                              ▼               ▼
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

## 2. Quickstart & Local Development

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- Node.js 20+ (optional for native runs)
- CMake 3.20+ and GCC 13+ (optional for native C++ compilation)

### Start Full Stack with Docker Compose
```bash
# Clone the repository
git clone https://github.com/your-org/QuantPulse-VP.git
cd QuantPulse-VP

# Start development stack (with hot reloading & volume mounts)
docker compose -f devops/compose/docker-compose.dev.yml up --build

# Or use the helper script
./devops/scripts/dev.sh
```

### Accessing Local Services
- **Web UI Application**: [http://localhost:5173](http://localhost:5173) (Dev) or [http://localhost:80](http://localhost:80) (Prod)
- **Backend API**: [http://localhost:8000/api](http://localhost:8000/api)
- **Health Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)
- **Prometheus Metrics**: [http://localhost:8000/metrics](http://localhost:8000/metrics)
- **Prometheus Dashboard**: [http://localhost:9090](http://localhost:9090)
- **Grafana Visualizations**: [http://localhost:3000](http://localhost:3000) (User: `admin`, Pass: `quantpulse`)

---

## 3. Production Deployment with Docker Compose

### 1. Launch Production Cluster
```bash
# Build and start all production containers with restart policies & isolated network
./devops/scripts/prod.sh
```

### 2. Verify Health
```bash
./devops/scripts/healthcheck.sh
```

### 3. Stop Production Services
```bash
docker compose -f devops/compose/docker-compose.prod.yml down
```

> [!WARNING]
> **Destructive Operation**: Running `docker compose down -v` will delete all persistent volume data, including historical MongoDB market bars and Grafana settings.

---

## 4. Continuous Integration & Testing

### Running All Tests Locally
```bash
./devops/scripts/test.sh
```

### GitHub Actions CI Pipelines
- **`ci.yml`**: Runs on every pull request and push:
  - Backend TypeScript compilation & 96 Vitest unit/integration tests.
  - Frontend TypeScript checking & Vite production bundling.
  - Native C++20 release build & 661 Google Tests via CTest.
  - DevSecOps `npm audit` dependency security scanning.
- **`benchmark.yml`**: Runs C++ Google Benchmark performance microbenchmarks and stores JSON artifacts.
- **`docker.yml`**: Builds and publishes multi-stage images to GitHub Container Registry (`ghcr.io`).
- **`deploy.yml`**: Automated zero-downtime deployment and health check verification.

---

## 5. Observability & Monitoring

### Metrics Collected by Prometheus
- `process_uptime_seconds`: Total Node.js runtime.
- `quantpulse_active_http_requests`: Gauge of in-flight requests.
- `quantpulse_http_requests_total`: Counter by method, route, and status.
- `quantpulse_http_request_duration_seconds`: Histogram summary of latency.
- `quantpulse_cpp_executions_total`: C++ engine call count by command and status.
- `quantpulse_cpp_execution_duration_seconds`: C++ engine compute latency.

### Pre-provisioned Grafana Dashboards
1. **QuantPulse System Overview**: HTTP request throughput, error rate, latency distribution, C++ invocation frequency.
2. **QuantPulse Quant Performance**: Sub-millisecond volatility calculations, order flow imbalance timings, and backtest execution profiling.

---

## 6. Kubernetes Architecture (`k8s/`)

QuantPulse includes production-ready Kubernetes manifests in `k8s/`:
- **Namespace**: `quantpulse`
- **Frontend**: 2 replicas with rolling updates and Nginx static delivery.
- **Backend**: 2 replicas with bundled C++ engine, readiness/liveness probes.
- **MongoDB**: StatefulSet with 20Gi PersistentVolumeClaim.
- **Redis**: In-cluster cache deployment.
- **Ingress**: Reverse proxy with body size limits (50MB) and SSL termination.

### Deploying to Kubernetes
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml.example
kubectl apply -f k8s/mongodb/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml
```
