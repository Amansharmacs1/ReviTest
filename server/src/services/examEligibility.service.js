import { ExamSchedule } from '../models/ExamSchedule.js';
import { ScheduleCandidate } from '../models/ScheduleCandidate.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Validates whether a candidate is authorized and eligible to access an examination schedule.
 * All time calculations are strictly server-authoritative and UTC-based.
 *
 * @param {string|ObjectId} candidateId
 * @param {string|ObjectId} scheduleId
 * @returns {Promise<{
 *   isEligible: boolean,
 *   reason?: string,
 *   schedule: object,
 *   assignment: object|null,
 *   safeExamSnapshot: object|null,
 *   timing: object
 * }>}
 */
export const checkCandidateEligibility = async (candidateId, scheduleId) => {
  // 1. Fetch Candidate
  const candidate = await User.findById(candidateId).lean();
  if (!candidate) {
    throw ApiError.notFound('Candidate record not found');
  }

  if (candidate.role !== 'CANDIDATE') {
    return {
      isEligible: false,
      reason: 'UNAUTHORIZED_ROLE',
      details: 'Only candidate accounts may access student examination portals',
    };
  }

  if (candidate.status !== 'ACTIVE') {
    return {
      isEligible: false,
      reason: 'ACCOUNT_SUSPENDED',
      details: 'Candidate account is inactive or suspended',
    };
  }

  // 2. Fetch Organization
  const organization = await Organization.findById(candidate.organizationId).lean();
  if (!organization || organization.status !== 'ACTIVE') {
    return {
      isEligible: false,
      reason: 'ORGANIZATION_INACTIVE',
      details: 'Institutional workspace is inactive or suspended',
    };
  }

  // 3. Fetch Schedule with populated immutable ExamSnapshot
  const schedule = await ExamSchedule.findById(scheduleId)
    .populate('examSnapshotId')
    .lean();

  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  // Strict Tenant Isolation
  if (schedule.organizationId.toString() !== candidate.organizationId.toString()) {
    throw ApiError.notFound('Examination schedule not found'); // Avoid leaking existence
  }

  if (schedule.status === 'CANCELLED') {
    return {
      isEligible: false,
      reason: 'SCHEDULE_CANCELLED',
      details: 'This examination schedule has been cancelled by the organization',
      schedule,
    };
  }

  // 4. Candidate Assignment Verification
  let isAssigned = false;
  let assignment = await ScheduleCandidate.findOne({
    scheduleId: schedule._id,
    candidateId: candidate._id,
  });

  if (schedule.eligibilityType === 'ALL_CANDIDATES') {
    isAssigned = true;
    // Auto-create assignment record if candidate accesses an ALL_CANDIDATES exam
    if (!assignment) {
      assignment = await ScheduleCandidate.create({
        organizationId: schedule.organizationId,
        scheduleId: schedule._id,
        candidateId: candidate._id,
        status: 'ASSIGNED',
      });
    }
  } else if (schedule.eligibilityType === 'BATCH') {
    const candidateBatch = candidate.profile?.department || '';
    if (
      schedule.targetBatch &&
      candidateBatch.toLowerCase() === schedule.targetBatch.toLowerCase()
    ) {
      isAssigned = true;
      if (!assignment) {
        assignment = await ScheduleCandidate.create({
          organizationId: schedule.organizationId,
          scheduleId: schedule._id,
          candidateId: candidate._id,
          status: 'ASSIGNED',
        });
      }
    }
  } else if (schedule.eligibilityType === 'SELECTED_CANDIDATES') {
    const isIdInAssigned = schedule.assignedCandidateIds?.some(
      (id) => id.toString() === candidate._id.toString()
    );
    if (isIdInAssigned || assignment) {
      isAssigned = true;
      if (!assignment) {
        assignment = await ScheduleCandidate.create({
          organizationId: schedule.organizationId,
          scheduleId: schedule._id,
          candidateId: candidate._id,
          status: 'ASSIGNED',
        });
      }
    }
  }

  if (!isAssigned) {
    return {
      isEligible: false,
      reason: 'NOT_ASSIGNED',
      details: 'You have not been assigned to this scheduled examination',
      schedule: {
        _id: schedule._id,
        title: schedule.title,
      },
    };
  }

  // 5. Attempt Limit Check
  const attemptsCount = assignment ? assignment.attemptsCount : 0;
  if (attemptsCount >= schedule.maxAttempts) {
    return {
      isEligible: false,
      reason: 'MAX_ATTEMPTS_REACHED',
      details: `Maximum allowed attempts (${schedule.maxAttempts}) have been exhausted for this assessment`,
      attemptsCount,
      maxAttempts: schedule.maxAttempts,
      schedule: {
        _id: schedule._id,
        title: schedule.title,
      },
      assignment,
    };
  }

  // 6. Time Window Verification (UTC-based)
  const now = new Date();
  const startTime = new Date(schedule.startTime);
  const endTime = new Date(schedule.endTime);

  const timing = {
    now: now.toISOString(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    isStarted: now >= startTime,
    isExpired: now > endTime,
    startsInSeconds: now < startTime ? Math.max(0, Math.round((startTime - now) / 1000)) : 0,
    remainingSeconds: now <= endTime ? Math.max(0, Math.round((endTime - now) / 1000)) : 0,
  };

  if (!timing.isStarted) {
    return {
      isEligible: false,
      reason: 'EXAM_NOT_STARTED',
      details: 'The examination window has not opened yet',
      timing,
      schedule: {
        _id: schedule._id,
        title: schedule.title,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        durationMinutes: schedule.durationMinutes,
      },
      assignment,
    };
  }

  if (timing.isExpired) {
    return {
      isEligible: false,
      reason: 'EXAM_EXPIRED',
      details: 'The scheduled access window for this examination has closed',
      timing,
      schedule: {
        _id: schedule._id,
        title: schedule.title,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      },
      assignment,
    };
  }

  // Check late entry grace period if candidate has not acknowledged/started
  if (schedule.lateEntryGraceMinutes > 0 && assignment?.status === 'ASSIGNED') {
    const lateCutoff = new Date(startTime.getTime() + schedule.lateEntryGraceMinutes * 60000);
    if (now > lateCutoff) {
      return {
        isEligible: false,
        reason: 'LATE_ENTRY_DENIED',
        details: `Entry window expired. Candidates must join within ${schedule.lateEntryGraceMinutes} minutes of start time`,
        timing,
        schedule: {
          _id: schedule._id,
          title: schedule.title,
        },
        assignment,
      };
    }
  }

  // 7. Extract Safe Exam Snapshot (strictly zero answer keys or evaluation guidance)
  const rawSnapshot = schedule.examSnapshotId;
  let safeExamSnapshot = null;

  if (rawSnapshot) {
    const meta = rawSnapshot.examMetadata || {};
    safeExamSnapshot = {
      _id: rawSnapshot._id,
      title: meta.title || rawSnapshot.title || schedule.title,
      description: meta.description || rawSnapshot.description || '',
      subject: meta.subject || rawSnapshot.subject || '',
      category: meta.category || rawSnapshot.category || 'General',
      durationMinutes: schedule.durationMinutes || meta.durationMinutes || rawSnapshot.durationMinutes,
      instructions: meta.instructions || rawSnapshot.instructions || '',
      totalMarks: rawSnapshot.totalMarks ?? meta.totalMarks ?? 0,
      passingMarks: meta.passingMarks ?? rawSnapshot.passingMarks ?? 0,
      sectionsCount: rawSnapshot.sections?.length || 0,
      totalQuestions:
        rawSnapshot.totalQuestions ??
        (rawSnapshot.sections || []).reduce(
          (sum, s) => sum + (s.questions?.length || 0),
          0
        ),
      settings: {
        shuffleQuestions: meta.settings?.shuffleQuestions || false,
        shuffleOptions: meta.settings?.shuffleOptions || false,
        allowReview: meta.settings?.allowReview !== false,
        showResultsImmediately: meta.settings?.showResultsImmediately || false,
        allowNegativeMarking: meta.settings?.allowNegativeMarking || false,
      },
    };
  }

  return {
    isEligible: true,
    schedule: {
      _id: schedule._id,
      title: schedule.title,
      description: schedule.description,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      durationMinutes: schedule.durationMinutes,
      maxAttempts: schedule.maxAttempts,
      status: schedule.status,
      settings: schedule.settings,
    },
    assignment,
    safeExamSnapshot,
    timing,
  };
};

export default { checkCandidateEligibility };
