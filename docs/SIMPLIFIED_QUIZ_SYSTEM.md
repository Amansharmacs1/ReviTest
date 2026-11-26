# REVITEST — Simplified Quiz Experience & Core Architecture

## 1. Executive Summary

REVITEST's enterprise assessment engine previously accumulated multi-layered configuration phases (strict multi-section exam authoring, snapshot publishing, scheduling matrix, eligibility whitelisting, lockdown proctoring, webcam telemetry, and manual evaluation workflows).

The **Simplified Quiz Experience** restructures the platform around a single high-velocity use case tailored for college faculty, workshop hosts, and corporate trainers:

```text
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ Create Quiz │ ────▶ │ Share Link  │ ────▶ │  Students   │ ────▶ │  Stop Quiz  │ ────▶ │   View &    │
│  (< 2 mins) │       │   / QR Code │       │ Participate │       │ (One-click) │       │ Export Rank │
└─────────────┘       └─────────────┘       └─────────────┘       └─────────────┘       └─────────────┘
```

---

## 2. Architectural Design & Zero-Duplication Model

Instead of creating a separate throwaway quiz database, the simplified quiz architecture directly leverages REVITEST's production models under the hood:

| Requirement | Underlying Architecture Reused | Simplified Abstraction |
| :--- | :--- | :--- |
| **Quiz Definition** | `Exam` (with `isQuiz: true`) | 3-step intuitive modal (`CreateQuizModal.jsx`) |
| **Answer Key Integrity** | `ExamSnapshot` (Immutable Version 1) | Automatic freeze upon quiz creation |
| **Delivery Timeframe** | `ExamSchedule` (`ALL_CANDIDATES`) | Auto-generated schedule linked to `publicQuizId` |
| **Student Attempt** | `ExamAttempt` & `AttemptResponse` | Managed automatically via `joinPublicQuiz` |
| **Objective Scoring** | `evaluation.service.js` | Instant objective evaluation upon submission |
| **Aggregated Leaderboard** | `QuizParticipant` (New lightweight model) | High-speed indexing, 1-1-3 competition ranks |
| **Google Sheets Sync** | `googleSheets.service.js` | Direct HTTP Webhook / Apps Script streaming |

---

## 3. Core Capabilities & Workflows

### 3.1. Two-Minute Quiz Creation
Instructors fill in:
1. **Basic Info**: Title, description, duration in minutes, instructions.
2. **Add Questions**: Supports `MCQ_SINGLE`, `MCQ_MULTIPLE`, and `TRUE_FALSE`. Questions can be reordered, edited, and deleted.
3. **Student Form & Settings**: Toggle required fields (Roll Number, College, Department), multiple attempts, public leaderboard, and immediate result display.

### 3.2. Unguessable Public Link & Classroom QR Code
- Each quiz generates a unique slug: `/quiz/qz_<random16hex>`.
- The dashboard provides a 1-click **Copy Link** and an inline SVG **Classroom QR Code** for mobile camera projection.

### 3.3. Zero-Barrier Student Join (No Sign-in Required)
- Students open the URL on mobile or desktop.
- No prior account, registration password, or app installation is required.
- The student enters their name, email, and optional roll number/college.
- The backend provisions a guest candidate record, creates an attempt, and sanitizes questions (stripping all correct answer metadata).

### 3.4. Proctoring & Tab-Switching Removed
- **Strictly No Distractions**: Fullscreen enforcement, blur event listeners, tab-switch warnings, and copy/paste restrictions are **completely disabled**.
- Clean, focused interface with a sticky countdown timer and floating progress indicator.

### 3.5. Instant Evaluation & Competition Leaderboard
- Submissions are evaluated against the immutable `ExamSnapshot` answer key.
- **Competition Ranking (1, 1, 3)**:
  - Participants with the same score share the same rank.
  - The next student receives rank $N+1$ rather than sequential increment.
- **Privacy Enforcement**: Public leaderboards (`/quiz/:publicQuizId/leaderboard`) display only **Name**, **Rank**, **Score**, **Percentage**, and **Time Taken**. Student emails and IDs are strictly excluded.

### 3.6. One-Click Start & Stop Controls
- **DRAFT**: Quizzes cannot be joined until the instructor clicks **Start Quiz**.
- **LIVE**: Students can freely join and submit.
- **STOPPED**: Instantly closes the quiz. Any in-progress student attempts are auto-closed and evaluated, preventing lost answers.

### 3.7. Google Sheets Synchronization & CSV Export
- Instructors can paste any Google Apps Script or Zapier webhook URL in Settings.
- When enabled, submissions stream directly into the external Google Sheet with full student details.
- 1-click UTF-8 CSV export with quote-escaping and injection protection.

---

## 4. API Endpoints

### 4.1. Public Student Endpoints (No Auth Required)
- `GET /api/public/quiz/:publicQuizId` — Retrieve quiz title, duration, and settings.
- `POST /api/public/quiz/:publicQuizId/join` — Join quiz, auto-provision guest attempt, get sanitized questions.
- `POST /api/public/quiz/:publicQuizId/answer` — Autosave answer responses.
- `POST /api/public/quiz/:publicQuizId/submit` — Submit quiz, execute instant evaluation, stream to Google Sheets.
- `GET /api/public/quiz/:publicQuizId/leaderboard` — Privacy-filtered leaderboard with 1-1-3 competition rankings.

### 4.2. Organizer Endpoints (Staff Auth Required)
- `POST /api/quizzes` — Create quiz, build questions, freeze snapshot, and create schedule.
- `GET /api/quizzes` — List quizzes with live dashboard telemetry (total quizzes, live, participants, submissions).
- `GET /api/quizzes/:id` — Get quiz details, questions, and participant breakdown.
- `PATCH /api/quizzes/:id/status` — Toggle status (`DRAFT`, `LIVE`, `STOPPED`).
- `GET /api/quizzes/:id/results` — Fetch student participant roster with search and sorting.
- `GET /api/quizzes/:id/leaderboard` — Internal leaderboard.
- `GET /api/quizzes/:id/export` — Download formatted CSV.
- `POST /api/quizzes/:id/sync-sheets` — Trigger Google Sheets sync.
- `GET /api/quizzes/participants/all` — Global participant list across all organization quizzes.

---

## 5. Primary Dashboard Layout

The organization dashboard has been streamlined to 5 clean tabs:
1. **Dashboard**: High-level telemetry (Total Quizzes, Live Quizzes, Total Participants, Total Submissions), quick launch banner, and recent quizzes table.
2. **My Quizzes**: Filterable quiz cards with status chips, question counts, participant stats, and instant modal actions.
3. **Create Quiz**: Opens the 3-step rapid quiz creation wizard.
4. **Participants**: Organization-wide participant roster with search and CSV export.
5. **Settings**: Workspace configuration, Google Sheets integration, and advanced management.
