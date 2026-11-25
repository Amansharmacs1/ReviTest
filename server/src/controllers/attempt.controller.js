import {
  startOrResumeAttempt,
  getSanitizedQuestionsForAttempt,
  saveAnswerResponse,
  submitAttempt,
} from '../services/attempt.service.js';
import { ExamAttempt, ATTEMPT_STATUS, SUBMISSION_REASON } from '../models/ExamAttempt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Start a new examination attempt or resume an ongoing IN_PROGRESS attempt.
 * POST /api/attempts/start
 */
export const startAttempt = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { scheduleId } = req.body;

  if (!scheduleId) {
    throw ApiError.badRequest('Examination schedule ID is required');
  }

  const clientIp = req.ip || req.headers['x-forwarded-for'] || '';
  const userAgent = req.headers['user-agent'] || '';

  const result = await startOrResumeAttempt(candidateId, scheduleId, clientIp, userAgent);

  if (!result.isResumed && !result.isExpired) {
    await logAuditEvent(req, {
      action: 'ATTEMPT_STARTED',
      targetType: 'ATTEMPT',
      targetId: result.attempt._id,
      targetName: `Attempt #${result.attempt.attemptNumber}`,
      description: `Candidate ${req.user.name} started examination attempt`,
      metadata: {
        attemptId: result.attempt._id,
        scheduleId,
        startedAt: result.attempt.startedAt,
        endsAt: result.attempt.endsAt,
      },
    });
  }

  return ApiResponse.success(res, {
    message: result.isResumed
      ? 'Resumed ongoing active examination attempt.'
      : result.isExpired
      ? 'Examination window has expired.'
      : 'Examination attempt started successfully.',
    attempt: result.attempt,
    isResumed: result.isResumed,
    isExpired: result.isExpired || false,
    serverTime: new Date().toISOString(),
  });
});

/**
 * Check if candidate has an existing active IN_PROGRESS attempt for a schedule.
 * GET /api/attempts/active/:scheduleId
 */
export const getActiveAttemptForSchedule = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { scheduleId } = req.params;

  const attempt = await ExamAttempt.findOne({
    scheduleId,
    candidateId,
    status: ATTEMPT_STATUS.IN_PROGRESS,
  }).lean();

  if (!attempt) {
    return ApiResponse.success(res, { hasActiveAttempt: false, attempt: null });
  }

  const now = new Date();
  const isExpired = now > new Date(attempt.endsAt);

  return ApiResponse.success(res, {
    hasActiveAttempt: !isExpired,
    isExpired,
    attempt,
    serverTime: now.toISOString(),
  });
});

/**
 * Deliver sanitized questions for candidate's own attempt.
 * GET /api/attempts/:attemptId/questions
 */
export const getAttemptQuestions = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { attemptId } = req.params;

  const data = await getSanitizedQuestionsForAttempt(attemptId, candidateId);

  return ApiResponse.success(res, data);
});

/**
 * Autosave question answer response with optimistic concurrency control.
 * PUT /api/attempts/:attemptId/answers/:questionId
 */
export const saveAnswer = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { attemptId, questionId } = req.params;

  const result = await saveAnswerResponse(attemptId, questionId, candidateId, req.body);

  return ApiResponse.success(res, result);
});

/**
 * Manually submit examination attempt.
 * POST /api/attempts/:attemptId/submit
 */
export const submitAttemptManual = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { attemptId } = req.params;

  const result = await submitAttempt(attemptId, candidateId, SUBMISSION_REASON.MANUAL);

  if (result.isSubmitted) {
    await logAuditEvent(req, {
      action: 'ATTEMPT_SUBMITTED',
      targetType: 'ATTEMPT',
      targetId: result.attempt._id,
      targetName: `Attempt #${result.attempt.attemptNumber}`,
      description: `Candidate ${req.user.name} submitted examination attempt (MANUAL)`,
      metadata: {
        attemptId: result.attempt._id,
        submittedAt: result.submittedAt,
        answeredCount: result.answeredCount,
      },
    });
  }

  return ApiResponse.success(res, {
    message: 'Examination submitted successfully.',
    ...result,
  });
});

/**
 * Automatically submit examination attempt upon server expiry.
 * POST /api/attempts/:attemptId/auto-submit
 */
export const autoSubmitAttempt = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { attemptId } = req.params;

  const result = await submitAttempt(attemptId, candidateId, SUBMISSION_REASON.TIME_EXPIRED);

  if (result.isSubmitted) {
    await logAuditEvent(req, {
      action: 'ATTEMPT_AUTO_SUBMITTED',
      targetType: 'ATTEMPT',
      targetId: result.attempt._id,
      targetName: `Attempt #${result.attempt.attemptNumber}`,
      description: `Examination attempt automatically submitted due to time expiry`,
      metadata: {
        attemptId: result.attempt._id,
        submittedAt: result.submittedAt,
      },
    });
  }

  return ApiResponse.success(res, {
    message: 'Examination attempt auto-submitted upon time expiry.',
    ...result,
  });
});
