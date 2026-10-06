# ==============================================================================
# QuantPulse Frontend React SPA - Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React Assets
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Define build arguments for frontend environment configuration
ARG VITE_API_BASE_URL=""
ARG VITE_BACKEND_URL=""
ARG VITE_DEFAULT_SYMBOL="RELIANCE"

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_DEFAULT_SYMBOL=${VITE_DEFAULT_SYMBOL}

RUN rm -rf dist *.tsbuildinfo && npm run build

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Nginx Web Server
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom Nginx configuration
COPY devops/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
