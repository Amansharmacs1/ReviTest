import mongoose, { Schema } from 'mongoose';

const snapshotOptionSchema = new Schema(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const snapshotQuestionSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    questionType: { type: String, required: true },
    statement: { type: String, required: true },
    options: [snapshotOptionSchema],
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    difficulty: { type: String, required: true },
    marks: { type: Number, required: true },
    negativeMarks: { type: Number, default: 0 },
    explanation: { type: String, default: '' },
    evaluationGuidance: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const snapshotSectionSchema = new Schema(
  {
    sectionId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    order: { type: Number, default: 0 },
    sectionMarks: { type: Number, required: true },
    questions: [snapshotQuestionSchema],
  },
  { _id: false }
);

const examSnapshotSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam ID is required'],
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    examMetadata: {
      title: { type: String, required: true },
      description: { type: String, default: '' },
      subject: { type: String, required: true },
      category: { type: String, default: 'General' },
      instructions: { type: String, default: '' },
      durationMinutes: { type: Number, required: true },
      totalMarks: { type: Number, required: true },
      passingMarks: { type: Number, required: true },
      settings: { type: Object, default: () => ({}) },
    },
    sections: [snapshotSectionSchema],
    totalQuestions: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find the latest or specific snapshot for an exam
examSnapshotSchema.index({ organizationId: 1, examId: 1, version: -1 });

export const ExamSnapshot = mongoose.model('ExamSnapshot', examSnapshotSchema);
export default ExamSnapshot;
