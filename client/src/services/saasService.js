import { apiClient } from './apiClient';

export const saasService = {
  /**
   * Get organization real-time quota usage and plan limits
   */
  async getUsageMetrics() {
    return apiClient.get('/saas/usage');
  },

  /**
   * List API keys
   */
  async listApiKeys() {
    return apiClient.get('/saas/api-keys');
  },

  /**
   * Create a new programmatic API key
   */
  async createApiKey(data) {
    return apiClient.post('/saas/api-keys', data);
  },

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId) {
    return apiClient.delete(`/saas/api-keys/${keyId}`);
  },

  /**
   * List webhooks
   */
  async listWebhooks() {
    return apiClient.get('/saas/webhooks');
  },

  /**
   * Register a new webhook endpoint
   */
  async createWebhook(data) {
    return apiClient.post('/saas/webhooks', data);
  },

  /**
   * Delete a webhook endpoint
   */
  async deleteWebhook(id) {
    return apiClient.delete(`/saas/webhooks/${id}`);
  },

  /**
   * Export candidate roster CSV
   */
  async downloadRosterCsv() {
    return apiClient.get('/saas/export/roster', { responseType: 'blob' });
  },

  /**
   * Export schedule results CSV
   */
  async downloadScheduleResultsCsv(scheduleId) {
    return apiClient.get(`/saas/export/schedule/${scheduleId}/results`, {
      responseType: 'blob',
    });
  },
};

export default saasService;
