import { ExamSchedule } from '../models/ExamSchedule.js';
import { ScheduleCandidate } from '../models/ScheduleCandidate.js';
import { Exam } from '../models/Exam.js';
import { ExamSnapshot } from '../models/ExamSnapshot.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { logAuditEvent } from '../services/audit.service.js';
import { checkCandidateEligibility } from '../services/examEligibility.service.js';

// =============================================================================
// ORG_ADMIN CONTROLLERS
// =============================================================================

/**
 * List examination schedules for the authenticated organization.
 */
export const getSchedules = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const { search, status, examId } = req.query;

  const filter = { organizationId };

  if (status) {
    filter.status = status;
  }

  if (examId) {
    filter.examId = examId;
  }

  if (search && search.trim()) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const [schedules, total] = await Promise.all([
    ExamSchedule.find(filter)
      .populate('examId', 'title subject totalMarks durationMinutes status')
      .populate('createdBy', 'name email')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ExamSchedule.countDocuments(filter),
  ]);

  // Aggregate candidate counts for each schedule
  const scheduleIds = schedules.map((s) => s._id);
  const candidateCounts = await ScheduleCandidate.aggregate([
    { $match: { scheduleId: { $in: scheduleIds } } },
    { $group: { _id: '$scheduleId', totalCandidates: { $sum: 1 } } },
  ]);

  const countMap = new Map();
  candidateCounts.forEach((c) => countMap.set(c._id.toString(), c.totalCandidates));

  const enrichedSchedules = schedules.map((s) => ({
    ...s,
    candidateCount: countMap.get(s._id.toString()) || (s.assignedCandidateIds?.length || 0),
    computedStatus: (() => {
      if (s.status === 'CANCELLED') return 'CANCELLED';
      const now = new Date();
      const st = new Date(s.startTime);
      const et = new Date(s.endTime);
      if (now < st) return 'SCHEDULED';
      if (now >= st && now <= et) return 'ACTIVE';
      return 'COMPLETED';
    })(),
  }));

  return ApiResponse.success(res, {
    schedules: enrichedSchedules,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Create a new examination schedule referencing an immutable ExamSnapshot.
 */
export const createSchedule = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const {
    examId,
    title,
    description,
    startTime,
    endTime,
    durationMinutes,
    lateEntryGraceMinutes = 15,
    maxAttempts = 1,
    eligibilityType = 'ALL_CANDIDATES',
    targetBatch,
    assignedCandidateIds = [],
    settings = {},
  } = req.body;

  if (!examId || !title || !startTime || !endTime) {
    throw ApiError.badRequest('Exam ID, title, start time, and end time are required');
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw ApiError.badRequest('Invalid start or end date/time format');
  }

  if (start >= end) {
    throw ApiError.badRequest('Scheduled start time must be strictly before end time');
  }

  // Verify Exam exists, belongs to organization, and is published
  const exam = await Exam.findOne({ _id: examId, organizationId });
  if (!exam) {
    throw ApiError.notFound('Referenced examination not found in your organization');
  }

  if (exam.status !== 'PUBLISHED' || !exam.publishedVersionId) {
    throw ApiError.badRequest(
      'Only published examinations can be scheduled. Please validate and publish this exam first.'
    );
  }

  // Verify the immutable snapshot exists
  const snapshot = await ExamSnapshot.findOne({
    _id: exam.publishedVersionId,
    organizationId,
  });

  if (!snapshot) {
    throw ApiError.badRequest(
      'The immutable exam snapshot for this published exam could not be located.'
    );
  }

  const examDuration = durationMinutes || snapshot.durationMinutes || exam.durationMinutes;

  // Validate candidate IDs if explicitly selected
  let validCandidateIds = [];
  if (eligibilityType === 'SELECTED_CANDIDATES' && Array.isArray(assignedCandidateIds)) {
    const verifiedCandidates = await User.find({
      _id: { $in: assignedCandidateIds },
      organizationId,
      role: 'CANDIDATE',
    }).select('_id');
    validCandidateIds = verifiedCandidates.map((c) => c._id);
  }

  // Create the schedule
  const schedule = await ExamSchedule.create({
    organizationId,
    examId: exam._id,
    examSnapshotId: snapshot._id,
    title: title.trim(),
    description: description ? description.trim() : '',
    startTime: start,
    endTime: end,
    durationMinutes: examDuration,
    lateEntryGraceMinutes: Math.max(0, parseInt(lateEntryGraceMinutes) || 0),
    maxAttempts: Math.max(1, parseInt(maxAttempts) || 1),
    eligibilityType,
    targetBatch: targetBatch ? targetBatch.trim() : undefined,
    assignedCandidateIds: validCandidateIds,
    settings: {
      requireAcknowledgement: settings.requireAcknowledgement !== false,
      allowReview: settings.allowReview !== false,
      showResultsImmediately: settings.showResultsImmediately === true,
      allowLateSubmission: settings.allowLateSubmission === true,
    },
    createdBy: req.user._id,
  });

  // Materialize candidate assignments
  let assignedCount = 0;
  if (eligibilityType === 'SELECTED_CANDIDATES' && validCandidateIds.length > 0) {
    const assignments = validCandidateIds.map((cId) => ({
      organizationId,
      scheduleId: schedule._id,
      candidateId: cId,
      status: 'ASSIGNED',
      assignedBy: req.user._id,
    }));
    await ScheduleCandidate.insertMany(assignments, { ordered: false }).catch(() => {});
    assignedCount = validCandidateIds.length;
  } else if (eligibilityType === 'ALL_CANDIDATES') {
    const allCandidates = await User.find({
      organizationId,
      role: 'CANDIDATE',
      status: 'ACTIVE',
    }).select('_id');

    if (allCandidates.length > 0) {
      const assignments = allCandidates.map((c) => ({
        organizationId,
        scheduleId: schedule._id,
        candidateId: c._id,
        status: 'ASSIGNED',
        assignedBy: req.user._id,
      }));
      await ScheduleCandidate.insertMany(assignments, { ordered: false }).catch(() => {});
      assignedCount = allCandidates.length;
    }
  } else if (eligibilityType === 'BATCH' && targetBatch) {
    const batchCandidates = await User.find({
      organizationId,
      role: 'CANDIDATE',
      status: 'ACTIVE',
      'profile.department': { $regex: new RegExp(`^${targetBatch.trim()}$`, 'i') },
    }).select('_id');

    if (batchCandidates.length > 0) {
      const assignments = batchCandidates.map((c) => ({
        organizationId,
        scheduleId: schedule._id,
        candidateId: c._id,
        status: 'ASSIGNED',
        assignedBy: req.user._id,
      }));
      await ScheduleCandidate.insertMany(assignments, { ordered: false }).catch(() => {});
      assignedCount = batchCandidates.length;
    }
  }

  await logAuditEvent(req, {
    action: 'SCHEDULE_CREATED',
    targetType: 'SCHEDULE',
    targetId: schedule._id,
    targetName: schedule.title,
    description: `Created examination schedule '${schedule.title}' for exam '${exam.title}'`,
    metadata: {
      examId: exam._id,
      snapshotId: snapshot._id,
      eligibilityType,
      assignedCount,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    },
  });

  return ApiResponse.created(res, {
    schedule,
    assignedCandidatesCount: assignedCount,
  });
});

