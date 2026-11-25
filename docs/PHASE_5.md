# REVITEST — Phase 5: Exam Scheduling & Student Access

## 1. Executive Summary

Phase 5 delivers a secure, multi-tenant assessment scheduling and candidate access engine for REVITEST. Organizations can now schedule published assessments with strict access windows (in UTC), configure cohort eligibility (individual candidates, batches/departments, or entire organizations), and enforce server-authoritative pre-exam eligibility checks. 

Examinees receive a dedicated candidate assessment portal displaying real-time available, upcoming, and past assessments, complete with a pre-exam rules and integrity acknowledgement screen before Phase 6 (Examination Engine) test delivery.

---

## 2. Core Modules Implemented

### 2.1 Examination Scheduling (`ExamSchedule` Model)
Allows Organization Administrators to schedule assessments:
- **Immutable Snapshot Binding**: Requires `exam.status === 'PUBLISHED'` and binds to `publishedVersionId` (`ExamSnapshot`).
- **UTC Time Window**: Scheduled `startTime` and `endTime` stored in UTC, validated such that `startTime < endTime`.
- **Dynamic Status**: Real-time server-side computed status:
  - `SCHEDULED` — `now < startTime`
  - `ACTIVE` — `startTime <= now <= endTime`
  - `COMPLETED` — `now > endTime`
  - `CANCELLED` — Explicitly cancelled by administrator
- **Duration & Late Entry Grace Period**:
  - `durationMinutes`: Assessment attempt duration.
  - `lateEntryGraceMinutes`: Configurable grace period (default 15 mins) preventing late arrivals once elapsed.
  - `maxAttempts`: Limits attempt count per candidate (default 1).
- **Settings**:
  - `requireAcknowledgement`: Enforces candidate agreement to integrity rules.
  - `showResultsImmediately`: Dictates whether results are revealed upon submission.

### 2.2 Candidate Cohort Assignment (`ScheduleCandidate` Model)
Tracks candidate enrollment and lifecycle state per schedule:
- **Assignment Modalities**:
  1. `ALL_CANDIDATES`: Enrolls all active candidates in the organization.
  2. `BATCH`: Enrolls candidates whose `profile.department` matches `targetBatch`.
  3. `SELECTED_CANDIDATES`: Individual selection by administrator.
- **Deduplication**: Unique compound index `{ scheduleId: 1, candidateId: 1 }` strictly prevents duplicate enrollments.
- **Candidate States**: `ASSIGNED` → `ACKNOWLEDGED` → `IN_PROGRESS` → `SUBMITTED` / `EXPIRED`.
- **Safe Removal**: Candidates can only be removed from a schedule before their attempt has started (`attemptsCount === 0`).

### 2.3 Server-Authoritative Eligibility Engine (`examEligibility.service.js`)
Zero trust is placed in client assertions or URLs. Before granting precheck or test entrance, the engine verifies:
1. Candidate exists, has `role === 'CANDIDATE'`, and account `status === 'ACTIVE'`.
2. Candidate's organization is `ACTIVE`.
3. Schedule exists, belongs to the same organization (cross-tenant queries return 404), and `status !== 'CANCELLED'`.
4. Candidate cohort assignment is confirmed.
5. Current UTC time is within the schedule window (`startTime <= now <= endTime`).
6. Attempt limits are respected (`attemptsCount < maxAttempts`).
7. Returns a sanitized exam snapshot with **strictly zero answer keys or evaluation guidance** leaked.

### 2.4 Pre-Exam Rules & Acknowledgement Screen (`CandidatePreExamModal.jsx`)
- Displays assessment metadata (subject, title, duration, total marks, questions count).
- Shows live window timings in the examinee's local browser timezone.
- Highlights negative marking policies and exam integrity rules.
- Captures affirmative candidate declaration (`acknowledgedAt` timestamp logged in database and audit trail).

### 2.5 Candidate Examination Portal (Frontend)
Integrated into `DashboardPage.jsx` when authenticated as `CANDIDATE`:
- **Live Assessments**: Immediately actionable cards with "View Instructions & Enter" buttons.
- **Upcoming Assessments**: Displays scheduled start times and time remaining until window opening.
- **Past Assessments**: History of previous examination attempts and closed windows.

---

## 3. API Endpoints

### Schedule Administration (`/api/schedules` - ORG_ADMIN, SUPER_ADMIN)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedules` | Paginated list of organization schedules with candidate counts and real-time statuses |
| `POST` | `/api/schedules` | Create examination schedule referencing an immutable `ExamSnapshot` |
| `GET` | `/api/schedules/:scheduleId` | Detailed schedule metadata and candidate summary |
| `PATCH` | `/api/schedules/:scheduleId` | Update schedule metadata or timing window |
| `POST` | `/api/schedules/:scheduleId/cancel` | Cancel schedule (immediately terminates candidate access) |
| `GET` | `/api/schedules/:scheduleId/candidates` | Paginated roster of assigned candidates with attempt statuses |
| `POST` | `/api/schedules/:scheduleId/candidates` | Bulk assign candidates (by IDs, batch name, or all active) |
| `DELETE` | `/api/schedules/:scheduleId/candidates/:candidateId` | Remove candidate from schedule (if attempt not started) |

### Candidate Portal (`/api/schedules/candidate/*` - Role: CANDIDATE)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedules/candidate/my-exams` | List candidate assessments categorized into Available, Upcoming, and Past |
| `GET` | `/api/schedules/candidate/:scheduleId/precheck` | Pre-flight eligibility check, rules, and sanitized exam metadata |
| `POST` | `/api/schedules/candidate/:scheduleId/acknowledge` | Record examinee integrity rules acknowledgement timestamp |

---

## 4. Verification & Testing

The automated test suite (`server/test_phase5.js`) verified 27 test assertions across 5 core categories with 100% pass rate:
- **Test Group 1**: Schedule Creation, Window Validation (`start < end`), and Real-time Status (`SCHEDULED`, `ACTIVE`, `COMPLETED`).
- **Test Group 2**: Candidate Assignment and Unique Index Deduplication.
- **Test Group 3**: Eligibility Engine (Eligible access, `NOT_ASSIGNED` rejection, Cross-Tenant 404 blocking, `EXAM_NOT_STARTED` with countdown, `EXAM_EXPIRED`, `ACCOUNT_SUSPENDED`, and `MAX_ATTEMPTS_REACHED`).
- **Test Group 4**: Rules Acknowledgement Flow and Timestamp Recording.
- **Test Group 5**: Batch-Based Departmental Eligibility Verification.
