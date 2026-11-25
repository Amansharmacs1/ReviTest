import mongoose, { Schema } from 'mongoose';

const attemptResponseSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: [true, 'Attempt ID is required'],
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSchedule',
      required: [true, 'Schedule ID is required'],
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Question ID is required'],
      index: true,
    },
    sectionId: {
      type: String,
      required: [true, 'Section ID is required'],
      default: '',
    },
    questionType: {
      type: String,
      enum: ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'TRUE_FALSE', 'DESCRIPTIVE'],
      required: [true, 'Question type is required'],
    },
    selectedOptions: {
      type: [String],
      default: [],
    },
    textAnswer: {
      type: String,
      default: '',
      maxlength: [25000, 'Descriptive response cannot exceed 25,000 characters'],
    },
    isAnswered: {
      type: Boolean,
      default: false,
      index: true,
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
      index: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Exactly one response document per question per attempt
attemptResponseSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
attemptResponseSchema.index({ attemptId: 1, isAnswered: 1 });
attemptResponseSchema.index({ attemptId: 1, isMarkedForReview: 1 });

export const AttemptResponse = mongoose.model('AttemptResponse', attemptResponseSchema);
export default AttemptResponse;
