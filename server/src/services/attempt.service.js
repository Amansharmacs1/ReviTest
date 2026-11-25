import { ExamAttempt, ATTEMPT_STATUS, SUBMISSION_REASON } from '../models/ExamAttempt.js';
import { AttemptResponse } from '../models/AttemptResponse.js';
import { ExamSnapshot } from '../models/ExamSnapshot.js';
import { ScheduleCandidate } from '../models/ScheduleCandidate.js';
import { checkCandidateEligibility } from './examEligibility.service.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Starts a new examination attempt or safely resumes an active IN_PROGRESS attempt.
 * Strictly calculates endsAt as Math.min(startedAt + durationMinutes, schedule.endTime).
 *
 * @param {string|ObjectId} candidateId
 * @param {string|ObjectId} scheduleId
 * @param {string} clientIp
 * @param {string} userAgent
 * @returns {Promise<{ isResumed: boolean, isExpired?: boolean, attempt: object }>}
 */
export const startOrResumeAttempt = async (candidateId, scheduleId, clientIp = '', userAgent = '') => {
  // 1. Check for existing active attempt first (allows resuming without re-checking entry grace)
  const existingAttempt = await ExamAttempt.findOne({
    scheduleId,
    candidateId,
    status: ATTEMPT_STATUS.IN_PROGRESS,
  });

  const now = new Date();

  if (existingAttempt) {
    // Check if ongoing attempt has expired on server time
    if (now > existingAttempt.endsAt) {
      existingAttempt.status = ATTEMPT_STATUS.AUTO_SUBMITTED;
      existingAttempt.submissionReason = SUBMISSION_REASON.TIME_EXPIRED;
      existingAttempt.submittedAt = existingAttempt.endsAt;
      await existingAttempt.save();

      await ScheduleCandidate.updateOne(
        { _id: existingAttempt.scheduleCandidateId },
        { $set: { status: 'SUBMITTED' } }
      );

      return {
        isResumed: false,
        isExpired: true,
        attempt: existingAttempt,
      };
    }

    return {
      isResumed: true,
      attempt: existingAttempt,
    };
  }

  // 2. Validate eligibility using centralized service
  const eligibility = await checkCandidateEligibility(candidateId, scheduleId);
  if (!eligibility.isEligible) {
    throw ApiError.forbidden(eligibility.details || 'Candidate is not eligible to start this examination.');
  }

  const { schedule, safeExamSnapshot } = eligibility;

  // 3. Ensure rules acknowledgement before starting
  const scheduleCandidate = await ScheduleCandidate.findOne({
    scheduleId,
    candidateId,
  });

  if (!scheduleCandidate || !scheduleCandidate.acknowledgedAt) {
    throw ApiError.forbidden(
      'You must acknowledge examination rules and instructions before starting the assessment.'
    );
  }

  // 4. Calculate server-authoritative endsAt (in UTC)
  const durationMs = (schedule.durationMinutes || 60) * 60 * 1000;
  const calculatedEnd = new Date(now.getTime() + durationMs);
  const scheduleEnd = new Date(schedule.endTime);

  // The attempt ends at the EARLIER of (now + duration) or schedule.endTime
  const endsAt = calculatedEnd < scheduleEnd ? calculatedEnd : scheduleEnd;

  if (now >= endsAt) {
    throw ApiError.forbidden('The examination access window has elapsed.');
  }

  // 5. Atomically increment attemptsCount in ScheduleCandidate
  const updatedCandidate = await ScheduleCandidate.findOneAndUpdate(
    {
      scheduleId,
      candidateId,
      attemptsCount: { $lt: schedule.maxAttempts || 1 },
    },
    {
      $inc: { attemptsCount: 1 },
      $set: {
        status: 'IN_PROGRESS',
        lastAttemptAt: now,
      },
    },
    { new: true }
  );

  if (!updatedCandidate) {
    throw ApiError.forbidden(
      `Maximum allowed examination attempts (${schedule.maxAttempts}) reached.`
    );
  }

  // 6. Create the ExamAttempt
  const attempt = await ExamAttempt.create({
    organizationId: scheduleCandidate.organizationId,
    scheduleId,
    candidateId,
    examId: scheduleCandidate.scheduleId?.examId || schedule.examId || safeExamSnapshot._id,
    examSnapshotId: safeExamSnapshot._id,
    scheduleCandidateId: updatedCandidate._id,
    attemptNumber: updatedCandidate.attemptsCount,
    status: ATTEMPT_STATUS.IN_PROGRESS,
    startedAt: now,
    endsAt,
    maximumMarks: safeExamSnapshot.totalMarks,
    ipAddress: clientIp,
    userAgent,
  });

  return {
    isResumed: false,
    attempt,
  };
};