/**
 * Get detailed information for an examination schedule.
 */
export const getScheduleById = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const { scheduleId } = req.params;

  const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId })
    .populate('examId', 'title subject totalMarks durationMinutes')
    .populate('examSnapshotId', 'title totalMarks passingMarks durationMinutes sections')
    .populate('createdBy', 'name email');

  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  const assignedCount = await ScheduleCandidate.countDocuments({ scheduleId: schedule._id });

  return ApiResponse.success(res, {
    schedule: {
      ...schedule.toObject(),
      candidateCount: assignedCount,
      computedStatus: schedule.computeCurrentStatus(),
    },
  });
});

/**
 * Update an existing examination schedule.
 */
export const updateSchedule = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const { scheduleId } = req.params;
  const {
    title,
    description,
    startTime,
    endTime,
    durationMinutes,
    lateEntryGraceMinutes,
    maxAttempts,
    settings,
  } = req.body;

  const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId });
  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  if (schedule.status === 'CANCELLED') {
    throw ApiError.badRequest('Cancelled schedules cannot be modified');
  }

  if (title) schedule.title = title.trim();
  if (description !== undefined) schedule.description = description.trim();

  if (startTime || endTime) {
    const start = startTime ? new Date(startTime) : schedule.startTime;
    const end = endTime ? new Date(endTime) : schedule.endTime;

    if (start >= end) {
      throw ApiError.badRequest('Scheduled start time must be strictly before end time');
    }

    schedule.startTime = start;
    schedule.endTime = end;
  }

  if (durationMinutes !== undefined) {
    schedule.durationMinutes = Math.max(1, parseInt(durationMinutes) || 1);
  }
  if (lateEntryGraceMinutes !== undefined) {
    schedule.lateEntryGraceMinutes = Math.max(0, parseInt(lateEntryGraceMinutes) || 0);
  }
  if (maxAttempts !== undefined) {
    schedule.maxAttempts = Math.max(1, parseInt(maxAttempts) || 1);
  }

  if (settings && typeof settings === 'object') {
    schedule.settings = {
      ...schedule.settings,
      ...settings,
    };
  }

  schedule.updatedBy = req.user._id;
  await schedule.save();

  await logAuditEvent(req, {
    action: 'SCHEDULE_UPDATED',
    targetType: 'SCHEDULE',
    targetId: schedule._id,
    targetName: schedule.title,
    description: `Updated examination schedule '${schedule.title}'`,
  });

  return ApiResponse.success(res, { schedule });
});

