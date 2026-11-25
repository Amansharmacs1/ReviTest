import { apiClient } from './apiClient';

export const questionService = {
  /**
   * Get paginated questions with search and filters
   */
  async getQuestions(params = {}) {
    return apiClient.get('/questions', { params });
  },

  /**
   * Get question by ID
   */
  async getQuestionById(questionId) {
    return apiClient.get(`/questions/${questionId}`);
  },

  /**
   * Create a new question
   */
  async createQuestion(questionData) {
    return apiClient.post('/questions', questionData);
  },

  /**
   * Update an existing question
   */
  async updateQuestion(questionId, questionData) {
    return apiClient.patch(`/questions/${questionId}`, questionData);
  },

  /**
   * Duplicate a question
   */
  async duplicateQuestion(questionId) {
    return apiClient.post(`/questions/${questionId}/duplicate`);
  },

  /**
   * Archive a question
   */
  async archiveQuestion(questionId) {
    return apiClient.patch(`/questions/${questionId}/archive`);
  },

  /**
   * Get distinct subjects
   */
  async getSubjects() {
    return apiClient.get('/questions/meta/subjects');
  },

  /**
   * Get distinct topics
   */
  async getTopics(subject = '') {
    return apiClient.get('/questions/meta/topics', {
      params: subject ? { subject } : {},
    });
  },
};

export default questionService;
