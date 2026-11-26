import { apiClient } from './apiClient';

export const quizService = {
  // Organizer endpoints
  createQuiz: (quizData) => apiClient.post('/quizzes', quizData),
  listQuizzes: (params) => apiClient.get('/quizzes', { params }),
  getQuizById: (id) => apiClient.get(`/quizzes/${id}`),
  updateQuizStatus: (id, status) => apiClient.patch(`/quizzes/${id}/status`, { status }),
  getQuizResults: (id, params) => apiClient.get(`/quizzes/${id}/results`, { params }),
  getLeaderboard: (id) => apiClient.get(`/quizzes/${id}/leaderboard`),
  exportResultsCsv: (id) =>
    apiClient.get(`/quizzes/${id}/export`, { responseType: 'blob' }),
  syncGoogleSheets: (id) => apiClient.post(`/quizzes/${id}/sync-sheets`),
  updateGoogleConfig: (id, config) => apiClient.patch(`/quizzes/${id}/google-config`, config),
  getAllParticipants: (params) => apiClient.get('/quizzes/participants/all', { params }),

  // Public student quiz endpoints
  getPublicQuizMetadata: (publicQuizId) =>
    apiClient.get(`/public/quiz/${publicQuizId}`),
  joinPublicQuiz: (publicQuizId, studentData) =>
    apiClient.post(`/public/quiz/${publicQuizId}/join`, studentData),
  savePublicAnswer: (publicQuizId, answerData) =>
    apiClient.post(`/public/quiz/${publicQuizId}/answer`, answerData),
  submitPublicQuiz: (publicQuizId, payload) =>
    apiClient.post(`/public/quiz/${publicQuizId}/submit`, payload),
  getPublicLeaderboard: (publicQuizId) =>
    apiClient.get(`/public/quiz/${publicQuizId}/leaderboard`),
};

export default quizService;
