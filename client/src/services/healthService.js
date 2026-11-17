import { apiClient } from './apiClient';

/**
 * Service to interact with REVITEST infrastructure health check APIs
 */
export const healthService = {
  /**
   * Fetch general API server health
   */
  async getApiHealth() {
    return apiClient.get('/health');
  },

  /**
   * Fetch MongoDB database connectivity status
   */
  async getDatabaseHealth() {
    return apiClient.get('/health/db');
  },
};
