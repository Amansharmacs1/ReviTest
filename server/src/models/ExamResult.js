import mongoose, { Schema } from 'mongoose';

export const RESULT_STATUS = {
  PENDING_MANUAL_GRADING: 'PENDING_MANUAL_GRADING',
  COMPLETED: 'COMPLETED',
  PUBLISHED: 'PUBLISHED',
};

const sectionScoreSchema = new Schema(
  {
    sectionId: { type: String, required: true },
    title: { type: String, required: true },
    marksObtained: { type: Number, default: 0 },
    maximumMarks: { type: Number, default: 0 },
    questionsCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const questionEvaluationSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    questionType: { type: String, required: true },
    marksAwarded: { type: Number, default: 0 },
    maxMarks: { type: Number, required: true },
    negativeMarks: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['CORRECT', 'INCORRECT', 'UNANSWERED', 'MANUAL_PENDING', 'MANUAL_GRADED'],
      required: true,
    },
    selectedOptions: [{ type: String }],
    textAnswer: { type: String, default: '' },
    manualFeedback: { type: String, default: '' },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const examResultSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSchedule',
      required: [true, 'Schedule ID is required'],
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam ID is required'],
      index: true,
    },
    examSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSnapshot',
      required: [true, 'Exam Snapshot ID is required'],
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: [true, 'Attempt ID is required'],
      unique: true,
    },
    totalMarksObtained: {
      type: Number,
      required: true,
      default: 0,
    },
    maximumMarks: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      required: true,
      default: false,
    },
    rank: {
      type: Number,
      default: null,
      index: true,
    },
    percentile: {
      type: Number,
      default: null,
    },
    accuracyRate: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalIncorrect: {
      type: Number,
      default: 0,
    },
    totalUnanswered: {
      type: Number,
      default: 0,
    },
    sectionScores: [sectionScoreSchema],
    questionEvaluations: [questionEvaluationSchema],
    status: {
      type: String,
      enum: Object.values(RESULT_STATUS),
      default: RESULT_STATUS.COMPLETED,
      index: true,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed analytical compound indexes
examResultSchema.index({ scheduleId: 1, totalMarksObtained: -1 });
examResultSchema.index({ scheduleId: 1, rank: 1 });
examResultSchema.index({ candidateId: 1, scheduleId: 1 });
examResultSchema.index({ organizationId: 1, status: 1 });

export const ExamResult = mongoose.model('ExamResult', examResultSchema);
export default ExamResult;