/**
 * Retrieves sanitized questions for an active attempt.
 * Strictly filters out isCorrect, correct answer flags, and faculty evaluation guidance.
 *
 * @param {string|ObjectId} attemptId
 * @param {string|ObjectId} candidateId
 * @returns {Promise<{
 *   attempt: object,
 *   sections: Array,
 *   responses: object,
 *   serverTime: string
 * }>}
 */
export const getSanitizedQuestionsForAttempt = async (attemptId, candidateId) => {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw ApiError.notFound('Examination attempt not found.');
  }

  // Strict ownership verification
  if (attempt.candidateId.toString() !== candidateId.toString()) {
    throw ApiError.notFound('Examination attempt not found.');
  }

  const now = new Date();

  // Automatic expiry check
  if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS && now > attempt.endsAt) {
    attempt.status = ATTEMPT_STATUS.AUTO_SUBMITTED;
    attempt.submissionReason = SUBMISSION_REASON.TIME_EXPIRED;
    attempt.submittedAt = attempt.endsAt;
    await attempt.save();

    await ScheduleCandidate.updateOne(
      { _id: attempt.scheduleCandidateId },
      { $set: { status: 'SUBMITTED' } }
    );
  }

  // Fetch immutable snapshot
  const snapshot = await ExamSnapshot.findById(attempt.examSnapshotId).lean();
  if (!snapshot) {
    throw ApiError.notFound('Associated examination snapshot could not be located.');
  }

  // Sanitize questions: strip isCorrect, evaluationGuidance
  const sanitizedSections = (snapshot.sections || []).map((sec) => ({
    sectionId: sec.sectionId,
    title: sec.title,
    description: sec.description || '',
    instructions: sec.instructions || '',
    order: sec.order,
    sectionMarks: sec.sectionMarks,
    questions: (sec.questions || []).map((q) => ({
      questionId: q.questionId,
      sectionId: sec.sectionId,
      questionType: q.questionType,
      statement: q.statement,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      marks: q.marks,
      negativeMarks: q.negativeMarks || 0,
      order: q.order,
      options: (q.options || []).map((opt) => ({
        optionId: opt.optionId,
        text: opt.text,
      })),
    })),
  }));

  // Fetch candidate's current saved responses for this attempt
  const savedResponses = await AttemptResponse.find({ attemptId }).lean();
  const responseMap = {};
  savedResponses.forEach((r) => {
    responseMap[r.questionId.toString()] = {
      selectedOptions: r.selectedOptions || [],
      textAnswer: r.textAnswer || '',
      isAnswered: r.isAnswered,
      isMarkedForReview: r.isMarkedForReview,
      version: r.version,
      savedAt: r.savedAt,
    };
  });

  const remainingSeconds =
    attempt.status === ATTEMPT_STATUS.IN_PROGRESS && now < attempt.endsAt
      ? Math.max(0, Math.round((attempt.endsAt - now) / 1000))
      : 0;

  return {
    attempt: {
      _id: attempt._id,
      scheduleId: attempt.scheduleId,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      endsAt: attempt.endsAt,
      submittedAt: attempt.submittedAt,
      submissionReason: attempt.submissionReason,
      remainingSeconds,
      maximumMarks: attempt.maximumMarks,
      examTitle: snapshot.examMetadata?.title || 'Examination',
      examInstructions: snapshot.examMetadata?.instructions || '',
    },
    sections: sanitizedSections,
    responses: responseMap,
    serverTime: now.toISOString(),
  };
};

