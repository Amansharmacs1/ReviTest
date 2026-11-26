import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';

export const API_KEY_PERMISSIONS = {
  READ_ROSTER: 'READ_ROSTER',
  WRITE_ROSTER: 'WRITE_ROSTER',
  READ_EXAMS: 'READ_EXAMS',
  READ_RESULTS: 'READ_RESULTS',
  WRITE_SCHEDULES: 'WRITE_SCHEDULES',
};

const apiKeySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'API Key name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    hashedKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      enum: Object.values(API_KEY_PERMISSIONS),
      default: [API_KEY_PERMISSIONS.READ_RESULTS, API_KEY_PERMISSIONS.READ_ROSTER],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

apiKeySchema.index({ organizationId: 1, status: 1 });

/**
 * Generate a new cryptographically secure API key pair:
 * returns { rawKey, keyPrefix, hashedKey }
 */
apiKeySchema.statics.generateKey = function () {
  const rawBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `rvt_live_${rawBytes}`;
  const keyPrefix = rawKey.substring(0, 15);
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, keyPrefix, hashedKey };
};

apiKeySchema.statics.hashRawKey = function (rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