/**
 * Cancel an examination schedule.
 */
export const cancelSchedule = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const { scheduleId } = req.params;

  const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId });
  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  if (schedule.status === 'CANCELLED') {
    throw ApiError.badRequest('Schedule is already cancelled');
  }

  schedule.status = 'CANCELLED';
  schedule.updatedBy = req.user._id;
  await schedule.save();

  await logAuditEvent(req, {
    action: 'SCHEDULE_CANCELLED',
    targetType: 'SCHEDULE',
    targetId: schedule._id,
    targetName: schedule.title,
    description: `Cancelled examination schedule '${schedule.title}'`,
  });

  return ApiResponse.success(res, {
    message: 'Examination schedule has been cancelled successfully',
    schedule,
  });
});

/**
 * List assigned candidates for a schedule with search and pagination.
 */
export const getScheduleCandidates = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const { scheduleId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const { status, search } = req.query;

  const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId });
  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  const query = { scheduleId: schedule._id };
  if (status) query.status = status;

  if (search && search.trim()) {
    const matchingUsers = await User.find({
      organizationId,
      role: 'CANDIDATE',
      $or: [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { 'profile.studentId': { $regex: search.trim(), $options: 'i' } },
      ],
    }).select('_id');

    query.candidateId = { $in: matchingUsers.map((u) => u._id) };
  }

  const [candidates, total] = await Promise.all([
    ScheduleCandidate.find(query)
      .populate('candidateId', 'name email profile status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ScheduleCandidate.countDocuments(query),
  ]);

  return ApiResponse.success(res, {
    candidates,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Assign additional candidates to a schedule.
 */
export const assignCandidatesToSchedule = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const { scheduleId } = req.params;
  const { candidateIds, batch, assignAll } = req.body;

  const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId });
  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  if (schedule.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot assign candidates to a cancelled schedule');
  }

  let targetCandidateIds = [];

  if (assignAll) {
    const all = await User.find({ organizationId, role: 'CANDIDATE', status: 'ACTIVE' }).select(
      '_id'
    );
    targetCandidateIds = all.map((u) => u._id);
  } else if (batch) {
    const batchUsers = await User.find({
      organizationId,
      role: 'CANDIDATE',
      status: 'ACTIVE',
      'profile.department': { $regex: new RegExp(`^${batch.trim()}$`, 'i') },
    }).select('_id');
    targetCandidateIds = batchUsers.map((u) => u._id);
  } else if (Array.isArray(candidateIds) && candidateIds.length > 0) {
    const validUsers = await User.find({
      _id: { $in: candidateIds },
      organizationId,
      role: 'CANDIDATE',
    }).select('_id');
    targetCandidateIds = validUsers.map((u) => u._id);
  } else {
    throw ApiError.badRequest('Please specify candidateIds, a batch name, or assignAll: true');
  }

  if (targetCandidateIds.length === 0) {
    return ApiResponse.success(res, {
      message: 'No eligible candidates found matching criteria',
      assignedCount: 0,
    });
  }

  // Bulk upsert assignments to prevent duplicates
  const operations = targetCandidateIds.map((cId) => ({
    updateOne: {
      filter: { scheduleId: schedule._id, candidateId: cId },
      update: {
        $setOnInsert: {
          organizationId,
          scheduleId: schedule._id,
          candidateId: cId,
          status: 'ASSIGNED',
          assignedBy: req.user._id,
          assignedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const bulkResult = await ScheduleCandidate.bulkWrite(operations, { ordered: false });
  const newlyAssigned = bulkResult.upsertedCount || 0;

  await logAuditEvent(req, {
    action: 'CANDIDATE_ASSIGNED',
    targetType: 'SCHEDULE',
    targetId: schedule._id,
    targetName: schedule.title,
    description: `Assigned ${newlyAssigned} new candidates to schedule '${schedule.title}'`,
    metadata: {
      newlyAssigned,
      totalMatched: targetCandidateIds.length,
    },
  });

  return ApiResponse.success(res, {
    message: `Successfully processed ${targetCandidateIds.length} candidates (${newlyAssigned} new assignments)`,
    newlyAssigned,
  });
});

/**
 * Remove an assigned candidate from a schedule (only if they have not begun an attempt).
 */
export const removeCandidateFromSchedule = asyncHandler(async (req, res) => {
  const organizationId = req.user.organizationId;
  const { scheduleId, candidateId } = req.params;

  const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId });
  if (!schedule) {
    throw ApiError.notFound('Examination schedule not found');
  }

  const assignment = await ScheduleCandidate.findOne({ scheduleId: schedule._id, candidateId });
  if (!assignment) {
    throw ApiError.notFound('Candidate is not assigned to this schedule');
  }

  if (assignment.attemptsCount > 0 || assignment.status === 'IN_PROGRESS') {
    throw ApiError.badRequest('Cannot remove a candidate who has already attempted this examination');
  }

  await ScheduleCandidate.deleteOne({ _id: assignment._id });

  await logAuditEvent(req, {
    action: 'CANDIDATE_REMOVED',
    targetType: 'SCHEDULE',
    targetId: schedule._id,
    targetName: schedule.title,
    description: `Removed candidate ${candidateId} from schedule '${schedule.title}'`,
  });

  return ApiResponse.success(res, {
    message: 'Candidate removed from schedule successfully',
  });
});

// =============================================================================
// CANDIDATE CONTROLLERS
// =============================================================================

/**
 * Get all assessments assigned to the logged-in candidate, categorized by status:
 * available, upcoming, past.
 */
export const getCandidateExams = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const organizationId = req.user.organizationId;

  // 1. Find all active or non-cancelled schedules for this organization
  const schedules = await ExamSchedule.find({
    organizationId,
    status: { $ne: 'CANCELLED' },
  })
    .populate('examId', 'title subject description')
    .populate('examSnapshotId', 'title subject totalMarks passingMarks durationMinutes')
    .sort({ startTime: 1 })
    .lean();

  if (schedules.length === 0) {
    return ApiResponse.success(res, {
      available: [],
      upcoming: [],
      past: [],
    });
  }

  // 2. Fetch candidate's specific assignments
  const assignments = await ScheduleCandidate.find({
    candidateId,
    scheduleId: { $in: schedules.map((s) => s._id) },
  }).lean();

  const assignmentMap = new Map();
  assignments.forEach((a) => assignmentMap.set(a.scheduleId.toString(), a));

  const now = new Date();
  const available = [];
  const upcoming = [];
  const past = [];

  for (const s of schedules) {
    const assignment = assignmentMap.get(s._id.toString());
    const isAssigned =
      s.eligibilityType === 'ALL_CANDIDATES' ||
      (s.eligibilityType === 'BATCH' &&
        req.user.profile?.department?.toLowerCase() === s.targetBatch?.toLowerCase()) ||
      Boolean(assignment) ||
      (s.assignedCandidateIds || []).some((id) => id.toString() === candidateId.toString());

    if (!isAssigned) continue;

    const snapshot = s.examSnapshotId || {};
    const startTime = new Date(s.startTime);
    const endTime = new Date(s.endTime);
    const attemptsCount = assignment ? assignment.attemptsCount : 0;
    const maxAttempts = s.maxAttempts || 1;
    const isExpired = now > endTime;
    const isStarted = now >= startTime;
    const hasAttemptsLeft = attemptsCount < maxAttempts;

    const item = {
      _id: s._id,
      title: s.title,
      description: s.description,
      examTitle: snapshot.title || s.examId?.title,
      subject: snapshot.subject || s.examId?.subject,
      totalMarks: snapshot.totalMarks || 0,
      durationMinutes: s.durationMinutes,
      startTime: s.startTime,
      endTime: s.endTime,
      attemptsCount,
      maxAttempts,
      status: assignment?.status || 'ASSIGNED',
      acknowledgedAt: assignment?.acknowledgedAt || null,
      isEligibleToStart: isStarted && !isExpired && hasAttemptsLeft,
    };

    if (isStarted && !isExpired && hasAttemptsLeft) {
      available.push(item);
    } else if (!isStarted && !isExpired) {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  }

  return ApiResponse.success(res, {
    available,
    upcoming,
    past,
  });
});

/**
 * Pre-exam verification check for a candidate accessing an exam.
 * Returns instructions, metadata, and eligibility checks.
 */
export const getCandidatePrecheck = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { scheduleId } = req.params;

  const result = await checkCandidateEligibility(candidateId, scheduleId);

  return ApiResponse.success(res, result);
});

