# REVITEST — Phase 7: Proctoring & Examination Security Specification

## 1. Executive Summary

Phase 7 implements real-time client-side proctoring telemetry, automated integrity policy enforcement, server-authoritative violation auditing, and a dedicated live proctoring command center for `PROCTOR` and `ORG_ADMIN` roles.

---

## 2. Key Modules & Technical Architecture

### 2.1 ExamViolation Model & Telemetry
- **Model**: `ExamViolation` (`server/src/models/ExamViolation.js`)
- **Indexed Fields**: `{ scheduleId: 1, timestamp: -1 }`, `{ attemptId: 1, timestamp: -1 }`, `{ candidateId: 1, scheduleId: 1 }`.
- **Supported Incident Types**:
  - `TAB_SWITCH`: Examinee switched browser tabs or minimized window (`visibilitychange`).
  - `WINDOW_BLUR`: Window lost operating system focus (`blur`).
  - `FULLSCREEN_EXIT`: Examinee exited required fullscreen mode.
  - `CLIPBOARD_COPY`: Unauthorised copy attempt blocked.
  - `CLIPBOARD_PASTE`: Unauthorised paste into assessment field.
  - `CONTEXT_MENU`: Right-click inspection blocked.
  - `KEYBOARD_SHORTCUT`: Blocked operating system shortcuts.
- **Severities**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

### 2.2 Server-Authoritative Threshold Enforcement
- `proctor.service.js` enforces institutional policy (`maxTabSwitches`, default 3).
- When a candidate's tab switch count exceeds the configured limit:
  - Attempt is atomically flagged: `isFlagged: true`.
  - Attempt is automatically terminated: `status = AUTO_SUBMITTED`, `submissionReason = VIOLATION_TERMINATED`.
  - Generates audit log (`ATTEMPT_AUTO_TERMINATED_VIOLATION`) with IP address, client telemetry, and violation sequence ID.
  - Answers are sealed against further mutation.

### 2.3 Live Proctoring Command Center
- **Component**: `LiveProctorDashboard.jsx` (`client/src/components/proctoring/LiveProctorDashboard.jsx`).
- **Telemetry Feeds**:
  - Real-time aggregate counters: Enrolled, Active Now, Completed, Flagged / High Risk, Total Security Incidents.
  - Examinee live roster with tab switch counters, violation counts, and real-time status.
  - Streaming incident feed showing recent security violations chronologically.
- **Proctor Interventions**:
  - Dispatch official warnings directly to candidate screens (`POST /api/proctor/attempts/:id/warning`).
  - Force disqualification / termination (`POST /api/proctor/attempts/:id/terminate`).
  - View full incident audit trails with timestamps and details.

### 2.4 Candidate Integrity Interface
- Non-intrusive alert banners informing candidates of detected switches and remaining tolerance:
  "⚠️ Security Notice: Tab switch detected (1 of 3 recorded). 2 remaining before automatic termination."
- High-priority modal display for official proctor warnings.
- Disqualification receipt screen when maximum violations are reached.

---

## 3. Verification & Acceptance Criteria
- **Automated Verification**: `server/test_phase7.js` executes 33 test scenarios across violation logging, access control, threshold auto-termination, live feed aggregation, proctor warnings, and force termination.
- **Verification Result**: 33 passed, 0 failed. Total Phase 6 + Phase 7: 74 passed, 0 failed.
- **Code Hygiene**: 0 ESLint errors and warnings across client and server.
