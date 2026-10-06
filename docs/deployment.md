# QuantPulse Deployment & Infrastructure Guide

## Status: Active Target Architecture

This document defines the deployment architecture, hosting targets, environment promotion pipelines, containerization workflows, security policies, and rollback procedures for the **QuantPulse Platform**.

---

# 1. Deployment Topology

```
                         INTERNET
                            │
                         HTTPS (Port 443 / Port 80)
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Nginx Web Server   │
                 │  - React 19 SPA     │
                 │  - Reverse Proxy    │
                 └──────────┬──────────┘
                            │ /api, /health, /metrics
                            ▼
                 ┌─────────────────────┐
                 │ QuantPulse Backend  │
                 │ - Node.js 22 + TS   │
                 │ - C++ CLI Bundled   │
                 └──────┬───────┬──────┘
                        │       │
             JSON IPC   │       │ Wire Protocol
     (quantpulse_cli)   ▼       ▼
       ┌─────────────────┐     ┌─────────────────┐
       │ C++20 Engine    │     │ MongoDB Cluster │
       │ High-speed math │     │ Market Data/Bars│
       └─────────────────┘     └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Redis Cache    │
                               │  Session/Queues │
                               └─────────────────┘
```

---

# 2. Deployment Targets

### Option A: Docker Compose (Single Host / Bare-Metal / Cloud VM)
- **Manifest**: `devops/compose/docker-compose.prod.yml`
- **Helper Script**: `./devops/scripts/prod.sh`
- **Features**:
  - Isolated internal Docker bridge network (`quantpulse-internal`).
  - Nginx exposed on port 80/443; MongoDB and Redis unexposed to public network.
  - Automatic restart policies (`restart: always`).
  - Prometheus and Grafana pre-configured.

### Option B: Kubernetes Cluster (EKS / GKE / AKS / Bare Metal)
- **Manifests**: `k8s/`
- **Features**:
  - Ingress controller with SSL termination and 50MB payload limits.
  - Backend and Frontend deployments with 2+ replicas.
  - StatefulSet for MongoDB with persistent storage.
  - Liveness and Readiness probes configured against `/health/live` and `/health/ready`.

---

# 3. Environment Variables Reference

| Variable | Environment | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations and JSON structured logging |
| `PORT` | `8000` | Backend API listening port |
| `CORS_ORIGIN` | `https://app.quantpulse.io` | CORS whitelist domain |
| `MONGODB_URI` | `mongodb://mongodb:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | `quantpulse` | Main database name |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `QUANTPULSE_ENGINE_PATH` | `/usr/local/bin/quantpulse_cli` | Path to compiled C++ quantitative binary |
| `LOG_FORMAT` | `json` | Structured JSON log output |

---

# 4. Rollback Procedures

### Docker Compose Rollback:
```bash
# 1. Rollback to previous Docker image tag
docker pull ghcr.io/your-org/quantpulse-backend:sha-previous
docker pull ghcr.io/your-org/quantpulse-frontend:sha-previous

# 2. Restart services with previous image
docker compose -f devops/compose/docker-compose.prod.yml up -d

# 3. Verify health
./devops/scripts/healthcheck.sh
```

### Kubernetes Rollback:
```bash
# View rollout history
kubectl rollout history deployment/backend -n quantpulse

# Undo previous rollout
kubectl rollout undo deployment/backend -n quantpulse
kubectl rollout undo deployment/frontend -n quantpulse

# Verify status
kubectl rollout status deployment/backend -n quantpulse
```
