import mongoose, { Schema } from 'mongoose';

const quizParticipantSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSchedule',
      default: null,
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      default: null,
      index: true,
    },
    candidateUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Student email is required'],
      trim: true,
      lowercase: true,
      maxlength: 150,
      index: true,
    },
    rollNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: 50,
    },
    college: {
      type: String,
      default: '',
      trim: true,
      maxlength: 150,
    },
    department: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['REGISTERED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED'],
      default: 'REGISTERED',
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    maximumMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    googleSynced: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

quizParticipantSchema.index({ quizId: 1, email: 1 });
quizParticipantSchema.index({ quizId: 1, score: -1, timeTakenSeconds: 1 });
quizParticipantSchema.index({ organizationId: 1, createdAt: -1 });

export const QuizParticipant = mongoose.model('QuizParticipant', quizParticipantSchema);
export default QuizParticipant;
