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
| 02 | Authentication & Multi-Tenancy | Completed |
| 03 | Organization Dashboard & User Management | Completed |
| 04 | Exam Creation & Question Management | Completed |
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

### Core API Endpoints

#### Infrastructure & Health
- `GET /api/health` — API status, uptime, node version, memory metrics
- `GET /api/health/db` — MongoDB driver status and ping latency

#### Authentication (`/api/auth`)
- `POST /api/auth/register-org` — Onboard new Organization & initial Org Admin
- `POST /api/auth/register-candidate` — Self-register student/candidate into Organization
- `POST /api/auth/login` — Sign in and issue short-lived JWT + HTTP-only refresh cookie
- `POST /api/auth/refresh` — Issue new access token using secure refresh cookie
- `POST /api/auth/logout` — Invalidate session and clear refresh cookie
- `GET /api/auth/me` — Retrieve active user session and tenant profile (Authenticated)

#### Multi-Tenant Workspaces (`/api/tenants`)
- `GET /api/tenants/public/:identifier` — Public tenant info by slug or code (Public)
- `GET /api/tenants/current` — Current workspace profile and settings (Authenticated)
- `PATCH /api/tenants/settings` — Update workspace settings (Org Admin only)

#### Organization Management (`/api/organization`)
- `GET /api/organization/dashboard` — Live counts, status, and recent audit activity (Org Admin, Super Admin)
- `GET /api/organization/profile` — Workspace institutional details and policies (Org Admin, Super Admin)
- `PATCH /api/organization/profile` — Update permitted profile fields and assessment defaults (Org Admin, Super Admin)
- `GET /api/organization/users` — Paginated workspace members with search and role/status filtering
- `GET /api/organization/users/:userId` — Specific member identity details
- `PATCH /api/organization/users/:userId/status` — Activate/Deactivate member (self-modification blocked)
- `GET /api/organization/proctors` — Paginated proctor roster with search and status filtering
- `POST /api/organization/proctors` — Create/invite proctor with secure temporary credentials generation
- `PATCH /api/organization/proctors/:userId/status` — Activate/Deactivate proctor account
- `GET /api/organization/candidates` — Paginated candidate roster with search and status filtering
- `GET /api/organization/candidates/:userId` — Candidate profile details
- `PATCH /api/organization/candidates/:userId/status` — Activate/Deactivate candidate account
- `GET /api/organization/audit-logs` — Workspace audit trail and activity history

#### Platform Administration (`/api/platform`)
- `GET /api/platform/dashboard` — Global platform metrics across all tenants (Super Admin only)
- `GET /api/platform/organizations` — Paginated organizations with member breakdown (Super Admin only)
- `GET /api/platform/organizations/:organizationId` — Organization details & user count breakdown (Super Admin only)
- `PATCH /api/platform/organizations/:organizationId/status` — Activate / Suspend / Reactivate organization (Super Admin only)

#### Question Bank Management (`/api/questions`)
- `GET /api/questions` — Paginated questions list with search, status, difficulty, subject, and type filters
- `POST /api/questions` — Create question (supports `MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `DESCRIPTIVE`)
- `GET /api/questions/taxonomy/subjects` — Distinct list of organization subjects
- `GET /api/questions/taxonomy/topics` — Distinct list of organization topics
- `GET /api/questions/:questionId` — Retrieve single question details
- `PATCH /api/questions/:questionId` — Update question statement, options, marks, or metadata
- `POST /api/questions/:questionId/duplicate` — Clone question into new draft copy
- `PATCH /api/questions/:questionId/archive` — Soft-archive question

#### Examination Management (`/api/exams`)
- `GET /api/exams` — Paginated exams list with search, status, and subject filters
- `POST /api/exams` — Create draft examination with structured sections
- `GET /api/exams/:examId` — Retrieve exam with populated question details
- `PATCH /api/exams/:examId` — Update draft exam (blocked if `PUBLISHED`)
- `DELETE /api/exams/:examId` — Delete draft exam (blocked if `PUBLISHED`)
- `POST /api/exams/:examId/duplicate` — Duplicate exam into new `DRAFT` revision
- `POST /api/exams/:examId/validate` — Run pre-flight assessment validation engine
- `POST /api/exams/:examId/publish` — Validate, generate immutable `ExamSnapshot`, and transition status to `PUBLISHED`
- `PATCH /api/exams/:examId/archive` — Archive exam

## Current Phase: Phase 4 Completed

Phase 1 (Foundation), Phase 2 (Authentication & Multi-Tenancy), Phase 3 (Organization Workspace & Members), and Phase 4 (Exam Creation & Question Management) are implemented and fully verified:

- **Question Bank**: 4 question modalities (`MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `DESCRIPTIVE`), options validation, positive/negative marks, student explanations, and confidential faculty `evaluationGuidance`.
- **Examination Management**: Multi-section examination authoring, duration enforcement, server-side section marks aggregation, search, status filter (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
- **Validation Engine**: Pre-flight assessment check evaluating section non-emptiness, active question status, tenant ownership, negative marking permissions, and duration constraints.
- **Immutable Snapshots**: `ExamSnapshot` generation freezing exam content at publication time to protect downstream test sessions from subsequent question bank modifications.
- **Multi-Step UI Wizard**: 5-step wizard in `client/src/components/exams/ExamWizardModal.jsx` featuring inline question creation, section assignment, reordering, and pre-flight validation.
- **Strict Multi-Tenant Security & RBAC**: Tenant isolation strictly verified across all question bank and exam authoring endpoints (`CANDIDATE` and `PROCTOR` access blocked with 403 Forbidden).


**Note:** The planned concurrent-user capacity is a design target, not a benchmark result. Load testing will be performed in a later phase.

## Product Vision

Our vision is to make digital assessments simpler, more reliable, and accessible to organizations of every size.

REVITEST aims to evolve beyond a traditional examination portal into a complete assessment infrastructure.

---

**REVITEST — Assess Smarter. Perform Better.**
