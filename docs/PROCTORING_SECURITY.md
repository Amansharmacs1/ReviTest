# REVITEST — Proctoring & Examination Security Engine

## 1. Threat Model & Mitigation Strategy

Digital online assessments face several primary integrity threats:
1. **Unauthorised Research & Tab Switching**: Examinees opening secondary tabs, search engines, or AI assistants.
2. **Clipboard Exfiltration / Infiltration**: Copying question statements to external chat tools or pasting pre-written answers.
3. **Screen Defocusing**: Switching to external applications, communication tools, or remote desktop sharing sessions.
4. **Denial-of-Service / Stale Reporting**: Flooding the server with fabricated violation logs.

---

## 2. Integrity Architecture

```text
┌────────────────────────────────────────────────────────┐
│               CANDIDATE EXAM RUNNER                    │
│                                                        │
│  Event Listeners:                                      │
│  ├── document.visibilitychange (TAB_SWITCH)            │
│  ├── window.blur (WINDOW_BLUR)                         │
│  ├── document.contextmenu (CONTEXT_MENU blocked)       │
│  └── document.copy / cut / paste (CLIPBOARD blocked)   │
└───────────────────────────┬────────────────────────────┘
                            │
               POST /api/attempts/:id/violations
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               PROCTORING SERVICE ENGINE                │
│                                                        │
│  1. Ownership Check (candidateId === req.user._id)     │
│  2. Attempt Status Check (status === 'IN_PROGRESS')    │
│  3. Increment counters (violationCount, tabSwitches)   │
│  4. Evaluate Threshold against Snapshot Settings       │
│  5. If tabSwitches >= maxTabSwitches:                  │
│     ├── set isFlagged = true                           │
│     ├── set status = AUTO_SUBMITTED                    │
│     ├── set submissionReason = VIOLATION_TERMINATED    │
│     └── emit AuditLog                                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            LIVE PROCTOR COMMAND CENTER                 │
│                                                        │
│  Polls GET /api/proctor/schedules/:id/live             │
│  - Candidate Roster & Flagged High-Risk Examinees      │
│  - Real-Time Incident Stream                           │
│  - Actions: Issue Warning, Force Disqualify            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Security Invariants
- **Non-Repudiation**: Every recorded incident contains UTC timestamp, violation code, client details, and links to the attempt and organization.
- **Cross-Candidate Shielding**: Examinees can only log and query violations for their own attempts.
- **Immutable Post-Termination**: Terminated or submitted attempts reject further violation mutations.
