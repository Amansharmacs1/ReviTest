import { apiClient } from './apiClient';

export const evaluationService = {
  /**
   * Batch evaluate all submitted attempts for a schedule and compute ranks
   */
  async evaluateSchedule(scheduleId) {
    return apiClient.post(`/evaluations/schedule/${scheduleId}/evaluate-all`);
  },

  /**
   * Publish evaluation results to examinees
   */
  async publishResults(scheduleId) {
    return apiClient.post(`/evaluations/schedule/${scheduleId}/publish`);
  },

  /**
   * Fetch aggregate performance analytics and question difficulty breakdown
   */
  async getScheduleAnalytics(scheduleId) {
    return apiClient.get(`/evaluations/schedule/${scheduleId}/analytics`);
  },

  /**
   * Fetch cohort leaderboard and rankings
   */
  async getScheduleLeaderboard(scheduleId, params = {}) {
    return apiClient.get(`/evaluations/schedule/${scheduleId}/leaderboard`, { params });
  },

  /**
   * Fetch individual candidate scorecard and question review
   */
  async getCandidateResult(attemptId) {
    return apiClient.get(`/evaluations/attempt/${attemptId}/result`);
  },

  /**
   * Faculty manual grading for descriptive question
   */
  async gradeDescriptive(attemptId, questionId, data) {
    return apiClient.put(`/evaluations/attempt/${attemptId}/questions/${questionId}/grade`, data);
  },
};

export default evaluationService;
