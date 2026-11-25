import { evaluationService } from '../services/evaluation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const evaluationController = {
  /**
   * POST /api/evaluations/schedule/:scheduleId/evaluate-all
   * Trigger batch automated evaluation and cohort ranking
   */
  evaluateSchedule: asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const result = await evaluationService.batchEvaluateSchedule(scheduleId, req.user, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return ApiResponse.success(res, 'Batch evaluation and ranking completed successfully.', result);
  }),

  /**
   * POST /api/evaluations/schedule/:scheduleId/publish
   * Publish results for an exam schedule
   */
  publishResults: asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const result = await evaluationService.publishScheduleResults(scheduleId, req.user, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return ApiResponse.success(res, 'Schedule examination results published successfully.', result);
  }),

  /**
   * GET /api/evaluations/schedule/:scheduleId/analytics
   * Get cohort performance analytics, histograms, and question difficulty breakdown
   */
  getAnalytics: asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const result = await evaluationService.getScheduleAnalytics(scheduleId, req.user);
    return ApiResponse.success(res, 'Schedule analytics retrieved successfully.', result);
  }),

  /**
   * GET /api/evaluations/schedule/:scheduleId/leaderboard
   * Get cohort rank list with pagination
   */
  getLeaderboard: asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const result = await evaluationService.getScheduleLeaderboard(scheduleId, req.user, {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50,
    });
    return ApiResponse.success(res, 'Schedule leaderboard retrieved successfully.', result);
  }),

  /**
   * GET /api/evaluations/attempt/:attemptId/result
   * Get candidate scorecard for an attempt
   */
  getCandidateResult: asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const result = await evaluationService.getCandidateResult(attemptId, req.user);
    return ApiResponse.success(res, 'Examination result retrieved successfully.', result);
  }),

  /**
   * PUT /api/evaluations/attempt/:attemptId/questions/:questionId/grade
   * Instructor grades a descriptive question response
   */
  gradeDescriptive: asyncHandler(async (req, res) => {
    const { attemptId, questionId } = req.params;
    const result = await evaluationService.gradeDescriptiveQuestion(
      attemptId,
      questionId,
      req.body,
      req.user
    );
    return ApiResponse.success(res, 'Descriptive question graded successfully.', { result });
  }),
};

export default evaluationController;
