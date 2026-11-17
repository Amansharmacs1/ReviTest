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

