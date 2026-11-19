import { apiClient } from './apiClient';

/**
 * Service for Organization Workspace Management APIs
 */
export const organizationService = {
  /**
   * Fetch Real-time Dashboard Statistics & Activity
   */
  async getDashboardStats() {
    return apiClient.get('/organization/dashboard');
  },

  /**
   * Fetch Organization Profile
   */
  async getProfile() {
    return apiClient.get('/organization/profile');
  },

  /**
   * Update Permitted Organization Profile Fields
   */
  async updateProfile(profileData) {
    return apiClient.patch('/organization/profile', profileData);
  },

  /**
   * Get Paginated Organization Members
   */
  async getUsers(params = {}) {
    return apiClient.get('/organization/users', { params });
  },

  /**
   * Get Specific User Details
   */
  async getUserById(userId) {
    return apiClient.get(`/organization/users/${userId}`);
  },

  /**
   * Activate / Deactivate User
   */
  async updateUserStatus(userId, status, reason = '') {
    return apiClient.patch(`/organization/users/${userId}/status`, {
      status,
      reason,
    });
  },

  /**
   * Get Proctors
   */
  async getProctors(params = {}) {
    return apiClient.get('/organization/proctors', { params });
  },

  /**
   * Create or Invite a Proctor
   */
  async createProctor(proctorData) {
    return apiClient.post('/organization/proctors', proctorData);
  },

  /**
   * Update Proctor Status
   */
  async updateProctorStatus(proctorId, status, reason = '') {
    return apiClient.patch(`/organization/proctors/${proctorId}/status`, {
      status,
      reason,
    });
  },

  /**
   * Get Candidates
   */
  async getCandidates(params = {}) {
    return apiClient.get('/organization/candidates', { params });
  },

  /**
   * Get Candidate Details
   */
  async getCandidateById(candidateId) {
    return apiClient.get(`/organization/candidates/${candidateId}`);
  },

  /**
   * Update Candidate Status
   */
  async updateCandidateStatus(candidateId, status, reason = '') {
    return apiClient.patch(`/organization/candidates/${candidateId}/status`, {
      status,
      reason,
    });
  },

  /**
   * Get Organization Activity Audit Logs
   */
  async getAuditLogs(params = {}) {
    return apiClient.get('/organization/audit-logs', { params });
  },
};

export default organizationService;
