import { apiClient } from './apiClient';

/**
 * Authentication and Multi-Tenant Workspace API Service
 */
export const authService = {
  /**
   * Register a new Organization and its initial Org Admin
   */
  async registerOrganization(data) {
    return apiClient.post('/auth/register-org', data);
  },

  /**
   * Register a Candidate under an existing Organization
   */
  async registerCandidate(data) {
    return apiClient.post('/auth/register-candidate', data);
  },

  /**
   * Authenticate User (Candidate, Proctor, or Org Admin)
   */
  async login(credentials) {
    return apiClient.post('/auth/login', credentials);
  },

  /**
   * Fetch current authenticated user session
   */
  async getCurrentUser() {
    return apiClient.get('/auth/me');
  },

  /**
   * Refresh session access token
   */
  async refreshSession() {
    return apiClient.post('/auth/refresh');
  },

  /**
   * Terminate current session
   */
  async logout() {
    return apiClient.post('/auth/logout');
  },

  /**
   * Look up public organization workspace details
   */
  async getPublicTenant(identifier) {
    return apiClient.get(`/tenants/public/${identifier}`);
  },

  /**
   * Fetch current workspace profile
   */
  async getCurrentTenant() {
    return apiClient.get('/tenants/current');
  },

  /**
   * Update workspace settings (Admin only)
   */
  async updateTenantSettings(settings) {
    return apiClient.patch('/tenants/settings', settings);
  },
};

export default authService;

