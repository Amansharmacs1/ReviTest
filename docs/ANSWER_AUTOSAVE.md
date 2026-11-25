# REVITEST — Answer Autosave & Optimistic Concurrency Engine

## 1. Design Requirements

In high-concurrency examination scenarios (1,000+ simultaneous students):
1. Candidate answers must **never be lost** due to page reloads, tab navigation, or transient network interruptions.
2. Continuous updates must not cause massive BSON document rewrite overhead on MongoDB.
3. Out-of-order network arrivals must not overwrite newer responses with older state.
4. Objective question clicks must save immediately; free-form descriptive typing must debounce writes without feeling sluggish.

---

## 2. High-Performance Data Architecture

Rather than embedding dynamic answers within a monolithic `ExamAttempt` document, REVITEST segregates responses into an independent `AttemptResponse` collection:

```text
ExamAttempt (1 per attempt)
  ├── _id
  ├── scheduleId, candidateId, examSnapshotId
  ├── status, startedAt, endsAt, submittedAt
  └── submissionReason

AttemptResponse (N per attempt, 1 per question)
  ├── attemptId
  ├── questionId
  ├── selectedOptions: [String]
  ├── textResponse: String
  ├── isMarkedForReview: Boolean
  ├── isAnswered: Boolean
  └── version: Number (Monotonic OCC Counter)
```

### Unique Indexing
```javascript
attemptResponseSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
```

---

## 3. Optimistic Concurrency Control (OCC)

When network packets arrive out of order (e.g. mobile 4G latency spikes):

1. The client maintains `clientVersion` incremented on each user mutation.
2. The server compares `clientVersion` with `existingResponse.version`.
3. If `clientVersion < existingResponse.version`, the write is rejected with HTTP 409 / stale write protection.
4. On accepted writes, `version` is incremented and returned to synchronize the client.

```javascript
if (typeof clientVersion === 'number' && clientVersion < existingResponse.version) {
  return ApiResponse.success(res, 'Stale response ignored; newer version persists', {
    response: existingResponse,
    staleIgnored: true,
  });
}
```

---

## 4. Offline Queue & Network Recovery

1. When `navigator.onLine === false`, mutations are stored in memory and synchronized to `localStorage` (`revitest_offline_${attemptId}`).
2. The UI displays an amber badge: `Offline (queued)`.
3. When connectivity returns (`window.addEventListener('online')`), the queue flushes sequentially to `PUT /api/attempts/:id/answers/:questionId`.
4. Upon successful drain, the badge updates to emerald: `All changes saved`.
