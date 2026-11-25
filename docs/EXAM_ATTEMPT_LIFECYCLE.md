# REVITEST — Exam Attempt Lifecycle Specification

## 1. Lifecycle Overview

An examination attempt undergoes strict server-authoritative state transitions to ensure auditability, exam fairness, and data durability.

```text
                  ┌──────────────────────┐
                  │ Candidate Eligibility │
                  │  & Window Verified   │
                  └──────────┬───────────┘
                             │
                      [startAttempt]
                             │
                             ▼
                  ┌──────────────────────┐
            ┌────►│     IN_PROGRESS      │◄───────────┐
            │     └──────────┬───────────┘            │
            │                │                        │
       [Resume Tab]          │                        │ [Autosave Response]
            │                │                        │
            └────────────────┼────────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             │                               │
    [Manual Submission]             [Timer Expiry Detected]
             │                               │
             ▼                               ▼
  ┌──────────────────────┐        ┌──────────────────────┐
  │      SUBMITTED       │        │    AUTO_SUBMITTED    │
  │  (reason: MANUAL)    │        │ (reason: TIME_EXPIRED)
  └──────────────────────┘        └──────────────────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Sealed & Locked    │
                  │ (Evaluation & Audit) │
                  └──────────────────────┘
```

---

## 2. State Transition Rules

| Initial State | Target State | Trigger | Authorized Actors | Concurrency Safeguards |
|---|---|---|---|---|
| `NONE` | `IN_PROGRESS` | `POST /api/attempts/start` | `CANDIDATE` | Partial unique index `{ scheduleId: 1, candidateId: 1, status: 'IN_PROGRESS' }` |
| `IN_PROGRESS` | `IN_PROGRESS` | `POST /api/attempts/start` (resumption) | `CANDIDATE` | Returns existing attempt without resetting `endsAt` or responses |
| `IN_PROGRESS` | `SUBMITTED` | `POST /api/attempts/:id/submit` | `CANDIDATE` | Atomic `findOneAndUpdate` condition `{ status: 'IN_PROGRESS' }` |
| `IN_PROGRESS` | `AUTO_SUBMITTED` | `POST /api/attempts/:id/auto-submit` | `CANDIDATE` / Server worker | Triggered when `now >= endsAt`; rejects late saves |
| `SUBMITTED` | *Any* | Any modification | None | **Immutable**; rejects further answer saves with HTTP 400 |
| `AUTO_SUBMITTED` | *Any* | Any modification | None | **Immutable**; rejects further answer saves with HTTP 400 |

---

## 3. Concurrency Protection & Partial Unique Indexes

To prevent duplicate attempts from being created when a user double-clicks or experiences high network latency, MongoDB partial filtering is enforced:

```javascript
examAttemptSchema.index(
  { scheduleId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { status: 'IN_PROGRESS' } }
);
```

When an attempt is finalized to `SUBMITTED` or `AUTO_SUBMITTED`, it drops out of the partial index, permitting subsequent attempts up to `maxAttempts` configured by the schedule.
