import { apiClient } from './apiClient';

export const attemptService = {
  /**
   * Start a new attempt or resume an active IN_PROGRESS attempt
   */
  async startAttempt(scheduleId) {
    return apiClient.post('/attempts/start', { scheduleId });
  },

  /**
   * Check if candidate has an ongoing active attempt for a schedule
   */
  async getActiveAttempt(scheduleId) {
    return apiClient.get(`/attempts/active/${scheduleId}`);
  },

  /**
   * Fetch sanitized questions and current saved responses for an attempt
   */
  async getQuestions(attemptId) {
    return apiClient.get(`/attempts/${attemptId}/questions`);
  },

  /**
   * Autosave answer response with optimistic concurrency versioning
   */
  async saveAnswer(attemptId, questionId, data) {
    return apiClient.put(`/attempts/${attemptId}/answers/${questionId}`, data);
  },

  /**
   * Manually submit examination attempt
   */
  async submitAttempt(attemptId) {
    return apiClient.post(`/attempts/${attemptId}/submit`);
  },

  /**
   * Automatically submit examination attempt upon server expiry
   */
  async autoSubmitAttempt(attemptId) {
    return apiClient.post(`/attempts/${attemptId}/auto-submit`);
  },
};

export default attemptService;
