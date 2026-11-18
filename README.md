# REVITEST

### The Next Generation of Digital Assessments.

REVITEST is a multi-tenant SaaS platform designed to simplify, manage, and modernize online examinations and digital assessments.

Built for colleges, universities, coaching institutes, and companies, REVITEST aims to provide a unified environment for creating examinations, managing candidates, conducting secure assessments, automating evaluation, and analyzing performance.

---

## Overview

REVITEST is being developed as a scalable examination and assessment management ecosystem.

The platform is designed around independent organizational workspaces, allowing multiple institutions and businesses to conduct assessments through a centralized platform while maintaining their own users, examinations, and results.

### Target Organizations

- Colleges and Universities
- Coaching Institutes
- Recruitment and HR Teams
- Corporate Training Organizations
- Independent Assessment Providers

## Core Capabilities

The planned platform includes:

- **Multi-Tenant Architecture** — Independent workspaces and organization-level data isolation.
- **User & Role Management** — Platform administrators, organization owners, faculty, and candidates.
- **Exam Management** — Create, configure, schedule, and publish assessments.
- **Question Management** — MCQ creation, question banks, randomized questions, and configurable marking schemes.
- **Examination Engine** — Timers, question navigation, autosave, and attempt recovery.
- **Exam Security** — Browser-based tab-switch and fullscreen violation monitoring.
- **Automated Evaluation** — Automatic scoring and result generation.
- **Analytics & Reports** — Performance insights, rankings, and downloadable reports.
- **Integrations** — Google Sheets synchronization and future external integrations.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Routing | React Router |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Security | Helmet, CORS, Rate Limiting |
| Authentication | JWT (planned) |
| Background Jobs | Redis, BullMQ (planned) |
| Testing | ESLint, API Testing, k6 (planned) |

## Architecture

REVITEST follows a modular monolithic architecture with separate frontend and backend applications.

```text
REVITEST/
│
├── client/
│   └── React + Vite Application
│
├── server/
│   └── Express + Node.js API
│
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
│
├── README.md
└── package.json
```

The architecture is being designed to support organization-level data isolation and future horizontal scaling.

## Development Progress

| Phase | Description | Status |
|---|---|---|
| 01 | Project Foundation | Completed |
| 02 | Authentication & Multi-Tenancy | Upcoming |
| 03 | Organization Dashboard & User Management | Planned |
| 04 | Exam Creation & Question Management | Planned |
| 05 | Exam Scheduling & Student Access | Planned |
| 06 | Examination Engine | Planned |
| 07 | Proctoring & Examination Security | Planned |
| 08 | Evaluation, Results & Analytics | Planned |
| 09 | Integrations & SaaS Management | Planned |
| 10 | Performance, Security & Deployment | Planned |

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- MongoDB
- Git

### Clone Repository

```bash
git clone https://github.com/Amansharmacs1/ReviTest.git
cd ReviTest
```

### Environment Configuration

Configure the backend environment variables in `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/revitest
CLIENT_URL=http://localhost:5173
```

Configure the frontend environment variables in `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Never commit actual environment files or secrets.

### Install Dependencies

```bash
npm install
```

If the root package does not install workspace dependencies, install them separately:

```bash
cd client && npm install
cd ../server && npm install
```

### Run Development Servers

Use the scripts configured in the respective package.json files:

```bash
# Run both client and server concurrently from root
npm run dev
```

Or run services individually:

```bash
# Terminal 1: Backend API
npm run dev:server

# Terminal 2: Frontend Client
npm run dev:client
```

The current local development services are:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### API Health Checks

```text
GET /api/health
GET /api/health/db
```

## Current Phase: Phase 1 Completed

The initial foundation has been implemented and locally verified.

- React + Vite frontend initialized.
- Express backend configured.
- MongoDB connectivity established.
- Centralized API error handling.
- Security middleware configured.
- Frontend and backend communication verified.
- Responsive landing page implemented.
- ESLint and Prettier checks passed.
- Production frontend build verified.
- Architecture and development documentation created.

**Note:** The planned concurrent-user capacity is a design target, not a benchmark result. Load testing will be performed in a later phase.

## Product Vision

Our vision is to make digital assessments simpler, more reliable, and accessible to organizations of every size.

REVITEST aims to evolve beyond a traditional examination portal into a complete assessment infrastructure.

---

**REVITEST — Assess Smarter. Perform Better.**
