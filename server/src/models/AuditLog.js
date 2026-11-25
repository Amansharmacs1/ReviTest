import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      default: null, // Null for platform-level actions
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required'],
      index: true,
    },
    actorRole: {
      type: String,
      required: [true, 'Actor role is required'],
    },
    actorName: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['USER', 'ORGANIZATION', 'SETTING', 'QUESTION', 'EXAM', 'SCHEDULE', 'ATTEMPT'],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    targetName: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

// Indexes for activity timeline querying
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
