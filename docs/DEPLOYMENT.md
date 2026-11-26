# REVITEST — Production Deployment & DevOps Architecture Guide

## 1. Architecture Overview

REVITEST is designed for high-availability multi-tenant cloud deployments using Docker containers, Nginx reverse proxying, and MongoDB replica sets.

```
                  [ HTTPS Traffic (443 / 80) ]
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Nginx Gateway /     │
                  │   Reverse Proxy       │
                  └───────────┬───────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────┐           ┌───────────────────────┐
│   Vite React SPA      │           │   Node.js / Express   │
│   (Nginx Alpine)      │           │   API Engine (Node 20)│
│   Port: 80            │           │   Port: 5000          │
└───────────────────────┘           └───────────┬───────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │   MongoDB Database    │
                                    │   Replica Set (v7.0)  │
                                    └───────────────────────┘
```

---

## 2. Docker Deployment

### 2.1 Quick Start (Development / Staging)

To boot the entire stack locally with Docker Compose:

```bash
docker compose up -d --build
```

This starts:
- `revitest-mongo`: MongoDB 7.0 on port 27017 with persistent volume `revitest_mongo_data`.
- `revitest-backend`: Express API server on port 5000 with automatic health checks.
- `revitest-frontend`: React client on port 80.

### 2.2 Production Stack (`docker-compose.prod.yml`)

The production compose specification includes:
- Container memory resource constraints.
- Dedicated bridge networking (`revitest-prod-net`).
- Restart policies (`restart: always`).
- Gateway reverse proxy with request rate limiting.

To deploy in production:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 3. Environment Variables Reference

| Variable | Environment | Required | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | All | Yes | `production` or `development` |
| `PORT` | Backend | No | API port (default: `5000`) |
| `MONGODB_URI` | Backend | Yes | MongoDB connection string (e.g. `mongodb://mongo:27017/revitest`) |
| `CLIENT_URL` | Backend | Yes | Canonical URL of the client application |
| `JWT_ACCESS_SECRET` | Backend | Yes | Secret for signing short-lived access tokens ($\ge 32$ chars) |
| `JWT_REFRESH_SECRET` | Backend | Yes | Secret for signing long-lived refresh tokens ($\ge 32$ chars) |
| `COOKIE_SECRET` | Backend | Yes | Secret for signing HTTP-only cookies ($\ge 32$ chars) |
| `RATE_LIMIT_MAX` | Backend | No | Max API requests per 15-minute window (default: `300`) |

---

## 4. Health Checks & Monitoring

The backend exposes three automated health and monitoring endpoints:

- `GET /api/health`: Comprehensive system telemetry (uptime, Node version, memory usage, security status).
- `GET /api/health/db`: Database connectivity verification and ping latency measurement.
- `GET /api/health/indexes`: Full audit of database compound indexes and partial filter expressions.
