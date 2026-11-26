import mongoose, { Schema } from 'mongoose';

export const EXAM_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
};

export const RESULT_VISIBILITY = {
  IMMEDIATE: 'IMMEDIATE',
  AFTER_WINDOW: 'AFTER_WINDOW',
  MANUAL: 'MANUAL',
};

const examQuestionRefSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question reference ID is required'],
    },
    order: {
      type: Number,
      default: 0,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.25, 'Question marks must be at least 0.25'],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be negative'],
    },
  },
  { _id: false }
);

const examSectionSchema = new Schema(
  {
    sectionId: {
      type: String,
      required: [true, 'Section ID is required'],
      default: () => 'sec_' + new mongoose.Types.ObjectId().toString(),
    },
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
      maxlength: [120, 'Section title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Section description cannot exceed 1000 characters'],
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Section instructions cannot exceed 2000 characters'],
    },
    order: {
      type: Number,
      default: 0,
    },
    questions: [examQuestionRefSchema],
    sectionMarks: {
      type: Number,
      default: 0,
      min: [0, 'Section marks cannot be negative'],
    },
  },
  { _id: false }
);

const examSettingsSchema = new Schema(
  {
    allowQuestionNavigation: {
      type: Boolean,
      default: true,
    },
    allowMarkForReview: {
      type: Boolean,
      default: true,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    showQuestionMarks: {
      type: Boolean,
      default: true,
    },
    allowNegativeMarking: {
      type: Boolean,
      default: false,
    },
    resultVisibility: {
      type: String,
      enum: Object.values(RESULT_VISIBILITY),
      default: RESULT_VISIBILITY.AFTER_WINDOW,
    },
  },
  { _id: false }
);

const examSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      minlength: [3, 'Exam title must be at least 3 characters'],
      maxlength: [200, 'Exam title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Exam description cannot exceed 2000 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
      index: true,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Exam instructions cannot exceed 5000 characters'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Exam duration must be at least 1 minute'],
      max: [1440, 'Exam duration cannot exceed 24 hours (1440 minutes)'],
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: [0, 'Total marks cannot be negative'],
    },
    passingMarks: {
      type: Number,
      default: 0,
      min: [0, 'Passing marks cannot be negative'],
    },
    settings: {
      type: examSettingsSchema,
      default: () => ({}),
    },
    sections: [examSectionSchema],
    status: {
      type: String,
      enum: Object.values(EXAM_STATUS),
      default: EXAM_STATUS.DRAFT,
      index: true,
    },
    currentPublishedVersion: {
      type: Number,
      default: 0,
    },
    publishedSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSnapshot',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Simple Quiz Integration Fields
    isQuiz: {
      type: Boolean,
      default: false,
      index: true,
    },
    publicQuizId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    quizStatus: {
      type: String,
      enum: ['DRAFT', 'LIVE', 'STOPPED', 'COMPLETED'],
      default: 'DRAFT',
      index: true,
    },
    quizSettings: {
      requireCollege: { type: Boolean, default: false },
      requireRollNumber: { type: Boolean, default: false },
      requireDepartment: { type: Boolean, default: false },
      allowMultipleAttempts: { type: Boolean, default: false },
      publicLeaderboard: { type: Boolean, default: false },
      showResultsImmediately: { type: Boolean, default: true },
    },
    googleSheet: {
      spreadsheetId: { type: String, default: '' },
      sheetName: { type: String, default: 'Quiz Results' },
      lastSyncedAt: { type: Date, default: null },
      syncStatus: {
        type: String,
        enum: ['IDLE', 'SYNCED', 'FAILED'],
        default: 'IDLE',
      },
      syncError: { type: String, default: '' },
      webhookUrl: { type: String, default: '' },
    },
    startedAt: {
      type: Date,
      default: null,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
examSchema.index({ organizationId: 1, status: 1 });
examSchema.index({ organizationId: 1, subject: 1 });
examSchema.index({ organizationId: 1, category: 1 });
examSchema.index({ organizationId: 1, createdAt: -1 });

// Helper to compute total questions count
examSchema.virtual('totalQuestions').get(function () {
  if (!this.sections) return 0;
  return this.sections.reduce(
    (total, section) => total + (section.questions?.length || 0),
    0
  );
});

// Configure virtuals
examSchema.set('toObject', { virtuals: true });
examSchema.set('toJSON', { virtuals: true });

export const Exam = mongoose.model('Exam', examSchema);
export default Exam;
