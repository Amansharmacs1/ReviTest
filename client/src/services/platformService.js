import { apiClient } from './apiClient';

/**
 * Service for Platform Super Admin Management APIs
 */
export const platformService = {
  /**
   * Fetch Super Admin Platform Dashboard Metrics
   */
  async getDashboardStats() {
    return apiClient.get('/platform/dashboard');
  },

  /**
   * Get All Registered Organizations with User Counts
   */
  async getOrganizations(params = {}) {
    return apiClient.get('/platform/organizations', { params });
  },

  /**
   * Get Single Organization Details & Metrics
   */
  async getOrganizationById(organizationId) {
    return apiClient.get(`/platform/organizations/${organizationId}`);
  },

  /**
   * Activate / Suspend / Reactivate Organization
   */
  async updateOrganizationStatus(organizationId, status, reason = '') {
    return apiClient.patch(`/platform/organizations/${organizationId}/status`, {
      status,
      reason,
    });
  },
};

export default platformService;
