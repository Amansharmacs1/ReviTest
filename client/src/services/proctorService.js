import { apiClient } from './apiClient';

export const proctorService = {
  /**
   * Log an integrity violation event from candidate exam runner
   */
  async recordViolation(attemptId, violationData) {
    return apiClient.post(`/attempts/${attemptId}/violations`, violationData);
  },

  /**
   * Fetch violations audit for a specific attempt
   */
  async getAttemptViolations(attemptId) {
    return apiClient.get(`/attempts/${attemptId}/violations`);
  },

  /**
   * Fetch live proctor feed and candidate status roster for an exam schedule
   */
  async getLiveScheduleFeed(scheduleId) {
    return apiClient.get(`/proctor/schedules/${scheduleId}/live`);
  },

  /**
   * Issue official proctor warning to a candidate's active attempt
   */
  async issueWarning(attemptId, message) {
    return apiClient.post(`/proctor/attempts/${attemptId}/warning`, { message });
  },

  /**
   * Force terminate an active attempt due to confirmed academic dishonesty
   */
  async terminateAttempt(attemptId, reason) {
    return apiClient.post(`/proctor/attempts/${attemptId}/terminate`, { reason });
  },
};

export default proctorService;
