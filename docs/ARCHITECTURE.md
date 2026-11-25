# REVITEST — System Architecture Document

## 1. Architectural Philosophy

REVITEST is designed as a **Production-Oriented Modular Monolith**. 

### Why a Modular Monolith over Microservices?
For an examination platform scaling to 1,000+ concurrent students, premature distributed microservices introduce:
- Distributed transaction complexity (two-phase commits during exam submissions)
- Network serialization latency (HTTP/gRPC hops between question service, submission service, and scoring service)
- Massive DevOps operational overhead (multiple container clusters, service meshes, distributed tracing)

Instead, REVITEST adopts a **modular monolith** with clean bounded contexts:
- Each module (Auth, Organization, Examination, Evaluation, Analytics) maintains strict domain boundaries.
- The Node.js event loop handles I/O asynchronously with minimal memory footprint.
- Database access utilizes connection pooling configured for burst loads.
- When vertical limits are reached, the stateless Express instance scales horizontally behind an L4/L7 load balancer with zero code alterations.

---

## 2. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (BROWSER)                          │
│                                                                        │
│  React 18 + Vite Single Page Application                                │
│  - React Router DOM (Declarative View Routing)                          │
│  - Zustand (Telemetry & State Store)                                   │
│  - Axios Client (Interceptors, Retries, Latency Measurement)           │
│  - Tailwind CSS Enterprise Token System                                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                             HTTPS / JSON REST
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                      REVERSE PROXY & GATEWAY                           │
│  (e.g., NGINX / Cloudflare / AWS ALB)                                  │
│  - SSL Termination                                                     │
│  - DDoS Shield & Edge Caching for Static Assets                        │
│  - Subdomain Routing (e.g., orgname.revitest.com)                      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                     BACKEND API ENGINE (NODE / EXPRESS)                │
│                                                                        │
│  Security & Middleware Stack:                                          │
│  ├── Helmet (HTTP Security Headers)                                    │
│  ├── CORS (Strict Client Origin Matching)                              │
│  ├── Morgan (Structured Access Logging)                                │
│  ├── Express Rate Limiting (IP-based Request Throttling)               │
│  └── Centralized Error & 404 Handlers                                  │
│                                                                        │
│  Core Architectural Layers:                                            │
│  ├── Controllers: Request Parsing, Validation, Response Formatting     │
│  ├── Services: Business Domain Rules & Logic                           │
│  ├── Models: Mongoose Schemas & Tenant Query Filters                   │
│  └── Utilities: ApiResponse envelopes, AsyncHandler, Logger            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                              Mongoose Driver
                        (maxPoolSize: 50, keepAlive)
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                       PERSISTENCE LAYER (MONGODB)                      │
│                                                                        │
│  - Document Store with Compound Indexes ({ organizationId, examId })   │
│  - Multi-Tenant Logical Partitioning                                   │
│  - Write-Optimized Submission Logs                                     │
│  - Replica Set Deployment for High Availability & Read Scaling         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Tenant SaaS Design Strategy

REVITEST is a SaaS platform serving universities, colleges, coaching institutes, and corporations simultaneously.

### Logical Schema Isolation (Shared Database, Shared Schema)
For rapid scaling up to thousands of organizations, separate databases per tenant introduce connection exhaustion and database migration overhead. REVITEST implements **logical tenant isolation**:
1. **Tenant Anchor (`Organization`)**: Every organization is provisioned with a unique `ObjectId`, subdomain slug, and tenant configuration.
2. **Mandatory Tenant Keys**: Every tenant-owned collection (`User`, `Exam`, `Question`, `Attempt`, `Result`) enforces `organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true }`.
3. **Compound Indexing**: All high-throughput lookups utilize compound indexes prefixed with the tenant key:
   - `{ organizationId: 1, examCode: 1 }`
   - `{ organizationId: 1, studentId: 1, examId: 1 }`
4. **Tenant Isolation Middleware (Phase 2)**: Resolves the tenant from JWT claims or subdomain header and automatically scopes all database queries to the requesting tenant.

---

## 4. Engineering for 1,000+ Concurrent Examination Participants

One of REVITEST's central engineering benchmarks is handling **1,000 active students simultaneously** taking an exam.

### The Concurrency Problem in Online Exams
In a standard web app, 1,000 active users generate dispersed traffic. In an **examination platform**, examinees generate synchronized bursts:
1. **The Exam Start Spike**: Exactly at 10:00:00 AM, 1,000 examinees request the exam questions within a 15-second window.
2. **Periodic Autosave Bursts**: Every examinee saves answer selections every 10–30 seconds.
3. **The Exam Conclusion Spike**: When the timer expires, 1,000 submissions arrive within 3 seconds.

### Concurrency Mitigation Strategies

#### 1. Connection Pool Optimization
- Standard Mongoose defaults to 5 connections, causing severe query queuing under 1,000 concurrent users.
- REVITEST configures `maxPoolSize: 50` per node process with `socketTimeoutMS: 45000` and `serverSelectionTimeoutMS: 5000`.

#### 2. Stateless Architecture & Horizontal Replicas
- The Express backend retains zero session state in memory (no stateful in-memory exam timers).
- If one Node.js instance handles 250 concurrent active websockets/requests comfortably, 4 Node.js instances behind a round-robin load balancer easily support 1,000+ examinees.

#### 3. Client-Side Answer Buffering & Debounced Auto-Save
- When a student clicks an option (A, B, C, D), the answer is instantly updated in the client's local storage (zero UI lag).
- The client debounces sync requests (e.g., 2-second debounce) or sends periodic heartbeat delta batches, transforming thousands of instant clicks into manageable write operations.

