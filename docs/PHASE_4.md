# REVITEST — Phase 4: Exam Creation & Question Management

## 1. Executive Summary

Phase 4 introduces an enterprise-grade assessment-authoring system for REVITEST. Organizations can now curate reusable question banks across four distinct question modalities, author multi-section examinations, enforce institutional grading and duration policies, execute pre-flight validation checks, and publish tamper-proof, immutable examination snapshots for downstream test delivery (Phase 5 & 6) and automated evaluation (Phase 8).

---

## 2. Core Modules Implemented

### 2.1 Question Bank Management
A multi-tenant question repository scoped strictly to the organization (`organizationId`). Supports categorization by Subject, Topic, Subtopic, Difficulty, and custom Tags.
- **Modality Support**:
  1. `MCQ_SINGLE` — Single-choice objective questions with at least 2 options and exactly 1 correct answer.
  2. `MCQ_MULTIPLE` — Multi-select objective questions with at least 2 options and 1 or more correct answers.
  3. `TRUE_FALSE` — Binary choice questions with predefined "True" and "False" options.
  4. `DESCRIPTIVE` — Subjective text questions for manual evaluation.
- **Scoring & Confidentiality**:
  - Positive `marks` (> 0) and optional `negativeMarks` (>= 0).
  - Student-visible `explanation` (revealed post-result).
  - Faculty-only `evaluationGuidance` (strictly excluded from candidate and client-facing examinee payloads).
- **Lifecycle & Duplicate**:
  - Statuses: `ACTIVE`, `ARCHIVED`.
  - Archiving a question does not alter or invalidate existing published exams.
  - One-click duplication creates a clone with `"[Copy]"` prefix.

### 2.2 Examination Management
A robust exam management dashboard supporting complete lifecycle control:
- **Statuses**: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- **Search, Filter & Sort**: Server-side pagination, regex search across title and description, filtering by status and subject, sorting by `createdAt`, `updatedAt`, or `title`.
- **Draft Operations**: Update draft metadata, organize sections, add/remove questions, duplicate draft, delete draft.
- **Immutability Guarantee**: Published exams are strictly read-only (`PATCH` and `DELETE` return HTTP 400).

### 2.3 Exam Sections & Structure
Exams are organized into structured, ordered sections:
- Section title, instructions, and ordering index (`order`).
- Section-level question arrays referencing questions from the organization's question bank.
- Automatic backend recalculation of section marks and cumulative total exam marks.

### 2.4 Pre-Flight Exam Validation Engine
A centralized service (`examValidation.service.js`) that verifies structural integrity and institutional policy compliance before an exam can be published or saved:
- Exam title and subject requirements.
- Duration limits against organization policy (`minExamDurationMinutes`, `maxExamDurationMinutes`).
- Instructions requirement based on organization policy (`requireExamInstructions`).
- Section non-emptiness and duplicate section names.
- Question existence, active status (`ACTIVE`), and strict tenant ownership (`organizationId`).
- Policy checks against negative marking (`allowNegativeMarking`).
- Passing marks validation (`passingMarks <= totalMarks`).
- Returns structured validation reports with `isValid: boolean`, `errors: string[]`, `warnings: string[]`, and computed totals.

### 2.5 Immutable Published Exam Snapshots (`ExamSnapshot`)
Upon publication, the platform generates a standalone `ExamSnapshot` document:
- All referenced questions, statements, options, correct answers, marks, negative marks, and explanations are deep-copied and frozen.
- Subsequent changes, updates, or archiving of questions in the question bank have zero effect on published assessments.
- Guarantees historical consistency and auditability for exam attempts and evaluation.

### 2.6 Multi-Step Exam Creation Wizard (Frontend)
A responsive 5-step modal wizard in `ExamWizardModal.jsx`:
1. **Basic Info**: Title, description, subject, category, duration, instructions.
2. **Select Questions**: Searchable, filterable question bank browser with inline question creation.
3. **Organize Sections**: Create sections, allocate selected questions, reorder questions, view section marks.
4. **Exam Settings**: Passing marks, shuffle questions toggle, shuffle options toggle, show results immediately toggle, negative marking.
5. **Review & Validate**: Pre-flight validation engine run, error/warning cards, total marks summary, Save Draft or Publish.

---

## 3. API Endpoints

### Question Bank (`/api/questions`)
| Method | Route | Description | RBAC |
|---|---|---|---|
| `GET` | `/api/questions` | List questions (paginated, searchable, filterable) | `ORG_ADMIN` |
| `POST` | `/api/questions` | Create a new question | `ORG_ADMIN` |
| `GET` | `/api/questions/taxonomy/subjects` | Distinct subjects in question bank | `ORG_ADMIN` |
| `GET` | `/api/questions/taxonomy/topics` | Distinct topics in question bank | `ORG_ADMIN` |
| `GET` | `/api/questions/:questionId` | Get question details | `ORG_ADMIN` |
| `PATCH` | `/api/questions/:questionId` | Update question | `ORG_ADMIN` |
| `POST` | `/api/questions/:questionId/duplicate` | Duplicate question into copy | `ORG_ADMIN` |
| `PATCH` | `/api/questions/:questionId/archive` | Archive question | `ORG_ADMIN` |

### Examination Management (`/api/exams`)
| Method | Route | Description | RBAC |
|---|---|---|---|
| `GET` | `/api/exams` | List exams (paginated, searchable, filterable) | `ORG_ADMIN` |
| `POST` | `/api/exams` | Create draft exam | `ORG_ADMIN` |
| `GET` | `/api/exams/:examId` | Get exam details (with populated questions) | `ORG_ADMIN` |
| `PATCH` | `/api/exams/:examId` | Update draft exam (blocked if PUBLISHED) | `ORG_ADMIN` |
| `DELETE` | `/api/exams/:examId` | Delete draft exam (blocked if PUBLISHED) | `ORG_ADMIN` |
| `POST` | `/api/exams/:examId/duplicate` | Duplicate exam into new DRAFT | `ORG_ADMIN` |
| `POST` | `/api/exams/:examId/validate` | Run validation engine pre-flight checks | `ORG_ADMIN` |
| `POST` | `/api/exams/:examId/publish` | Validate, freeze into `ExamSnapshot`, and publish | `ORG_ADMIN` |
| `PATCH` | `/api/exams/:examId/archive` | Archive exam | `ORG_ADMIN` |

---

## 4. Verification & Testing

The backend implementation was thoroughly validated via automated testing (`test_phase4.js`):
1. **Question Types**: Successfully authored and validated `MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, and `DESCRIPTIVE`.
2. **Tenant Isolation**: Question and exam lookups from foreign organizations strictly return 404.
3. **Cross-Tenant Question Attachment**: Blocked when an exam in Tenant A attempts to include questions belonging to Tenant B.
4. **Validation Engine**: Flagged negative marks violations, missing instructions, empty sections, and missing questions.
5. **Snapshot Immutability**: Verified that modifying or archiving question bank questions leaves published exam snapshots completely unchanged.
6. **RBAC Guard**: Confirmed that `CANDIDATE` and `PROCTOR` tokens receive HTTP 403 Forbidden on authoring endpoints.
7. **Audit Logging**: Verified automatic audit trail entries for all exam and question lifecycle actions.
