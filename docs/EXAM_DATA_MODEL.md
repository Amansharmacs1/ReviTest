# REVITEST — Assessment Data Model & Schema Dictionary

This document details the MongoDB schemas, subdocuments, and indexing strategies governing Phase 4 Assessment Authoring.

---

## 1. Question Schema (`questions` collection)

```javascript
{
  organizationId: ObjectId (Ref: Organization, Required, Indexed),
  statement: String (Trimmed, Max 5000 chars, Required),
  type: String (Enum: ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'DESCRIPTIVE'], Required),
  subject: String (Trimmed, Max 100 chars, Required, Indexed),
  topic: String (Trimmed, Max 100 chars, Required, Indexed),
  subtopic: String (Trimmed, Max 100 chars, Optional),
  difficulty: String (Enum: ['EASY', 'MEDIUM', 'HARD'], Default: 'MEDIUM', Indexed),
  marks: Number (Min: 0.25, Max 100, Required, Default: 1),
  negativeMarks: Number (Min: 0, Max 50, Default: 0),
  options: [
    {
      id: String (UUID/CUID identifier, Required),
      text: String (Trimmed, Max 1000 chars, Required),
      isCorrect: Boolean (Default: false)
    }
  ],
  explanation: String (Trimmed, Max 3000 chars, Optional),
  evaluationGuidance: String (Trimmed, Max 3000 chars, Optional, Confidential),
  tags: [String] (Lowercased, Trimmed, Max 50 chars each),
  status: String (Enum: ['ACTIVE', 'ARCHIVED'], Default: 'ACTIVE', Indexed),
  createdBy: ObjectId (Ref: User, Required),
  updatedBy: ObjectId (Ref: User, Optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Validation Constraints:
- `MCQ_SINGLE`: Must have >= 2 options, exactly 1 `isCorrect: true`.
- `MCQ_MULTIPLE`: Must have >= 2 options, >= 1 `isCorrect: true`.
- `TRUE_FALSE`: Must have exactly 2 options ("True", "False"), exactly 1 `isCorrect: true`.
- `DESCRIPTIVE`: Options array must be empty.

### Compound Indexes:
- `{ organizationId: 1, status: 1, subject: 1 }`
- `{ organizationId: 1, status: 1, topic: 1 }`
- `{ organizationId: 1, difficulty: 1 }`
- `{ organizationId: 1, tags: 1 }`
- `{ organizationId: 1, createdAt: -1 }`

---

## 2. Exam Schema (`exams` collection)

```javascript
{
  organizationId: ObjectId (Ref: Organization, Required, Indexed),
  title: String (Trimmed, Max 200 chars, Required),
  description: String (Trimmed, Max 2000 chars, Optional),
  subject: String (Trimmed, Max 100 chars, Required, Indexed),
  category: String (Trimmed, Max 100 chars, Optional),
  durationMinutes: Number (Min: 5, Max 360, Required),
  instructions: String (Trimmed, Max 5000 chars, Optional),
  status: String (Enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], Default: 'DRAFT', Indexed),
  sections: [
    {
      title: String (Trimmed, Max 100 chars, Required),
      instructions: String (Trimmed, Max 1000 chars, Optional),
      order: Number (Required, Min: 0),
      questions: [ObjectId] (Ref: Question),
      sectionMarks: Number (Default: 0)
    }
  ],
  totalMarks: Number (Default: 0),
  passingMarks: Number (Default: 0),
  settings: {
    shuffleQuestions: Boolean (Default: false),
    shuffleOptions: Boolean (Default: false),
    allowReview: Boolean (Default: true),
    showResultsImmediately: Boolean (Default: false),
    allowNegativeMarking: Boolean (Default: false)
  },
  publishedVersionId: ObjectId (Ref: ExamSnapshot, Optional),
  publishedAt: Date (Optional),
  createdBy: ObjectId (Ref: User, Required),
  updatedBy: ObjectId (Ref: User, Optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Compound Indexes:
- `{ organizationId: 1, status: 1, createdAt: -1 }`
- `{ organizationId: 1, subject: 1 }`
- `{ organizationId: 1, title: 'text', description: 'text' }`

---

## 3. Exam Snapshot Schema (`exam_snapshots` collection)

When an exam is published, an immutable snapshot is created:

```javascript
{
  examId: ObjectId (Ref: Exam, Required, Indexed),
  organizationId: ObjectId (Ref: Organization, Required, Indexed),
  version: Number (Required, Default: 1),
  title: String (Required),
  description: String,
  subject: String (Required),
  category: String,
  durationMinutes: Number (Required),
  instructions: String,
  sections: [
    {
      title: String,
      instructions: String,
      order: Number,
      sectionMarks: Number,
      questions: [
        {
          questionId: ObjectId (Ref: Question, Original Question ID),
          statement: String,
          type: String,
          difficulty: String,
          marks: Number,
          negativeMarks: Number,
          options: [
            {
              id: String,
              text: String,
              isCorrect: Boolean
            }
          ],
          explanation: String,
          evaluationGuidance: String
        }
      ]
    }
  ],
  totalMarks: Number (Required),
  passingMarks: Number (Required),
  settings: {
    shuffleQuestions: Boolean,
    shuffleOptions: Boolean,
    allowReview: Boolean,
    showResultsImmediately: Boolean,
    allowNegativeMarking: Boolean
  },
  publishedBy: ObjectId (Ref: User, Required),
  publishedAt: Date (Default: Date.now)
}
```

### Immutability Properties:
- Mongoose schema prohibits updates post-creation.
- Test engines consume snapshots exclusively, insulating active assessment attempts against changes to the source question bank.
