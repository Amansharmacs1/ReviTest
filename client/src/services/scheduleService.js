import { apiClient } from './apiClient';

export const scheduleService = {
  // ORG_ADMIN endpoints
  async getSchedules(params = {}) {
    return apiClient.get('/schedules', { params });
  },

  async createSchedule(data) {
    return apiClient.post('/schedules', data);
  },

  async getScheduleById(scheduleId) {
    return apiClient.get(`/schedules/${scheduleId}`);
  },

  async updateSchedule(scheduleId, data) {
    return apiClient.patch(`/schedules/${scheduleId}`, data);
  },

  async cancelSchedule(scheduleId) {
    return apiClient.post(`/schedules/${scheduleId}/cancel`);
  },

  async getScheduleCandidates(scheduleId, params = {}) {
    return apiClient.get(`/schedules/${scheduleId}/candidates`, { params });
  },

  async assignCandidates(scheduleId, data) {
    return apiClient.post(`/schedules/${scheduleId}/candidates`, data);
  },

  async removeCandidate(scheduleId, candidateId) {
    return apiClient.delete(`/schedules/${scheduleId}/candidates/${candidateId}`);
  },

  // CANDIDATE endpoints
  async getCandidateExams() {
    return apiClient.get('/schedules/candidate/my-exams');
  },

  async getCandidatePrecheck(scheduleId) {
    return apiClient.get(`/schedules/candidate/${scheduleId}/precheck`);
  },

  async acknowledgeExam(scheduleId) {
    return apiClient.post(`/schedules/candidate/${scheduleId}/acknowledge`);
  },
};

export default scheduleService;