#### 4. Lean Projection Queries
- Read operations for questions will exclude internal answer keys and rationale (`select('-correctOption -explanation')`), reducing network payload size from megabytes to kilobytes.

---

## 5. Security & Protection Infrastructure

1. **Helmet HTTP Headers**:
   - `Content-Security-Policy`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN` (prevents malicious iframing during exams)
   - `Strict-Transport-Security` (forces TLS)
2. **Cross-Origin Resource Sharing (CORS)**:
   - Configurable allowed origins strictly verified against `CLIENT_URL` in environment config.
3. **Rate Limiting**:
   - `express-rate-limit` prevents brute-force abuse of API endpoints.
4. **Graceful Process Lifecycle**:
   - Clean handling of `SIGTERM` and `SIGINT` signals ensuring active HTTP transactions and MongoDB connections complete before node shutdown.

---

## 6. Phase 3 Architecture: Organization Workspace, RBAC & Audit Trails

### 6.1 Tenant Authorization Authority
All workspace operations under `/api/organization/*` enforce non-negotiable multi-tenant boundaries:
- `req.user.organizationId` (extracted and verified from the validated JWT access token) serves as the authoritative boundary anchor.
- Client headers or request payloads cannot override tenant boundaries for `ORG_ADMIN`, `PROCTOR`, or `CANDIDATE`.
- Only `SUPER_ADMIN` accounts may query across tenants by providing explicit target parameters.

### 6.2 Data Partitioning & Safe Projections
- Queries are strictly indexed and compound-scoped: `{ organizationId: 1, role: 1, status: 1 }` and `{ organizationId: 1, createdAt: -1 }`.
- Read operations omit sensitive fields via `.select('-password -tokenVersion')` and execute with `.lean()` for high read throughput.
- Soft deactivation: Member deactivations increment `user.tokenVersion`, immediately invalidating active JWT session tokens.
- Self-deactivation prevention: Administrators are prohibited from modifying their own account status to prevent locking workspaces.
- Protected Organization Fields: Immutable fields (`_id`, `slug`, `code`, `status`, `plan`) are strictly stripped from update payloads.

### 6.3 Audit Logging Engine
The `AuditLog` collection records all critical workspace events:
- Indexed by `{ organizationId: 1, createdAt: -1 }` and `{ actorId: 1, createdAt: -1 }`.
- Tracks: `actorId`, `actorRole`, `actorName`, `action`, `targetType`, `targetId`, `targetName`, `description`, `metadata`, `ipAddress`, and `userAgent`.
- Captures operations including: `USER_ACTIVATED`, `USER_DEACTIVATED`, `PROCTOR_CREATED`, `ORG_PROFILE_UPDATED`, `ORG_SUSPENDED`, and `ORG_REACTIVATED`.

### 6.4 Platform Super Administration
- Accessible only to accounts with role `SUPER_ADMIN`.
- Route `/app/platform` and `/api/platform/*` provide global multi-tenant visibility, organization search, aggregated user counts, and instantaneous workspace suspension/reactivation.
- Organization suspension immediately blocks all tenant members across all `/api/organization/*` routes via route-level verification middleware.

---

## 7. Phase 4 Architecture: Assessment Authoring, Question Banks & Immutable Snapshots

### 7.1 Question Bank & Multitenancy
- Questions reside in `Question` collection, indexed by `{ organizationId: 1, status: 1, subject: 1 }` and `{ organizationId: 1, difficulty: 1 }`.
- Supports 4 question types: `MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `DESCRIPTIVE`.
- Confidentiality isolation: `evaluationGuidance` is strictly stripped from candidate-facing projections via `toSafeObject(role)`.

### 7.2 Exam Validation Engine
- Centralized pre-flight engine (`examValidation.service.js`) computes all section marks and total exam marks server-side.
- Enforces institutional policy: minimum/maximum exam duration limits, instructions requirements, negative marking permissions, and question status checks.

### 7.3 Immutability via `ExamSnapshot`
- Once an exam transitions from `DRAFT` to `PUBLISHED`, an `ExamSnapshot` document is created containing deep copies of all questions and section structures.
- Direct edits and deletions of published exams are prohibited (`PATCH` / `DELETE` return HTTP 400).
- Examination delivery engines (Phase 6) and Evaluation engines (Phase 8) execute exclusively against snapshots, guaranteeing tamper-proof consistency.

---

## 8. Phase 5 Architecture: Exam Scheduling, Candidate Assignment & Access Control

### 8.1 Snapshot-Anchored Scheduling
- `ExamSchedule` documents strictly require a published `Exam` and bind directly to its immutable `ExamSnapshot` (`examSnapshotId`).
- Start and end timestamps are stored in UTC. Real-time status (`SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`) is dynamically computed server-side.
- Compound indexes optimize lookups: `{ organizationId: 1, status: 1, startTime: 1 }` and `{ organizationId: 1, examId: 1 }`.

### 8.2 Candidate Enrollment & Cohorts
- `ScheduleCandidate` models the enrollment of examinees to specific scheduled assessments.
- Unique compound index `{ scheduleId: 1, candidateId: 1 }` enforces single enrollment per assessment.
- Supports individual manual assignment, batch/department matching, or organization-wide enrollment.

### 8.3 Server-Authoritative Eligibility Engine
- Candidate test entrance is governed exclusively by `examEligibility.service.js`.
- Verifies: candidate role, account active state, active tenant state, assignment existence, UTC access window boundaries, late-entry grace periods, and maximum attempt limits.
- Client payloads are never trusted for authorization; candidate examinee payloads strictly omit answer keys and scoring rubrics.



