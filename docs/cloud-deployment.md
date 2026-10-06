# QuantPulse Cloud Deployment Guide: Render, Vercel, MongoDB Atlas & Redis

This guide walks through deploying the complete **QuantPulse** platform publicly to cloud environments (Render, Vercel, MongoDB Atlas, and Redis) on free/low-cost tiers.

---

## 1. Cloud Architecture Overview

```
                                  USER BROWSER
                                       │
                                       │ HTTPS
                                       ▼
                       ┌──────────────────────────────┐
                       │     React 19 Frontend        │
                       │   (Vercel / Render Static)   │
                       └──────────────┬───────────────┘
                                      │
                                      │ HTTPS / REST / SSE
                                      ▼
                       ┌──────────────────────────────┐
                       │     Node.js Backend API      │
                       │    (Render Web Service)      │
                       └──────┬───────────────┬───────┘
                              │               │
               HTTP / Private │               │ Wire Protocol (TLS)
                      Network ▼               ▼
               ┌─────────────────────┐ ┌─────────────────────┐
               │  C++ Quant Engine   │ │    MongoDB Atlas    │
               │ (Render Priv. Svc)  │ │   (M0 Free Tier)    │
               │  - Volatility / OFI │ └──────────────┬──────┘
               │  - Squeeze / Risk   │                │
               └─────────────────────┘                ▼
                                       ┌─────────────────────┐
                                       │    Upstash Redis    │
                                       │ (Serverless Cache)  │
                                       └─────────────────────┘
```

---

## 2. Infrastructure Setup (Step-by-Step)

### Step 1: Database (MongoDB Atlas Free M0 Tier)
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Cluster** (shared tier).
3. Under **Database Access**, create a database user (e.g. `quantpulse-app` with strong password).
4. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere) so cloud containers can connect.
5. Under **Clusters > Connect > Drivers**, copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/quantpulse?retryWrites=true&w=majority
   ```

### Step 2: Caching (Upstash Redis Free Tier)
1. Sign up at [Upstash Redis](https://upstash.com).
2. Create a new Redis database (e.g. `quantpulse-cache`).
3. Copy the Redis URL:
   ```text
   redis://default:<password>@<endpoint>.upstash.io:6379
   ```

### Step 3: Automated Deployment via Render Blueprint (`render.yaml`)
1. Fork or push this repository to your GitHub account.
2. Sign in to [Render.com](https://render.com).
3. Click **New > Blueprint** and connect your `QuantPulse-VP` repository.
4. Render will read [`render.yaml`](file:///home/kali/project/QuantPulse-VP/render.yaml) and automatically create 3 services:
   - `quantpulse-cpp-engine` (C++20 Quantitative Microservice)
   - `quantpulse-backend` (Node.js API Layer)
   - `quantpulse-frontend` (React Static Site)
5. Fill in the required environment secrets when prompted:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `REDIS_URL`: Your Upstash Redis URL.
   - `ALPHA_VANTAGE_API_KEY`: (Optional) Your Alpha Vantage key.

### Step 4: Frontend Deployment on Vercel (Alternative)
If preferred, deploy the frontend separately on Vercel:
1. Import the repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Configure Environment Variable:
   - `VITE_API_BASE_URL`: `https://quantpulse-backend.onrender.com`
4. Deploy!

---

## 3. Environment Variables Reference

| Variable Name | Service | Recommended Cloud Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Backend | `production` |
| `PORT` | Backend / C++ | Assigned dynamically by platform (defaults to `8000` / `8080`) |
| `LOG_FORMAT` | Backend | `json` |
| `MONGODB_URI` | Backend | `mongodb+srv://user:pass@cluster.mongodb.net/quantpulse` |
| `MONGODB_DATABASE` | Backend | `quantpulse` |
| `REDIS_URL` | Backend | `redis://default:pass@endpoint.upstash.io:6379` |
| `CPP_ENGINE_URL` | Backend | `http://quantpulse-cpp-engine:8080` (Internal Render address) |
| `CORS_ORIGIN` | Backend | `https://quantpulse-frontend.onrender.com` or `*` |
| `MARKET_DATA_PROVIDER`| Backend | `simulated` or `alphavantage` |
| `VITE_API_BASE_URL` | Frontend | `https://quantpulse-backend.onrender.com` |

---

## 4. Public Health Check & Diagnostic Endpoints

After deployment, verify the live services using their public HTTPS URLs:

| Service | Endpoint | Expected HTTP Status | Expected JSON Output |
| :--- | :--- | :--- | :--- |
| **Frontend** | `https://your-frontend.vercel.app/` | `200 OK` | HTML Single Page Application |
| **Backend** | `https://your-backend.onrender.com/health` | `200 OK` | `{"status":"ok","dependencies":{"database":{"status":"connected"},"cppEngine":{"status":"available"}}}` |
| **Backend Liveness** | `https://your-backend.onrender.com/health/live` | `200 OK` | `{"status":"live"}` |
| **Backend Readiness** | `https://your-backend.onrender.com/health/ready`| `200 OK` | `{"status":"ready"}` |
| **Prometheus Metrics**| `https://your-backend.onrender.com/metrics` | `200 OK` | `process_uptime_seconds ...` |
| **C++ Engine** | `http://quantpulse-cpp-engine:8080/health` | `200 OK` | `{"status":"ok","service":"quantpulse-cpp-engine"}` |

---

## 5. Troubleshooting & Cloud Edge Cases

### 1. Free-Tier Cold Starts (Spin-down on Inactivity)
- **Symptom**: First request after 15 minutes of inactivity takes 30-50 seconds.
- **Reason**: Free-tier web services on Render/Koyeb spin down to 0 replicas when idle.
- **Resolution**: Use an uptime monitor (e.g. UptimeRobot, BetterUptime) to ping `https://your-backend.onrender.com/health/live` every 5 minutes to keep containers warm.

### 2. Backend Cannot Reach C++ Engine
- **Check**: Ensure `CPP_ENGINE_URL` is set to the internal service name (e.g. `http://quantpulse-cpp-engine:8080`).
- **Fallback**: The backend includes an automated fallback: if `CPP_ENGINE_URL` is unreachable or unset, the backend invokes its bundled local binary `/usr/local/bin/quantpulse_cli`.

### 3. MongoDB Connection Timeout
- **Check**: In MongoDB Atlas, verify **Network Access** includes `0.0.0.0/0` (Allow Access from Anywhere) and database user credentials are correct.

### 4. CORS Errors on Web Terminal
- **Check**: Ensure `CORS_ORIGIN` in the backend environment matches your deployed frontend domain (`https://your-app.vercel.app`) or is set to `*`.

---

## 6. Rollback Procedures

```bash
# Render CLI Rollback
render deploys list --serviceId <srv-id>
render deploys rollback <deploy-id> --serviceId <srv-id>

# Vercel CLI Rollback
vercel rollback <deployment-url>
```
