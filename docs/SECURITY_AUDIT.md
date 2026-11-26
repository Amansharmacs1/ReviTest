# REVITEST — Security Architecture & Forensic Audit Report

## 1. Threat Model & Security Posture

REVITEST is an assessment and certification SaaS platform where examination integrity, tenant data isolation, and answer key confidentiality are paramount.

---

## 2. Implemented Defense-in-Depth Measures

### 2.1 Strict Multi-Tenancy & Data Isolation
- Every query to organizational resources (`User`, `Exam`, `ExamSchedule`, `QuestionBank`, `AuditLog`, `ApiKey`, `WebhookSubscription`) is strictly scoped by `organizationId`.
- Cross-tenant access attempts are rejected with `404 Not Found` to prevent organizational enumeration.

### 2.2 Answer Key Confidentiality & Zero-Leak Delivery
- Question delivery during active examination sessions is sourced strictly from the sealed `ExamSnapshot`.
- The delivery pipeline rigorously strips:
  - `isCorrect` and `correctAnswers` from question options.
  - Faculty `evaluationGuidance` and marking rubrics.
- Examinee client applications never receive answer verification keys.

### 2.3 Server-Authoritative Timer & Submission Limits
- Examination duration is strictly calculated on the server:
  $$\text{endsAt} = \min(\text{startedAt} + \text{durationMinutes}, \text{schedule.endTime})$$
- Client clock manipulation has zero effect on exam duration.
- Responses received after `endsAt` are rejected with HTTP 403 and trigger automatic submission with `TIME_EXPIRED`.

### 2.4 Integrity Violation Auto-Termination
- Tab switches, fullscreen exits, window blurs, and clipboard operations are logged as immutable `ExamViolation` records.
- When an examinee exceeds `maxTabSwitches`, the server automatically flags the attempt and force-terminates it (`VIOLATION_TERMINATED`).

### 2.5 Cryptographic Storage & API Keys
- Passwords: Salted and hashed using `bcryptjs` with work factor 12.
- API Keys: Formatted as `rvt_live_<random_bytes>`. Only the SHA-256 hash is persisted; plaintext is displayed exactly once.
- Webhooks: Dispatches signed with `HMAC-SHA256` digest via `X-Revitest-Signature` header.

### 2.6 NoSQL Injection & Prototype Pollution Defense
- `sanitizeInput` middleware recursively strips keys beginning with `$` or containing `.` from request payloads, preventing MongoDB query operator injection.

### 2.7 Multi-Layered Rate Limiting
- Global API Rate Limiter: 300 requests / 15 minutes.
- Auth Route Limiter: 30 requests / 15 minutes on sensitive authentication endpoints.
- Export Limiter: 30 requests / 5 minutes on bulk CSV generation.

### 2.8 HTTP Security Headers (Helmet)
- `Content-Security-Policy`: Restricts unauthorized script injection.
- `X-Frame-Options: DENY`: Defends against iframe clickjacking.
- `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing exploits.
- `Referrer-Policy: strict-origin-when-cross-origin`: Mitigates referer URL information leaks.
