import { proctorService } from '../services/proctor.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const proctorController = {
  /**
   * POST /api/attempts/:attemptId/violations
   * Candidate logs an integrity event (tab switch, blur, fullscreen exit, etc.)
   */
  recordViolation: asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const result = await proctorService.recordViolation(
      req.user,
      attemptId,
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    return ApiResponse.created(
      res,
      result.autoTerminated
        ? 'Maximum violations exceeded. Examination attempt terminated.'
        : 'Violation recorded successfully.',
      result
    );
  }),

  /**
   * GET /api/attempts/:attemptId/violations
   * Candidate, proctor, or org admin views violations audit for an attempt
   */
  getAttemptViolations: asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const result = await proctorService.getViolationsForAttempt(attemptId, req.user);
    return ApiResponse.success(res, 'Attempt violations retrieved successfully.', result);
  }),

  /**
   * GET /api/proctor/schedules/:scheduleId/live
   * Live proctoring monitor feed for exam schedules
   */
  getLiveScheduleFeed: asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const result = await proctorService.getLiveScheduleProctorFeed(scheduleId, req.user);
    return ApiResponse.success(res, 'Live proctoring feed retrieved successfully.', result);
  }),

  /**
   * POST /api/proctor/attempts/:attemptId/warning
   * Proctor issues an official warning to a live candidate attempt
   */
  issueWarning: asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const result = await proctorService.issueProctorWarning(
      req.user,
      attemptId,
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );
    return ApiResponse.success(res, 'Warning issued to candidate successfully.', { attempt: result });
  }),

  /**
   * POST /api/proctor/attempts/:attemptId/terminate
   * Proctor forcibly terminates an active attempt for confirmed misconduct
   */
  terminateAttempt: asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const result = await proctorService.terminateAttemptByProctor(
      req.user,
      attemptId,
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );
    return ApiResponse.success(res, 'Attempt terminated successfully.', { attempt: result });
  }),
};

export default proctorController;
