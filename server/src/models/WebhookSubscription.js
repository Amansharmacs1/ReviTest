import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';

export const WEBHOOK_EVENTS = {
  EXAM_PUBLISHED: 'EXAM_PUBLISHED',
  SCHEDULE_CREATED: 'SCHEDULE_CREATED',
  EXAM_SUBMITTED: 'EXAM_SUBMITTED',
  RESULTS_PUBLISHED: 'RESULTS_PUBLISHED',
  VIOLATION_FLAGGED: 'VIOLATION_FLAGGED',
};

const webhookSubscriptionSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'Webhook endpoint URL is required'],
      trim: true,
      match: [/^https?:\/\/.+/, 'Webhook URL must start with http:// or https://'],
    },
    secret: {
      type: String,
      required: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
    events: {
      type: [String],
      enum: Object.values(WEBHOOK_EVENTS),
      default: [WEBHOOK_EVENTS.EXAM_SUBMITTED, WEBHOOK_EVENTS.RESULTS_PUBLISHED],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'FAILED'],
      default: 'ACTIVE',
      index: true,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastDeliveredAt: {
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

webhookSubscriptionSchema.index({ organizationId: 1, status: 1 });

export const WebhookSubscription = mongoose.model(
  'WebhookSubscription',
  webhookSubscriptionSchema
);
export default WebhookSubscription;
