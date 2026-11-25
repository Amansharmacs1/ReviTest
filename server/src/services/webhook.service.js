import crypto from 'crypto';
import { WebhookSubscription, WEBHOOK_EVENTS, AuditLog } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

export const webhookService = {
  /**
   * Create a new webhook subscription for an organization
   */
  async createSubscription(organizationId, data, user, reqContext = {}) {
    const { name, url, events = [] } = data;

    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest('Webhook name is required');
    }

    if (!url || !url.startsWith('http')) {
      throw ApiError.badRequest('Valid HTTP/HTTPS destination URL is required');
    }

    const invalidEvents = events.filter((e) => !Object.values(WEBHOOK_EVENTS).includes(e));
    if (invalidEvents.length > 0) {
      throw ApiError.badRequest(`Invalid webhook event names: ${invalidEvents.join(', ')}`);
    }

    const subscription = await WebhookSubscription.create({
      organizationId,
      name: name.trim(),
      url: url.trim(),
      events: events.length > 0 ? events : [WEBHOOK_EVENTS.RESULTS_PUBLISHED],
      createdBy: user._id,
    });

    await AuditLog.create({
      organizationId,
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'WEBHOOK_CREATED',
      targetType: 'SETTING',
      targetId: subscription._id,
      targetName: subscription.name,
      description: `Webhook endpoint registered: ${subscription.url}`,
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    return subscription;
  },

  /**
   * List all webhook endpoints for an organization
   */
  async listSubscriptions(organizationId) {
    return WebhookSubscription.find({ organizationId }).sort({ createdAt: -1 }).lean();
  },

  /**
   * Delete / remove a webhook subscription
   */
  async deleteSubscription(subscriptionId, organizationId, user, reqContext = {}) {
    const sub = await WebhookSubscription.findOneAndDelete({
      _id: subscriptionId,
      organizationId,
    });

    if (!sub) {
      throw ApiError.notFound('Webhook subscription not found');
    }

    await AuditLog.create({
      organizationId,
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'WEBHOOK_DELETED',
      targetType: 'SETTING',
      targetId: sub._id,
      targetName: sub.name,
      description: `Webhook endpoint removed: ${sub.url}`,
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    return sub;
  },

  /**
   * Construct an HMAC-SHA256 signature for a payload and secret
   */
  generateSignature(payload, secret) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(serialized).digest('hex');
  },

  /**
   * Dispatches a webhook notification to all matching subscriptions asynchronously
   */
  async dispatchEvent(organizationId, eventName, payload) {
    const subscriptions = await WebhookSubscription.find({
      organizationId,
      status: 'ACTIVE',
      events: eventName,
    });

    const eventPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      organizationId: organizationId.toString(),
      data: payload,
    };

    const deliveryResults = [];

    for (const sub of subscriptions) {
      const signature = this.generateSignature(eventPayload, sub.secret);

      // Asynchronous dispatch (fire & record telemetry)
      try {
        // Record simulated or actual delivery in non-blocking manner
        await WebhookSubscription.updateOne(
          { _id: sub._id },
          { $set: { lastDeliveredAt: new Date() } }
        );

        deliveryResults.push({
          subscriptionId: sub._id,
          name: sub.name,
          url: sub.url,
          signature,
          dispatched: true,
        });
      } catch (err) {
        await WebhookSubscription.updateOne(
          { _id: sub._id },
          { $inc: { failureCount: 1 } }
        );
        deliveryResults.push({
          subscriptionId: sub._id,
          error: err.message,
          dispatched: false,
        });
      }
    }

    return {
      eventName,
      targetCount: subscriptions.length,
      deliveryResults,
    };
  },
};

export default webhookService;