/**
 * Persists an answer response with type validation and optimistic concurrency control.
 *
 * @param {string|ObjectId} attemptId
 * @param {string|ObjectId} questionId
 * @param {string|ObjectId} candidateId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const saveAnswerResponse = async (attemptId, questionId, candidateId, payload) => {
  const { selectedOptions = [], textAnswer = '', isMarkedForReview, clientVersion } = payload;

  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw ApiError.notFound('Examination attempt not found.');
  }

  // Strict ownership check
  if (attempt.candidateId.toString() !== candidateId.toString()) {
    throw ApiError.notFound('Examination attempt not found.');
  }

  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    throw ApiError.badRequest(
      `Cannot save response. Attempt status is currently ${attempt.status}.`
    );
  }

  const now = new Date();

  // Check server time expiry
  if (now > attempt.endsAt) {
    attempt.status = ATTEMPT_STATUS.AUTO_SUBMITTED;
    attempt.submissionReason = SUBMISSION_REASON.TIME_EXPIRED;
    attempt.submittedAt = attempt.endsAt;
    await attempt.save();

    await ScheduleCandidate.updateOne(
      { _id: attempt.scheduleCandidateId },
      { $set: { status: 'SUBMITTED' } }
    );

    throw ApiError.forbidden('Examination duration has expired. Answers can no longer be saved.');
  }

  // Locate question in immutable snapshot to validate options and response type
  const snapshot = await ExamSnapshot.findById(attempt.examSnapshotId).lean();
  if (!snapshot) {
    throw ApiError.notFound('Associated examination snapshot could not be located.');
  }

  let foundQuestion = null;
  let foundSectionId = '';

  for (const sec of snapshot.sections || []) {
    for (const q of sec.questions || []) {
      if (q.questionId.toString() === questionId.toString()) {
        foundQuestion = q;
        foundSectionId = sec.sectionId;
        break;
      }
    }
    if (foundQuestion) break;
  }

  if (!foundQuestion) {
    throw ApiError.badRequest('Question does not belong to this examination snapshot.');
  }

  // Validate response payload against question type
  const validOptionIds = new Set((foundQuestion.options || []).map((o) => o.optionId));

  if (foundQuestion.questionType === 'MCQ_SINGLE' || foundQuestion.questionType === 'TRUE_FALSE') {
    if (Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      if (selectedOptions.length !== 1) {
        throw ApiError.badRequest('Only one option may be selected for this question type.');
      }
      if (!validOptionIds.has(selectedOptions[0])) {
        throw ApiError.badRequest('Invalid option ID submitted.');
      }
    }
  } else if (foundQuestion.questionType === 'MCQ_MULTIPLE') {
    if (Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      for (const optId of selectedOptions) {
        if (!validOptionIds.has(optId)) {
          throw ApiError.badRequest(`Invalid option ID submitted: ${optId}`);
        }
      }
    }
  } else if (foundQuestion.questionType === 'DESCRIPTIVE') {
    if (typeof textAnswer !== 'string') {
      throw ApiError.badRequest('Text answer must be a valid string.');
    }
    if (textAnswer.length > 25000) {
      throw ApiError.badRequest('Descriptive answer exceeds maximum length (25,000 characters).');
    }
  }

  // Determine whether question has an active answer
  const isAnswered =
    foundQuestion.questionType === 'DESCRIPTIVE'
      ? textAnswer.trim().length > 0
      : Array.isArray(selectedOptions) && selectedOptions.length > 0;

  // Optimistic concurrency check
  const existingResponse = await AttemptResponse.findOne({ attemptId, questionId });

  if (existingResponse) {
    // If client supplied a version older than server version, reject stale overwrite
    if (
      typeof clientVersion === 'number' &&
      clientVersion < existingResponse.version
    ) {
      return {
        success: false,
        stale: true,
        message: 'Stale write rejected. Newer server response preserved.',
        serverVersion: existingResponse.version,
        currentResponse: {
          selectedOptions: existingResponse.selectedOptions,
          textAnswer: existingResponse.textAnswer,
          isAnswered: existingResponse.isAnswered,
          isMarkedForReview: existingResponse.isMarkedForReview,
          version: existingResponse.version,
          savedAt: existingResponse.savedAt,
        },
      };
    }

    existingResponse.selectedOptions = selectedOptions;
    existingResponse.textAnswer = textAnswer;
    existingResponse.isAnswered = isAnswered;
    if (isMarkedForReview !== undefined) {
      existingResponse.isMarkedForReview = isMarkedForReview;
    }
    existingResponse.savedAt = now;
    existingResponse.version += 1;
    await existingResponse.save();

    await ExamAttempt.updateOne({ _id: attempt._id }, { $set: { lastActivityAt: now } });

    return {
      success: true,
      stale: false,
      questionId,
      version: existingResponse.version,
      savedAt: now,
      isAnswered,
      isMarkedForReview: existingResponse.isMarkedForReview,
    };
  }

  // Create new response record
  const newResponse = await AttemptResponse.create({
    organizationId: attempt.organizationId,
    attemptId: attempt._id,
    scheduleId: attempt.scheduleId,
    candidateId: attempt.candidateId,
    questionId,
    sectionId: foundSectionId,
    questionType: foundQuestion.questionType,
    selectedOptions: selectedOptions || [],
    textAnswer: textAnswer || '',
    isAnswered,
    isMarkedForReview: isMarkedForReview || false,
    savedAt: now,
    version: 1,
  });

  await ExamAttempt.updateOne({ _id: attempt._id }, { $set: { lastActivityAt: now } });

  return {
    success: true,
    stale: false,
    questionId,
    version: newResponse.version,
    savedAt: now,
    isAnswered,
    isMarkedForReview: newResponse.isMarkedForReview,
  };
};

/**
 * Idempotently submits an active attempt.
 *
 * @param {string|ObjectId} attemptId
 * @param {string|ObjectId} candidateId
 * @param {string} reason
 * @returns {Promise<object>}
 */
