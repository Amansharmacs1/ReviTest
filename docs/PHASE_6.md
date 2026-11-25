# REVITEST — Phase 6: Examination Engine Specification

## 1. Executive Summary

Phase 6 implements the core, mission-critical examination runner and candidate assessment experience for REVITEST. The system guarantees answer durability, server-authoritative timekeeping, question delivery confidentiality, optimistic concurrency safety during debounced autosave, network recovery resilience, and atomic exam submission.

---

## 2. Key Modules & Technical Architecture

### 2.1 Concurrency-Safe Attempt Lifecycle
- **Model**: `ExamAttempt` (`server/src/models/ExamAttempt.js`)
- **Lifecycle States**: `IN_PROGRESS`, `SUBMITTED`, `AUTO_SUBMITTED`, `EXPIRED`.
- **Concurrency Protection**: Unique compound MongoDB partial index:
  ```javascript
  examAttemptSchema.index(
    { scheduleId: 1, candidateId: 1 },
    { unique: true, partialFilterExpression: { status: 'IN_PROGRESS' } }
  );
  ```
  Prevents duplicate active attempts during rapid clicking or network races while permitting historical submitted attempts.
- **Resumption Semantics**: Idempotent start API automatically detects and safely resumes existing `IN_PROGRESS` attempts without resetting timers or answer state.

### 2.2 Server-Authoritative Time Engine
- The exam end time (`endsAt`) is strictly calculated and enforced on the backend:
  $$\text{endsAt} = \min(\text{startedAt} + \text{durationMinutes}, \text{schedule.endTime})$$
- The client receives `endsAt` and calculates remaining seconds against its local clock drift.
- Client time modifications cannot extend the exam. Any answer submission after `endsAt` is rejected with `403 Forbidden` and transitions the attempt to `AUTO_SUBMITTED` with reason `TIME_EXPIRED`.

### 2.3 Question Delivery & Shielding
- Exam questions are delivered from the immutable `ExamSnapshot` (`server/src/services/attempt.service.js`).
- Strict confidentiality: All answer keys (`isCorrect`, correct choice flags) and faculty scoring guidelines (`evaluationGuidance`) are 100% stripped from candidate responses.
- Access is strictly scoped to the authenticated candidate and their organization. Cross-candidate or cross-tenant access is rejected with `404 Not Found`.

### 2.4 High-Throughput Response Autosave
- **Model**: `AttemptResponse` (`server/src/models/AttemptResponse.js`)
- Dedicated collection prevents BSON document re-writing under heavy concurrent writes.
- Indexed by `{ attemptId: 1, questionId: 1 }` (unique) and `{ candidateId: 1, scheduleId: 1 }`.
- Supports all question types: `MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `DESCRIPTIVE`.
- Optimistic Concurrency Control: Monotonically increasing `version` protects against out-of-order writes or stale packet updates over unstable connections.

### 2.5 Candidate UI & Exam Runner
- **Distraction-Free Environment**: Dedicated fullscreen `/app/exam/:attemptId` route stripped of navigation overhead.
- **Autosave Visual Feedback**: Badges for `All changes saved`, `Saving response...`, `Offline (queued)`, and `Sync error - retrying`.
- **Question Palette**: Grid with live status markers (Answered, Not Answered, Marked for Review, Answered & Marked, Not Visited) and section navigation tabs.
- **Recovery & Offline Resilience**: Local storage queue and automatic network re-sync on `window.addEventListener('online')`.
- **Prevent Accidental Unload**: `beforeunload` event handler prevents unintentional tab closure.
- **Submission Safeguards**: Modal summary of answered vs unanswered questions with mandatory confirmation checkbox.

---

## 3. Verification & Acceptance Criteria
- **Automated Verification**: `server/test_phase6.js` executes 41 test scenarios across attempt creation, timer enforcement, question confidentiality, autosave, offline persistence, timer expiry, and submission idempotency.
- **Verification Result**: 41 passed, 0 failed.
- **Frontend & Backend Linting**: 0 errors, 0 warnings.
- **Production Build**: Clean Vite production build.
