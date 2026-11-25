import { quotaService } from '../services/quota.service.js';
import { apiKeyService } from '../services/apiKey.service.js';
import { webhookService } from '../services/webhook.service.js';
import { exportService } from '../services/export.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const saasController = {
  /**
   * GET /api/saas/usage
   * Get real-time usage metrics and quota status
   */
  getUsageMetrics: asyncHandler(async (req, res) => {
    const result = await quotaService.getUsageMetrics(req.user.organizationId);
    return ApiResponse.success(res, 'Usage metrics retrieved successfully.', result);
  }),

  /**
   * GET /api/saas/api-keys
   * List active and revoked API keys
   */
  listApiKeys: asyncHandler(async (req, res) => {
    const keys = await apiKeyService.listApiKeys(req.user.organizationId);
    return ApiResponse.success(res, 'API keys retrieved successfully.', { keys });
  }),

  /**
   * POST /api/saas/api-keys
   * Generate a new programmatic API key
   */
  createApiKey: asyncHandler(async (req, res) => {
    const result = await apiKeyService.createApiKey(
      req.user.organizationId,
      req.body,
      req.user,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    return ApiResponse.created(res, 'API key created successfully. Save your raw key now.', result);
  }),

  /**
   * DELETE /api/saas/api-keys/:keyId
   * Revoke an API key
   */
  revokeApiKey: asyncHandler(async (req, res) => {
    const { keyId } = req.params;
    const key = await apiKeyService.revokeApiKey(
      keyId,
      req.user.organizationId,
      req.user,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    return ApiResponse.success(res, 'API key revoked successfully.', { key });
  }),

  /**
   * GET /api/saas/webhooks
   * List registered webhooks
   */
  listWebhooks: asyncHandler(async (req, res) => {
    const webhooks = await webhookService.listSubscriptions(req.user.organizationId);
    return ApiResponse.success(res, 'Webhooks retrieved successfully.', { webhooks });
  }),

  /**
   * POST /api/saas/webhooks
   * Register a new webhook endpoint
   */
  createWebhook: asyncHandler(async (req, res) => {
    const webhook = await webhookService.createSubscription(
      req.user.organizationId,
      req.body,
      req.user,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    return ApiResponse.created(res, 'Webhook subscription created successfully.', { webhook });
  }),

  /**
   * DELETE /api/saas/webhooks/:id
   * Delete a webhook endpoint
   */
  deleteWebhook: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const webhook = await webhookService.deleteSubscription(
      id,
      req.user.organizationId,
      req.user,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    return ApiResponse.success(res, 'Webhook removed successfully.', { webhook });
  }),

  /**
   * GET /api/saas/export/roster
   * Download candidate roster as CSV
   */
  exportRosterCsv: asyncHandler(async (req, res) => {
    const csvContent = await exportService.exportCandidateRosterCsv(req.user.organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates_roster.csv"');
    return res.status(200).send(csvContent);
  }),

  /**
   * GET /api/saas/export/schedule/:scheduleId/results
   * Download schedule results as CSV
   */
  exportScheduleResultsCsv: asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const csvContent = await exportService.exportScheduleResultsCsv(
      scheduleId,
      req.user.organizationId
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam_results_${scheduleId}.csv"`
    );
    return res.status(200).send(csvContent);
  }),
};

export default saasController;
