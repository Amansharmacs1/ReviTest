# REVITEST — Multi-Tenant Online Examination & Assessment Management SaaS

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.x-blue.svg)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/express-4.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Version](https://img.shields.io/badge/mongodb-mongoose-green.svg)](https://mongoosejs.com/)
[![Tailwind CSS](https://img.shields.io/badge/tailwindcss-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Phase](https://img.shields.io/badge/phase-1%20Foundation%20Complete-blueviolet.svg)](#current-development-phase)

---

## 1. Project Overview & Product Vision

**REVITEST** is a production-oriented, multi-tenant online examination and assessment management SaaS platform. Unlike single-institution test portals, REVITEST is engineered from the ground up to serve diverse educational institutions and corporate organizations:

- **Colleges and Universities**: High-volume semester midterms, finals, entrance exams, and departmental quizzes.
- **Coaching Institutes**: Periodic mock tests, competitive exam prep (JEE, NEET, GATE, Civil Services), and live rank benchmarking.
- **Enterprise Recruiters**: Technical aptitude assessments, candidate pre-screening, and timed hiring challenges.
- **Certification Bodies**: Proctored certification evaluations with tamper-resistant audit trails.

### Core Architectural Ambition
- **Multi-Tenant Isolation**: Complete logical data partitioning, custom subdomain/branding workspaces, and organization-scoped role hierarchies.
- **High Concurrency Scale**: Seamlessly handling **1,000+ simultaneous examination participants** submitting answers in synchronized timeframes without API thread locking or MongoDB connection exhaustion.
- **State Recovery & Fault Tolerance**: Client-side offline buffering with automatic background recovery ensuring zero lost answers during unexpected network drops or device crashes.
- **Proctoring Integrity**: Browser-level lockdown, tab-switching telemetry, copy-paste prevention, and anomaly auditing.
- **Instant Auto-Evaluation**: Real-time MCQ scoring, percentile calculations, question difficulty analysis, and direct synchronization with Google Sheets.

---

## 2. Technology Stack

### Frontend Client
| Technology | Role |
|---|---|
| **React 18** | Declarative component UI library |
| **Vite** | Next-generation frontend build tool and dev server |
| **Tailwind CSS** | Utility-first responsive styling framework |
| **React Router DOM v6** | Declarative client-side routing |
| **Axios** | Pre-configured HTTP client with interceptors |
| **Zustand** | Lightweight reactive state store for system telemetry |
| **Lucide React** | Enterprise-grade iconography |

### Backend API Server
| Technology | Role |
|---|---|
| **Node.js (v18+)** | High-performance asynchronous runtime |
| **Express.js** | Modular REST API framework (using native ES Modules) |
| **MongoDB & Mongoose** | NoSQL document persistence with schema enforcement |
| **Helmet** | HTTP security headers |
| **CORS** | Configurable Cross-Origin Resource Sharing |
| **Morgan** | Structured HTTP request logger |
| **express-rate-limit** | IP-based request throttling against brute force/DDoS |
| **dotenv** | Environment configuration management |

### Development & Tooling
- **npm**: Package management and monorepo workspace orchestration
- **Nodemon**: Hot-reloading backend development server
- **ESLint**: Static code analysis and syntax enforcement
- **Prettier**: Code formatting

---

## 3. Project Structure

```text
REVITEST/
│
├── client/                     # Frontend Vite + React application
│   ├── public/                 # Static public assets (favicons, etc.)
│   ├── src/
│   │   ├── assets/             # Images, static media
│   │   ├── components/
│   │   │   ├── common/         # Reusable UI primitives (Button, Badge, Card, SystemHealthCard)
│   │   │   └── layout/         # Structural components (Navbar, Footer, MainLayout)
│   │   ├── pages/              # Route views (HomePage, NotFoundPage)
│   │   ├── routes/             # AppRoutes configuration
│   │   ├── services/           # Axios HTTP client and domain services (apiClient, healthService)
│   │   ├── hooks/              # Reusable React hooks
│   │   ├── store/              # Zustand global state (systemStore)
│   │   ├── utils/              # Client utility functions
│   │   ├── constants/          # Static UI constants, nav links, capability metadata
│   │   ├── App.jsx             # Top-level Router container
│   │   ├── main.jsx            # React DOM mounting point
│   │   └── index.css           # Tailwind base styles and theme layer
│   ├── .env                    # Local client environment (ignored by Git)
│   ├── .env.example            # Client environment blueprint
│   ├── eslint.config.js        # ESLint flat config for client
│   ├── tailwind.config.js      # Custom theme, colors, typography, shadows
│   ├── vite.config.js          # Vite build and path alias configuration
│   └── package.json            # Client dependencies and scripts
│
├── server/                     # Backend Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # Mongoose connection pool manager with event listeners
│   │   │   └── environment.js  # Centralized environment validator and typed config
│   │   ├── controllers/        # Request controllers (health.controller.js)
│   │   ├── models/             # Schema definitions (reserved for Phase 2+)
│   │   ├── routes/             # Route routers (health.routes.js, index.js)
│   │   ├── middleware/         # Security, rate limiting, 404, and error handling
│   │   ├── services/           # Business domain services (reserved for Phase 2+)
│   │   ├── utils/              # API response wrapper, logger, asyncHandler
│   │   ├── constants/          # HTTP status codes, standard messages
│   │   ├── jobs/               # Background cron workers (reserved for Phase 2+)
│   │   ├── app.js              # Express app declaration and middleware assembly
│   │   └── server.js           # Server entry point with DB-first lifecycle and graceful shutdown
│   ├── .env                    # Local server environment (ignored by Git)
│   ├── .env.example            # Server environment blueprint
│   ├── eslint.config.js        # ESLint flat config for server
│   └── package.json            # Server dependencies and scripts
│
├── docs/                       # Technical Documentation
│   ├── ARCHITECTURE.md         # Architectural blueprint and concurrency design
│   └── DEVELOPMENT.md          # Setup instructions and coding standards
│
├── .gitignore                  # Git exclusion rules
├── README.md                   # Project overview and quick start guide
└── package.json                # Root orchestration package
```

---

## 4. Environment Configuration

### Backend (`server/.env`)
Create `server/.env` based on `server/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/revitest
CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env`)
Create `client/.env` based on `client/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

> **Security Note**: All `.env` files are strictly excluded from version control in `.gitignore`. Never commit secrets or connection strings.

---

## 5. Installation & Setup

### Prerequisites
- **Node.js**: >= 18.0.0 (v20+ recommended)
- **npm**: >= 9.0.0
- **MongoDB**: Local MongoDB instance running on port `27017` (or MongoDB Atlas connection string)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd REVITEST
```

### Step 2: Install Dependencies
Install all root, backend, and frontend dependencies in one command:
```bash
npm run install:all
```
*(Or manually run `npm install` inside `/`, `/server`, and `/client`)*

---

## 6. Running the Application

### Option A: Run Both Frontend and Backend Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
- **Backend API**: Running on [http://localhost:5000](http://localhost:5000)
- **Frontend App**: Running on [http://localhost:5173](http://localhost:5173)

### Option B: Run Services Individually
In Terminal 1 (Backend):
```bash
cd server
npm run dev
```

In Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 7. API Documentation (Phase 1 Infrastructure Endpoints)

All endpoints return uniform JSON envelopes:

### 1. General API Health
```http
GET /api/health
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "REVITEST API engine is running smoothly",
  "data": {
    "application": "REVITEST",
    "version": "1.0.0-phase1",
    "status": "healthy",
    "environment": "development",
    "timestamp": "2026-11-17T06:30:00.000Z",
    "uptime": "142s",
    "process": {
      "pid": 58210,
      "nodeVersion": "v26.9.0",
      "memory": {
        "rss": "48MB",
        "heapUsed": "24MB",
        "heapTotal": "32MB"
      }
    }
  }
}
```

### 2. Database Connectivity Health
```http
GET /api/health/db
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Database connection is active and healthy",
  "data": {
    "application": "REVITEST",
    "database": {
      "connected": true,
      "state": "connected",
      "readyState": 1,
      "host": "127.0.0.1",
      "name": "revitest",
      "pingMs": 2,
      "timestamp": "2026-11-17T06:30:00.000Z"
    }
  }
}
```

### Error Responses
Uniform error format for 404, 429, and 500:
```json
{
  "success": false,
  "message": "The requested API route was not found on this server: GET /api/unknown",
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "path": "/api/unknown",
    "method": "GET"
  }
}
```

---

## 8. Current Development Phase

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 1** | **Project Foundation** | **Completed** | Clean architecture, Express/Node.js ES Modules, MongoDB Mongoose connection manager, Vite React frontend, Tailwind design tokens, Health check telemetry, 404/Error middleware. |
| **Phase 2** | Multi-Tenancy & RBAC Auth | Planned | Organization schema, User roles (SuperAdmin, OrgAdmin, Proctor, Student), JWT + HTTP-only cookies, Tenant resolution. |
| **Phase 3** | Assessment & Question Engine | Planned | MCQ question bank, tagging, marking schemes, negative marking, randomized options. |
| **Phase 4** | Live Exam Delivery & Proctoring | Planned | Real-time synchronized clock, client offline answer caching, full-screen lockdown, tab-switch anomaly detection. |
| **Phase 5** | Evaluation, Analytics & Sheets Sync | Planned | Automated grading, leaderboards, percentile profiling, Google Sheets API bidirectional sync. |

---

## 9. Design System & Tokens

The application visual foundation follows a high-contrast, modern enterprise SaaS aesthetic:

- **Deep Navy (`#0B1220`)**: Primary structural dark surfaces, typography headers, and footers.
- **Primary Blue (`#2563EB`)**: High-intent interactive buttons, active indicators, and focus states.
- **Electric Blue (`#3B82F6`)**: Accents, telemetry indicators, and hover states.
- **Canvas Background (`#F8FAFC`)**: Soft slate canvas ensuring zero eye fatigue.
- **Surface White (`#FFFFFF`)**: High-elevation cards with subtle borders (`#E2E8F0`).
- **Body Text (`#111827`) & Muted (`#64748B`)**: Hierarchical typography for readouts and body text.

---

## 10. License

Proprietary © REVITEST. All rights reserved.

