# REVITEST — Phase 8: Evaluation, Results & Analytics Specification

## 1. Executive Summary

Phase 8 implements automated objective examination grading, manual descriptive assessment scoring, cohort ranking and percentile calculations, tamper-proof result publication, question-level accuracy diagnostics, and comprehensive candidate scorecards.

---

## 2. Key Modules & Technical Architecture

### 2.1 ExamResult Model
- **Model**: `ExamResult` (`server/src/models/ExamResult.js`)
- **Key Fields**:
  - `totalMarksObtained`: Number (guaranteed $\ge 0$)
  - `maximumMarks`: Number
  - `percentage`: Number (precision to 2 decimal places)
  - `isPassed`: Boolean (evaluates `totalMarksObtained >= passingMarks`)
  - `rank`: Number (dense/standard cohort ranking)
  - `percentile`: Number (precision to 2 decimal places)
  - `accuracyRate`: Number
  - `sectionScores`: Array of per-section marks and item counts
  - `questionEvaluations`: Array of item-level evaluations, options chosen, and feedback
  - `status`: `'COMPLETED'`, `'PENDING_MANUAL_GRADING'`, `'PUBLISHED'`

### 2.2 Objective Automated Evaluation
- Executes against the immutable `ExamSnapshot` answer key.
- **Question Types Handled**:
  - `MCQ_SINGLE`: Exact option match awards full marks; mismatch deducts `negativeMarks` if configured.
  - `MCQ_MULTIPLE`: Requires all correct options to be selected with zero extraneous options for full credit; mismatch deducts negative marks if configured.
  - `TRUE_FALSE`: Exact boolean match awards marks; mismatch deducts negative marks if configured.
  - `DESCRIPTIVE`: Set to `status: 'MANUAL_PENDING'` for faculty grading.
  - Unanswered items award 0 marks without negative deduction.

### 2.3 Cohort Ranking & Percentile Engine
- For an exam schedule, examinees are sorted by `totalMarksObtained` descending.
- Standard competition ranking resolves ties consistently (e.g. 1, 2, 2, 4).
- Percentiles are calculated via:
  $$\text{Percentile} = \left(\frac{\text{candidates scored strictly below this examinee}}{\text{total examinees} - 1}\right) \times 100$$

### 2.4 Diagnostic Analytics & Difficulty Matrix
- Cohort aggregate metrics: Average Score, Highest Score, Lowest Score, Pass Percentage.
- Score Distribution Histogram (5 brackets: 0-20%, 21-40%, 41-60%, 61-80%, 81-100%).
- Question Difficulty Matrix: Computes attempts, correct count, incorrect count, and cohort accuracy percentage per question item to identify outliers and test validity.

### 2.5 Candidate Scorecard & Transparency
- Accessible via `GET /api/evaluations/attempt/:id/result`.
- Enriched with question statements, selected options, correct answer keys, and faculty feedback once results are published.
- Strict multi-tenant and cross-candidate isolation: candidates are blocked from inspecting peers' scorecards (HTTP 403).

---

## 3. Verification & Acceptance Criteria
- **Automated Verification**: `server/test_phase8.js` executes 37 test scenarios covering objective grading, negative deductions, manual grading, cohort ranking, percentiles, publishing, and analytics.
- **Verification Result**: 37 passed, 0 failed. Total suite (Phase 6 + 7 + 8): 111 passed, 0 failed.
- **Code Hygiene**: 0 ESLint errors and warnings across client and server.
