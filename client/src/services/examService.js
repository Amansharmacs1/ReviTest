import { apiClient } from './apiClient';

export const examService = {
  /**
   * Get paginated examinations with search and filters
   */
  async getExams(params = {}) {
    return apiClient.get('/exams', { params });
  },

  /**
   * Get examination by ID with populated sections & questions
   */
  async getExamById(examId) {
    return apiClient.get(`/exams/${examId}`);
  },

  /**
   * Create a new draft examination
   */
  async createExam(examData) {
    return apiClient.post('/exams', examData);
  },

  /**
   * Update a draft examination
   */
  async updateExam(examId, examData) {
    return apiClient.patch(`/exams/${examId}`, examData);
  },

  /**
   * Duplicate an examination into a new draft
   */
  async duplicateExam(examId) {
    return apiClient.post(`/exams/${examId}/duplicate`);
  },

  /**
   * Delete a draft examination
   */
  async deleteExam(examId) {
    return apiClient.delete(`/exams/${examId}`);
  },

  /**
   * Validate an examination and get pre-publication report
   */
  async validateExam(examId) {
    return apiClient.post(`/exams/${examId}/validate`);
  },

  /**
   * Publish an examination (creates immutable published snapshot)
   */
  async publishExam(examId) {
    return apiClient.post(`/exams/${examId}/publish`);
  },

  /**
   * Archive an examination
   */
  async archiveExam(examId) {
    return apiClient.post(`/exams/${examId}/archive`);
  },
};

export default examService;
