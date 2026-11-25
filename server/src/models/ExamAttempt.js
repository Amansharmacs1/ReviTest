import mongoose, { Schema } from 'mongoose';

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  AUTO_SUBMITTED: 'AUTO_SUBMITTED',
  EXPIRED: 'EXPIRED',
};

export const SUBMISSION_REASON = {
  MANUAL: 'MANUAL',
  TIME_EXPIRED: 'TIME_EXPIRED',
  POLICY_TRIGGERED: 'POLICY_TRIGGERED',
};

const examAttemptSchema = new Schema(
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
      required: [true, 'Exam Schedule ID is required'],
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
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
      index: true,
    },
    scheduleCandidateId: {
      type: Schema.Types.ObjectId,
      ref: 'ScheduleCandidate',
      required: [true, 'Schedule Candidate ID is required'],
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(ATTEMPT_STATUS),
      default: ATTEMPT_STATUS.IN_PROGRESS,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endsAt: {
      type: Date,
      required: [true, 'Server calculated endsAt is required'],
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    maximumMarks: {
      type: Number,
      required: true,
    },
    submissionReason: {
      type: String,
      enum: [...Object.values(SUBMISSION_REASON), null],
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active attempt creation (concurrency safe)
// Guarantees only ONE 'IN_PROGRESS' attempt can exist per (scheduleId, candidateId)
examAttemptSchema.index(
  { scheduleId: 1, candidateId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ATTEMPT_STATUS.IN_PROGRESS },
  }
);

// Compound indexes for query optimization
examAttemptSchema.index({ organizationId: 1, candidateId: 1, status: 1 });
examAttemptSchema.index({ scheduleId: 1, status: 1 });
examAttemptSchema.index({ endsAt: 1, status: 1 });

export const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
export default ExamAttempt;
