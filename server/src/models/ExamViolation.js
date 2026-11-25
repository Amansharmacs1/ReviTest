import mongoose, { Schema } from 'mongoose';

export const VIOLATION_TYPE = {
  TAB_SWITCH: 'TAB_SWITCH',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  WINDOW_BLUR: 'WINDOW_BLUR',
  CLIPBOARD_COPY: 'CLIPBOARD_COPY',
  CLIPBOARD_PASTE: 'CLIPBOARD_PASTE',
  CONTEXT_MENU: 'CONTEXT_MENU',
  KEYBOARD_SHORTCUT: 'KEYBOARD_SHORTCUT',
  DEVTOOLS_ATTEMPT: 'DEVTOOLS_ATTEMPT',
};

export const VIOLATION_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

const examViolationSchema = new Schema(
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
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: [true, 'Attempt ID is required'],
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
      index: true,
    },
    violationType: {
      type: String,
      enum: Object.values(VIOLATION_TYPE),
      required: [true, 'Violation type is required'],
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(VIOLATION_SEVERITY),
      default: VIOLATION_SEVERITY.MEDIUM,
      index: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound indexes for proctors & analytics
examViolationSchema.index({ scheduleId: 1, timestamp: -1 });
examViolationSchema.index({ attemptId: 1, timestamp: -1 });
examViolationSchema.index({ candidateId: 1, scheduleId: 1 });
examViolationSchema.index({ organizationId: 1, violationType: 1 });

export const ExamViolation = mongoose.model('ExamViolation', examViolationSchema);
export default ExamViolation;