/**
 * Candidate acknowledges exam rules and instructions.
 */
export const acknowledgeExam = asyncHandler(async (req, res) => {
  const candidateId = req.user._id;
  const { scheduleId } = req.params;

  const eligibility = await checkCandidateEligibility(candidateId, scheduleId);

  if (!eligibility.isEligible && eligibility.reason !== 'EXAM_NOT_STARTED') {
    throw ApiError.forbidden(
      eligibility.details || 'You are not eligible to acknowledge this examination'
    );
  }

  let assignment = await ScheduleCandidate.findOne({
    scheduleId,
    candidateId,
  });

  if (!assignment) {
    assignment = await ScheduleCandidate.create({
      organizationId: req.user.organizationId,
      scheduleId,
      candidateId,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    });
  } else {
    assignment.acknowledgedAt = new Date();
    if (assignment.status === 'ASSIGNED') {
      assignment.status = 'ACKNOWLEDGED';
    }
    await assignment.save();
  }

  await logAuditEvent(req, {
    action: 'EXAM_ACKNOWLEDGED',
    targetType: 'SCHEDULE',
    targetId: scheduleId,
    targetName: eligibility.schedule.title,
    description: `Candidate ${req.user.name} acknowledged exam instructions`,
    metadata: {
      candidateId,
      scheduleId,
      acknowledgedAt: assignment.acknowledgedAt,
    },
  });

  return ApiResponse.success(res, {
    message: 'Examination rules and instructions acknowledged successfully',
    acknowledgedAt: assignment.acknowledgedAt,
    assignment,
  });
});
