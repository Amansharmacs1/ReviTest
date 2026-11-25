import mongoose, { Schema } from 'mongoose';

export const QUESTION_TYPES = {
  MCQ_SINGLE: 'MCQ_SINGLE',
  MCQ_MULTIPLE: 'MCQ_MULTIPLE',
  TRUE_FALSE: 'TRUE_FALSE',
  DESCRIPTIVE: 'DESCRIPTIVE',
};

export const DIFFICULTY_LEVELS = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
};

export const QUESTION_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
};

const optionSchema = new Schema(
  {
    optionId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const questionSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QUESTION_TYPES),
      required: [true, 'Question type is required'],
      index: true,
    },
    statement: {
      type: String,
      required: [true, 'Question statement is required'],
      trim: true,
      maxlength: [10000, 'Question statement cannot exceed 10,000 characters'],
    },
    options: [optionSchema],
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
      index: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxlength: [100, 'Topic cannot exceed 100 characters'],
      index: true,
    },
    subtopic: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Subtopic cannot exceed 100 characters'],
    },
    difficulty: {
      type: String,
      enum: Object.values(DIFFICULTY_LEVELS),
      default: DIFFICULTY_LEVELS.MEDIUM,
      index: true,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.25, 'Marks must be at least 0.25'],
      max: [100, 'Marks cannot exceed 100 per question'],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be less than 0'],
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Explanation cannot exceed 5000 characters'],
    },
    evaluationGuidance: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Evaluation guidance cannot exceed 5000 characters'],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    status: {
      type: String,
      enum: Object.values(QUESTION_STATUS),
      default: QUESTION_STATUS.ACTIVE,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user reference is required'],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant query partitioning
questionSchema.index({ organizationId: 1, status: 1, subject: 1 });
questionSchema.index({ organizationId: 1, questionType: 1, difficulty: 1 });
questionSchema.index({ organizationId: 1, topic: 1 });
questionSchema.index({ organizationId: 1, createdAt: -1 });

// Question type-specific validation hook
questionSchema.pre('validate', function (next) {
  if (this.questionType === QUESTION_TYPES.MCQ_SINGLE) {
    if (!this.options || this.options.length < 2) {
      this.invalidate('options', 'MCQ_SINGLE must have at least 2 options');
    } else {
      const correctCount = this.options.filter((opt) => opt.isCorrect).length;
      if (correctCount !== 1) {
        this.invalidate(
          'options',
          `MCQ_SINGLE must have exactly 1 correct option (found ${correctCount})`
        );
      }
    }
  } else if (this.questionType === QUESTION_TYPES.MCQ_MULTIPLE) {
    if (!this.options || this.options.length < 2) {
      this.invalidate('options', 'MCQ_MULTIPLE must have at least 2 options');
    } else {
      const correctCount = this.options.filter((opt) => opt.isCorrect).length;
      if (correctCount < 1) {
        this.invalidate('options', 'MCQ_MULTIPLE must have at least 1 correct option');
      }
    }
  } else if (this.questionType === QUESTION_TYPES.TRUE_FALSE) {
    if (!this.options || this.options.length !== 2) {
      this.invalidate('options', 'TRUE_FALSE must have exactly 2 options');
    } else {
      const correctCount = this.options.filter((opt) => opt.isCorrect).length;
      if (correctCount !== 1) {
        this.invalidate('options', 'TRUE_FALSE must have exactly 1 correct option');
      }
    }
  } else if (this.questionType === QUESTION_TYPES.DESCRIPTIVE) {
    // For descriptive, options should be empty or omitted
    if (this.options && this.options.length > 0) {
      this.options = [];
    }
  }

  // Ensure negative marks do not exceed positive marks
  if (this.negativeMarks > this.marks) {
    this.invalidate(
      'negativeMarks',
      'Negative marks cannot exceed total marks for the question'
    );
  }

  next();
});

// Sanitized representation for API responses
questionSchema.methods.toSafeObject = function (options = { includeAnswers: true }) {
  const obj = this.toObject();
  const safe = {
    _id: obj._id,
    organizationId: obj.organizationId,
    questionType: obj.questionType,
    statement: obj.statement,
    options: obj.options.map((opt) => ({
      optionId: opt.optionId,
      text: opt.text,
      ...(options.includeAnswers ? { isCorrect: opt.isCorrect } : {}),
    })),
    subject: obj.subject,
    topic: obj.topic,
    subtopic: obj.subtopic || '',
    difficulty: obj.difficulty,
    marks: obj.marks,
    negativeMarks: obj.negativeMarks || 0,
    explanation: options.includeAnswers ? obj.explanation : '',
    tags: obj.tags || [],
    status: obj.status,
    createdBy: obj.createdBy,
    updatedBy: obj.updatedBy,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };

  if (options.includeAnswers) {
    safe.evaluationGuidance = obj.evaluationGuidance || '';
  }

  return safe;
};

export const Question = mongoose.model('Question', questionSchema);
export default Question;
