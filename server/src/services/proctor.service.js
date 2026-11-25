import {
  ExamAttempt,
  ATTEMPT_STATUS,
  SUBMISSION_REASON,
  ExamViolation,
  VIOLATION_TYPE,
  VIOLATION_SEVERITY,
  ExamSchedule,
  ScheduleCandidate,
  ExamSnapshot,
  AuditLog,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const proctorService = {
  /**
   * Record a security integrity violation event during an active candidate attempt
   */
  async recordViolation(candidateUser, attemptId, violationData, reqContext = {}) {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    // Verify attempt belongs to candidate
    if (attempt.candidateId.toString() !== candidateUser._id.toString()) {
      throw ApiError.forbidden('You are not authorized to log violations for this attempt');
    }

    // If attempt is already terminated or submitted, ignore further violations
    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      return {
        attempt,
        ignored: true,
        reason: 'Attempt is no longer in progress',
      };
    }

    const {
      violationType,
      severity = VIOLATION_SEVERITY.MEDIUM,
      details = '',
      metadata = {},
    } = violationData;

    if (!violationType || !Object.values(VIOLATION_TYPE).includes(violationType)) {
      throw ApiError.badRequest(`Invalid violation type: ${violationType}`);
    }

    // Fetch snapshot to check maximum allowed tab switches
    const snapshot = await ExamSnapshot.findById(attempt.examSnapshotId).select('examMetadata');
    const settings = snapshot?.examMetadata?.settings || {};
    const maxTabSwitches = typeof settings.maxTabSwitches === 'number' ? settings.maxTabSwitches : 3;

    // Create violation record
    const violation = await ExamViolation.create({
      organizationId: attempt.organizationId,
      scheduleId: attempt.scheduleId,
      attemptId: attempt._id,
      candidateId: candidateUser._id,
      violationType,
      severity,
      details: details || `Integrity event detected: ${violationType}`,
      metadata,
      timestamp: new Date(),
    });

    // Update attempt counters
    attempt.violationCount = (attempt.violationCount || 0) + 1;
    if (violationType === VIOLATION_TYPE.TAB_SWITCH || violationType === VIOLATION_TYPE.WINDOW_BLUR) {
      attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
    }

    let autoTerminated = false;

    // Check threshold violation
    if (attempt.tabSwitchCount >= maxTabSwitches) {
      attempt.isFlagged = true;
      attempt.flaggedReason = `Maximum tab switch limit exceeded (${attempt.tabSwitchCount}/${maxTabSwitches})`;

      // Terminate attempt if threshold reached
      attempt.status = ATTEMPT_STATUS.AUTO_SUBMITTED;
      attempt.submissionReason = SUBMISSION_REASON.VIOLATION_TERMINATED;
      attempt.submittedAt = new Date();
      autoTerminated = true;

      // Log critical audit event
      await AuditLog.create({
        organizationId: attempt.organizationId,
        actorId: candidateUser._id,
        actorRole: candidateUser.role,
        actorName: candidateUser.name,
        action: 'ATTEMPT_AUTO_TERMINATED_VIOLATION',
        targetType: 'ATTEMPT',
        targetId: attempt._id,
        targetName: `Attempt #${attempt.attemptNumber}`,
        description: `Attempt terminated automatically due to repeated integrity violations (${attempt.tabSwitchCount} tab switches)`,
        metadata: {
          tabSwitchCount: attempt.tabSwitchCount,
          maxTabSwitches,
          lastViolationId: violation._id,
        },
        ipAddress: reqContext.ipAddress || '',
        userAgent: reqContext.userAgent || '',
      });
    }

    await attempt.save();

    return {
      violation,
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        violationCount: attempt.violationCount,
        tabSwitchCount: attempt.tabSwitchCount,
        isFlagged: attempt.isFlagged,
        submissionReason: attempt.submissionReason,
      },
      autoTerminated,
      tabSwitchCount: attempt.tabSwitchCount,
      maxTabSwitches,
      remainingTabSwitches: Math.max(0, maxTabSwitches - attempt.tabSwitchCount),
    };
  },

  /**
   * Get violations list for an attempt with strict authorization
   */
  async getViolationsForAttempt(attemptId, requestingUser) {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    if (requestingUser.role === 'CANDIDATE') {
      if (attempt.candidateId.toString() !== requestingUser._id.toString()) {
        throw ApiError.forbidden('You are not authorized to view violations for another candidate');
      }
    } else if (['ORG_ADMIN', 'PROCTOR'].includes(requestingUser.role)) {
      if (attempt.organizationId.toString() !== requestingUser.organizationId.toString()) {
        throw ApiError.forbidden('Access denied to other organization assessments');
      }
    } else if (requestingUser.role !== 'SUPER_ADMIN') {
      throw ApiError.forbidden('Unauthorized access');
    }

    const violations = await ExamViolation.find({ attemptId })
      .sort({ timestamp: -1 })
      .lean();

    return {
      attemptId: attempt._id,
      violationCount: attempt.violationCount || 0,
      tabSwitchCount: attempt.tabSwitchCount || 0,
      isFlagged: attempt.isFlagged || false,
      flaggedReason: attempt.flaggedReason || '',
      violations,
    };
  },

  /**
   * Get live proctor feed for an exam schedule
   */
  async getLiveScheduleProctorFeed(scheduleId, requestingUser) {
    const schedule = await ExamSchedule.findById(scheduleId);
    if (!schedule) {
      throw ApiError.notFound('Exam schedule not found');
    }

    if (
      ['ORG_ADMIN', 'PROCTOR'].includes(requestingUser.role) &&
      schedule.organizationId.toString() !== requestingUser.organizationId.toString()
    ) {
      throw ApiError.forbidden('Access denied to other organization schedules');
    }

    // Fetch attempts with candidate info
    const attempts = await ExamAttempt.find({ scheduleId })
      .populate('candidateId', 'name email profile')
      .sort({ lastActivityAt: -1 })
      .lean();

    // Fetch recent 50 violations for this schedule
    const recentViolations = await ExamViolation.find({ scheduleId })
      .populate('candidateId', 'name email')
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    // Compute live metrics
    const totalAssigned = await ScheduleCandidate.countDocuments({ scheduleId });
    const activeNow = attempts.filter((a) => a.status === ATTEMPT_STATUS.IN_PROGRESS).length;
    const submitted = attempts.filter(
      (a) => a.status === ATTEMPT_STATUS.SUBMITTED || a.status === ATTEMPT_STATUS.AUTO_SUBMITTED
    ).length;
    const flagged = attempts.filter((a) => a.isFlagged).length;
    const totalViolations = await ExamViolation.countDocuments({ scheduleId });

    return {
      schedule: {
        _id: schedule._id,
        title: schedule.title,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        durationMinutes: schedule.durationMinutes,
        status: schedule.status,
      },
      summary: {
        totalAssigned,
        activeNow,
        submitted,
        flagged,
        totalViolations,
      },
      attempts,
      recentViolations,
    };
  },

  /**
   * Issue an official proctor warning to a candidate's active attempt
   */
  async issueProctorWarning(proctorUser, attemptId, { message }, reqContext = {}) {
    if (!message || message.trim().length === 0) {
      throw ApiError.badRequest('Warning message cannot be empty');
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    if (
      ['ORG_ADMIN', 'PROCTOR'].includes(proctorUser.role) &&
      attempt.organizationId.toString() !== proctorUser.organizationId.toString()
    ) {
      throw ApiError.forbidden('Access denied');
    }

    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      throw ApiError.badRequest('Warnings can only be issued to active IN_PROGRESS attempts');
    }

    attempt.proctorWarnings.push({
      message: message.trim(),
      timestamp: new Date(),
      proctorId: proctorUser._id,
      proctorName: proctorUser.name,
    });

    attempt.isFlagged = true;
    if (!attempt.flaggedReason) {
      attempt.flaggedReason = 'Proctor warning issued';
    }

    await attempt.save();

    await AuditLog.create({
      organizationId: attempt.organizationId,
      actorId: proctorUser._id,
      actorRole: proctorUser.role,
      actorName: proctorUser.name,
      action: 'PROCTOR_WARNING_ISSUED',
      targetType: 'ATTEMPT',
      targetId: attempt._id,
      targetName: `Attempt #${attempt.attemptNumber}`,
      description: `Proctor warning issued to candidate: "${message.trim()}"`,
      metadata: { attemptId: attempt._id, candidateId: attempt.candidateId },
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    return attempt;
  },

  /**
   * Force terminate an active candidate attempt due to confirmed misconduct
   */
  async terminateAttemptByProctor(proctorUser, attemptId, { reason }, reqContext = {}) {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    if (
      ['ORG_ADMIN', 'PROCTOR'].includes(proctorUser.role) &&
      attempt.organizationId.toString() !== proctorUser.organizationId.toString()
    ) {
      throw ApiError.forbidden('Access denied');
    }

    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      throw ApiError.badRequest('Only active IN_PROGRESS attempts can be terminated');
    }

    attempt.status = ATTEMPT_STATUS.AUTO_SUBMITTED;
    attempt.submissionReason = SUBMISSION_REASON.PROCTOR_FORCE_SUBMIT;
    attempt.submittedAt = new Date();
    attempt.isFlagged = true;
    attempt.flaggedReason = reason || 'Terminated by proctor for integrity violation';

    await attempt.save();

    await AuditLog.create({
      organizationId: attempt.organizationId,
      actorId: proctorUser._id,
      actorRole: proctorUser.role,
      actorName: proctorUser.name,
      action: 'PROCTOR_TERMINATE_ATTEMPT',
      targetType: 'ATTEMPT',
      targetId: attempt._id,
      targetName: `Attempt #${attempt.attemptNumber}`,
      description: `Attempt forcibly terminated by proctor. Reason: ${attempt.flaggedReason}`,
      metadata: { attemptId: attempt._id, candidateId: attempt.candidateId },
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    return attempt;
  },
};

export default proctorService;
