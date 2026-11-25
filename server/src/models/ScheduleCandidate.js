import mongoose from 'mongoose';

const scheduleCandidateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSchedule',
      required: [true, 'Schedule ID is required'],
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'MISSED'],
      default: 'ASSIGNED',
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    acknowledgedAt: {
      type: Date,
    },
    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAttemptAt: {
      type: Date,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate assignment of the same candidate to the same schedule
scheduleCandidateSchema.index({ scheduleId: 1, candidateId: 1 }, { unique: true });

// Compound indexes for candidate dashboard lookups
scheduleCandidateSchema.index({ organizationId: 1, candidateId: 1, status: 1 });
scheduleCandidateSchema.index({ candidateId: 1, createdAt: -1 });

export const ScheduleCandidate = mongoose.model('ScheduleCandidate', scheduleCandidateSchema);
export default ScheduleCandidate;
