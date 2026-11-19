import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

/**
 * Service to record administrative and security audit events
 *
 * @param {Object} params
 * @param {Object} params.actor - User performing the action ({ _id, role, name })
 * @param {string|null} [params.organizationId] - Organization scope
 * @param {string} params.action - Action identifier (e.g. 'USER_ACTIVATED')
 * @param {string} params.targetType - 'USER' | 'ORGANIZATION' | 'SETTING'
 * @param {any} [params.targetId] - Target entity identifier
 * @param {string} [params.targetName] - Target entity name / display value
 * @param {string} [params.description] - Human-readable description
 * @param {Object} [params.metadata] - Extra context (non-sensitive)
 * @param {Object} [params.req] - Express request object for IP and User-Agent capture
 */
export const logAuditEvent = async ({
  actor,
  organizationId = null,
  action,
  targetType,
  targetId = null,
  targetName = '',
  description = '',
  metadata = {},
  req = null,
}) => {
  try {
    const ipAddress =
      req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      '';
    const userAgent = req?.headers['user-agent'] || '';

    const resolvedOrgId =
      organizationId || (actor?.organizationId ? actor.organizationId : null);

    await AuditLog.create({
      organizationId: resolvedOrgId,
      actorId: actor._id || actor.userId,
      actorRole: actor.role,
      actorName: actor.name || '',
      action,
      targetType,
      targetId,
      targetName,
      description,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    logger.error('Failed to write audit log entry:', err);
  }
};