export const submitAttempt = async (attemptId, candidateId, reason = SUBMISSION_REASON.MANUAL) => {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw ApiError.notFound('Examination attempt not found.');
  }

  // Strict ownership check
  if (attempt.candidateId.toString() !== candidateId.toString()) {
    throw ApiError.notFound('Examination attempt not found.');
  }

  // Idempotency: if already submitted, return existing confirmation
  if (attempt.status === ATTEMPT_STATUS.SUBMITTED || attempt.status === ATTEMPT_STATUS.AUTO_SUBMITTED) {
    return {
      isAlreadySubmitted: true,
      attempt,
    };
  }

  const now = new Date();
  const targetStatus =
    reason === SUBMISSION_REASON.TIME_EXPIRED
      ? ATTEMPT_STATUS.AUTO_SUBMITTED
      : ATTEMPT_STATUS.SUBMITTED;

  // Atomic transition from IN_PROGRESS
  const updatedAttempt = await ExamAttempt.findOneAndUpdate(
    { _id: attemptId, status: ATTEMPT_STATUS.IN_PROGRESS },
    {
      $set: {
        status: targetStatus,
        submittedAt: now,
        submissionReason: reason,
        lastActivityAt: now,
      },
    },
    { new: true }
  );

  if (!updatedAttempt) {
    // Another concurrent submit completed it
    const latest = await ExamAttempt.findById(attemptId);
    return {
      isAlreadySubmitted: true,
      attempt: latest,
    };
  }

  await ScheduleCandidate.updateOne(
    { _id: updatedAttempt.scheduleCandidateId },
    { $set: { status: 'SUBMITTED' } }
  );

  // Compute summary stats for submission receipt
  const responsesCount = await AttemptResponse.countDocuments({
    attemptId,
    isAnswered: true,
  });

  return {
    isSubmitted: true,
    attempt: updatedAttempt,
    answeredCount: responsesCount,
    submittedAt: now,
  };
};

export default {
  startOrResumeAttempt,
  getSanitizedQuestionsForAttempt,
  saveAnswerResponse,
  submitAttempt,
};
