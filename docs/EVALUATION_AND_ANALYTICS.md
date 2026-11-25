# REVITEST — Evaluation & Analytics Engine

## 1. Automated Scoring Pipeline

```text
                  ┌──────────────────────┐
                  │ Candidate Submission │
                  │ (MANUAL / AUTO / EXP)│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Fetch ExamSnapshot   │
                  │ & AttemptResponses   │
                  └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    [Objective Items]              [Descriptive Items]
   (MCQ, Multi, T/F)               (Essay, Code, Open)
              │                             │
      Compare against               Check Existing Grade
    Immutable Answer Key             or Mark as PENDING
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Compute Section &    │
                  │ Grand Total Marks    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Cohort Ranking &     │
                  │ Percentile Engine    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Publish & Scorecard  │
                  │ Analytics Generation │
                  └──────────────────────┘
```

---

## 2. Mathematical Scoring Formulas

1. **Percentage Calculation**:
   $$\text{Percentage} = \min\left(100, \max\left(0, \frac{\text{Total Marks Obtained}}{\text{Maximum Marks}} \times 100\right)\right)$$

2. **Cohort Percentile**:
   $$\text{Percentile} = \left(\frac{C_{\text{below}}}{N - 1}\right) \times 100$$
   where $C_{\text{below}}$ is the count of examinees who scored strictly lower than the candidate, and $N$ is total examinees evaluated ($N > 1$). For $N = 1$, Percentile $= 100\%$.

3. **Accuracy Rate**:
   $$\text{Accuracy Rate} = \left(\frac{\text{Total Correct}}{\text{Total Correct} + \text{Total Incorrect}}\right) \times 100$$
