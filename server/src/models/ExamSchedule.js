import mongoose from 'mongoose';

const examScheduleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam ID is required'],
      index: true,
    },
    examSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSnapshot',
      required: [true, 'Published Exam Snapshot ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Schedule title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    startTime: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [720, 'Duration cannot exceed 12 hours'],
    },
    lateEntryGraceMinutes: {
      type: Number,
      default: 15,
      min: [0, 'Grace period cannot be negative'],
      max: [180, 'Grace period cannot exceed 180 minutes'],
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, 'Maximum attempts must be at least 1'],
      max: [10, 'Maximum attempts cannot exceed 10'],
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    eligibilityType: {
      type: String,
      enum: ['ALL_CANDIDATES', 'SELECTED_CANDIDATES', 'BATCH'],
      default: 'ALL_CANDIDATES',
      index: true,
    },
    targetBatch: {
      type: String,
      trim: true,
      maxlength: [100, 'Batch name cannot exceed 100 characters'],
    },
    assignedCandidateIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    settings: {
      requireAcknowledgement: {
        type: Boolean,
        default: true,
      },
      allowReview: {
        type: Boolean,
        default: true,
      },
      showResultsImmediately: {
        type: Boolean,
        default: false,
      },
      allowLateSubmission: {
        type: Boolean,
        default: false,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for optimal querying
examScheduleSchema.index({ organizationId: 1, status: 1, startTime: 1 });
examScheduleSchema.index({ organizationId: 1, examId: 1 });
examScheduleSchema.index({ organizationId: 1, eligibilityType: 1 });
examScheduleSchema.index({ assignedCandidateIds: 1 });

// Helper to determine real-time schedule status based on UTC clock
examScheduleSchema.methods.computeCurrentStatus = function () {
  if (this.status === 'CANCELLED') return 'CANCELLED';
  const now = new Date();
  if (now < this.startTime) return 'SCHEDULED';
  if (now >= this.startTime && now <= this.endTime) return 'ACTIVE';
  return 'COMPLETED';
};

export const ExamSchedule = mongoose.model('ExamSchedule', examScheduleSchema);
export default ExamSchedule;
