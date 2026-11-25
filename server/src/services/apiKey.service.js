import { ApiKey, API_KEY_PERMISSIONS, AuditLog } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

export const apiKeyService = {
  /**
   * Generates a new API Key for programmatic access
   */
  async createApiKey(organizationId, data, user, reqContext = {}) {
    const { name, permissions = [] } = data;

    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest('API key name is required');
    }

    const { rawKey, keyPrefix, hashedKey } = ApiKey.generateKey();

    const apiKey = await ApiKey.create({
      organizationId,
      name: name.trim(),
      keyPrefix,
      hashedKey,
      permissions: permissions.length > 0 ? permissions : [API_KEY_PERMISSIONS.READ_RESULTS],
      createdBy: user._id,
    });

    await AuditLog.create({
      organizationId,
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'API_KEY_CREATED',
      targetType: 'SETTING',
      targetId: apiKey._id,
      targetName: apiKey.name,
      description: `Generated API Key: ${keyPrefix}...`,
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    // Return rawKey ONLY ONCE upon creation
    return {
      _id: apiKey._id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      rawKey,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
    };
  },

  /**
   * List all API keys for an organization (hashed secrets strictly hidden)
   */
  async listApiKeys(organizationId) {
    return ApiKey.find({ organizationId })
      .select('-hashedKey')
      .sort({ createdAt: -1 })
      .lean();
  },

  /**
   * Revoke an API Key
   */
  async revokeApiKey(keyId, organizationId, user, reqContext = {}) {
    const key = await ApiKey.findOneAndUpdate(
      { _id: keyId, organizationId },
      { $set: { status: 'REVOKED' } },
      { new: true }
    );

    if (!key) {
      throw ApiError.notFound('API key not found');
    }

    await AuditLog.create({
      organizationId,
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'API_KEY_REVOKED',
      targetType: 'SETTING',
      targetId: key._id,
      targetName: key.name,
      description: `Revoked API Key: ${key.keyPrefix}...`,
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    return key;
  },

  /**
   * Authenticate and authorize an incoming API Key request
   */
  async authenticateKey(rawKey) {
    if (!rawKey) throw ApiError.unauthorized('API key required');
    const hashedKey = ApiKey.hashRawKey(rawKey);

    const apiKey = await ApiKey.findOne({ hashedKey, status: 'ACTIVE' }).populate('organizationId');
    if (!apiKey) {
      throw ApiError.unauthorized('Invalid or revoked API key');
    }

    // Touch lastUsedAt asynchronously
    ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).exec();

    return apiKey;
  },
};

export default apiKeyService;
