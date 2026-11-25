import { Exam, EXAM_STATUS } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { ExamSnapshot } from '../models/ExamSnapshot.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateExam } from '../services/examValidation.service.js';
import { logAuditEvent } from '../services/audit.service.js';

const resolveAuthOrgId = (req) => {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    return (
      req.headers['x-organization-id'] ||
      req.query.organizationId ||
      req.params.organizationId ||
      req.user.organizationId
    );
  }
  return req.user.organizationId;
};

/**
 * @desc    Get Paginated Examinations for Organization
 * @route   GET /api/exams
 * @access  Private (Org Admin, Super Admin)
 */
export const getExams = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const {
    search,
    status,
    subject,
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = { organizationId };

  if (status && Object.values(EXAM_STATUS).includes(status)) {
    query.status = status;
  }

  if (subject && subject.trim()) {
    query.subject = subject.trim();
  }

  if (category && category.trim()) {
    query.category = category.trim();
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { title: searchRegex },
      { subject: searchRegex },
      { category: searchRegex },
      { description: searchRegex },
    ];
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [total, exams] = await Promise.all([
    Exam.countDocuments(query),
    Exam.find(query)
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Add computed summary counts for list view
  const formattedExams = exams.map((exam) => {
    let totalQuestions = 0;
    if (exam.sections) {
      exam.sections.forEach((sec) => {
        totalQuestions += sec.questions ? sec.questions.length : 0;
      });
    }

    return {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      category: exam.category,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      status: exam.status,
      currentPublishedVersion: exam.currentPublishedVersion || 0,
      totalQuestions,
      sectionCount: exam.sections ? exam.sections.length : 0,
      createdBy: exam.createdBy,
      updatedBy: exam.updatedBy,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Examinations retrieved successfully.',
    data: {
      exams: formattedExams,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    },
  });
});

/**
 * @desc    Create a new Examination (Draft)
 * @route   POST /api/exams
 * @access  Private (Org Admin, Super Admin)
 */
export const createExam = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const {
    title,
    description,
    subject,
    category,
    instructions,
    durationMinutes,
    passingMarks,
    settings,
    sections,
  } = req.body;

  if (!title || !subject || !durationMinutes) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Exam title, subject, and duration are required.',
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  // Initialize with a default section if none provided
  const initialSections =
    Array.isArray(sections) && sections.length > 0
      ? sections
      : [
          {
            title: 'Section 1 - General',
            description: '',
            instructions: '',
            order: 1,
            questions: [],
            sectionMarks: 0,
          },
        ];

  const exam = new Exam({
    organizationId,
    title: title.trim(),
    description: description ? description.trim() : '',
    subject: subject.trim(),
    category: category ? category.trim() : 'General',
    instructions: instructions ? instructions.trim() : '',
    durationMinutes: Number(durationMinutes),
    passingMarks: Number(passingMarks) || 0,
    settings: settings || {},
    sections: initialSections,
    status: EXAM_STATUS.DRAFT,
    createdBy: req.user.userId || req.user._id,
  });

  // Calculate marks if questions were provided
  const validation = await validateExam({
    exam,
    organizationId,
    isPublishing: false,
  });

  if (validation.summary) {
    exam.totalMarks = validation.summary.totalMarks;
  }

  await exam.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'EXAM_CREATED',
    targetType: 'EXAM',
    targetId: exam._id,
    targetName: exam.title,
    description: `Draft exam '${exam.title}' created in subject '${exam.subject}'`,
    metadata: {
      subject: exam.subject,
      durationMinutes: exam.durationMinutes,
      sectionCount: exam.sections.length,
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Draft examination created successfully.',
    data: exam,
  });
});

/**
 * @desc    Get detailed examination by ID (including populated questions & snapshot info)
 * @route   GET /api/exams/:examId
 * @access  Private (Org Admin, Super Admin)
 */
export const getExamById = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const exam = await Exam.findOne({ _id: examId, organizationId })
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role')
    .populate({
      path: 'sections.questions.questionId',
      model: 'Question',
      select:
        'questionType statement options subject topic difficulty marks negativeMarks explanation status',
    })
    .populate('publishedSnapshotId', 'version publishedAt totalQuestions totalMarks');

  if (!exam) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Examination details retrieved.',
    data: exam,
  });
});

/**
 * @desc    Update an Examination (Draft Only)
 * @route   PATCH /api/exams/:examId
 * @access  Private (Org Admin, Super Admin)
 */
export const updateExam = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const exam = await Exam.findOne({ _id: examId, organizationId });
  if (!exam) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  // Critical immutability rule: Published exams must NOT be silently modified
  if (exam.status === EXAM_STATUS.PUBLISHED) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message:
        'Published examinations cannot be directly modified. Please duplicate the exam to create a new draft revision.',
      error: { code: 'PUBLISHED_EXAM_IMMUTABLE' },
    });
  }

  if (exam.status === EXAM_STATUS.ARCHIVED) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Archived examinations cannot be modified.',
      error: { code: 'ARCHIVED_EXAM_IMMUTABLE' },
    });
  }

  const {
    title,
    description,
    subject,
    category,
    instructions,
    durationMinutes,
    passingMarks,
    settings,
    sections,
  } = req.body;

  if (title !== undefined) exam.title = String(title).trim();
  if (description !== undefined) exam.description = String(description).trim();
  if (subject !== undefined) exam.subject = String(subject).trim();
  if (category !== undefined) exam.category = String(category).trim();
  if (instructions !== undefined) exam.instructions = String(instructions).trim();
  if (durationMinutes !== undefined) exam.durationMinutes = Number(durationMinutes);
  if (passingMarks !== undefined) exam.passingMarks = Number(passingMarks);
  if (settings && typeof settings === 'object') {
    exam.settings = { ...exam.settings.toObject(), ...settings };
  }

  if (Array.isArray(sections)) {
    exam.sections = sections;
  }

  exam.updatedBy = req.user.userId || req.user._id;

  // Run validation engine to compute section & total marks accurately
  const validation = await validateExam({
    exam,
    organizationId,
    isPublishing: false,
  });

  if (validation.summary) {
    exam.totalMarks = validation.summary.totalMarks;
  }

  await exam.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'EXAM_UPDATED',
    targetType: 'EXAM',
    targetId: exam._id,
    targetName: exam.title,
    description: `Draft exam '${exam.title}' updated`,
    metadata: {
      updatedFields: Object.keys(req.body),
      totalMarks: exam.totalMarks,
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Examination updated successfully.',
    data: {
      exam,
      validation,
    },
  });
});

/**
 * @desc    Duplicate an existing exam into a new Draft revision
 * @route   POST /api/exams/:examId/duplicate
 * @access  Private (Org Admin, Super Admin)
 */
export const duplicateExam = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const original = await Exam.findOne({ _id: examId, organizationId }).lean();
  if (!original) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Original examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  const duplicated = new Exam({
    organizationId,
    title: `${original.title} (Copy)`,
    description: original.description,
    subject: original.subject,
    category: original.category,
    instructions: original.instructions,
    durationMinutes: original.durationMinutes,
    totalMarks: original.totalMarks,
    passingMarks: original.passingMarks,
    settings: original.settings,
    sections: original.sections.map((sec) => ({
      title: sec.title,
      description: sec.description,
      instructions: sec.instructions,
      order: sec.order,
      sectionMarks: sec.sectionMarks,
      questions: sec.questions.map((q) => ({
        questionId: q.questionId,
        order: q.order,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
      })),
    })),
    status: EXAM_STATUS.DRAFT,
    currentPublishedVersion: 0,
    publishedSnapshotId: null,
    createdBy: req.user.userId || req.user._id,
  });

  await duplicated.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'EXAM_DUPLICATED',
    targetType: 'EXAM',
    targetId: duplicated._id,
    targetName: duplicated.title,
    description: `Exam duplicated from original '${original.title}' (${original._id})`,
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Examination duplicated into a new draft successfully.',
    data: duplicated,
  });
});

/**
 * @desc    Delete a draft examination (Drafts only)
 * @route   DELETE /api/exams/:examId
 * @access  Private (Org Admin, Super Admin)
 */
export const deleteExam = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const exam = await Exam.findOne({ _id: examId, organizationId });
  if (!exam) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  // Prevent deleting published or archived exams to protect exam history
  if (exam.status !== EXAM_STATUS.DRAFT) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: `Cannot delete an exam with status '${exam.status}'. Only DRAFT exams may be deleted. You can archive this exam instead.`,
      error: { code: 'CANNOT_DELETE_NON_DRAFT' },
    });
  }

  await Exam.findByIdAndDelete(examId);

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'EXAM_DELETED',
    targetType: 'EXAM',
    targetId: exam._id,
    targetName: exam.title,
    description: `Draft examination '${exam.title}' deleted`,
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Draft examination deleted successfully.',
    data: { deletedExamId: examId },
  });
});

/**
 * @desc    Validate an exam and return a complete pre-flight report
 * @route   POST /api/exams/:examId/validate
 * @access  Private (Org Admin, Super Admin)
 */
export const validateExamEndpoint = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const exam = await Exam.findOne({ _id: examId, organizationId });
  if (!exam) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  const validation = await validateExam({
    exam,
    organizationId,
    isPublishing: false,
  });

  // Keep marks updated on draft if summary available
  if (validation.summary && exam.status === EXAM_STATUS.DRAFT) {
    exam.totalMarks = validation.summary.totalMarks;
    await exam.save();
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: validation.isValid
      ? 'Examination passed validation.'
      : 'Examination has validation errors.',
    data: validation,
  });
});

/**
 * @desc    Publish an examination (creates immutable published snapshot)
 * @route   POST /api/exams/:examId/publish
 * @access  Private (Org Admin, Super Admin)
 */
export const publishExam = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const exam = await Exam.findOne({ _id: examId, organizationId });
  if (!exam) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  if (exam.status === EXAM_STATUS.PUBLISHED) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'This examination is already published.',
      error: { code: 'EXAM_ALREADY_PUBLISHED' },
    });
  }

  // 1. Full Pre-Publication Validation
  const validation = await validateExam({
    exam,
    organizationId,
    isPublishing: true,
  });

  if (!validation.isValid) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Cannot publish examination due to validation errors.',
      error: {
        code: 'VALIDATION_FAILED',
        details: validation.errors,
      },
    });
  }

  // 2. Fetch all questions to freeze into the immutable snapshot
  const allQuestionIds = [];
  exam.sections.forEach((sec) => {
    sec.questions.forEach((q) => {
      allQuestionIds.push(q.questionId);
    });
  });

  const sourceQuestions = await Question.find({
    _id: { $in: allQuestionIds },
    organizationId,
  }).lean();

  const questionsMap = new Map(sourceQuestions.map((q) => [q._id.toString(), q]));

  // 3. Freeze sections and questions
  const frozenSections = exam.sections.map((sec) => {
    const frozenQuestions = sec.questions.map((qRef) => {
      const qSource = questionsMap.get(qRef.questionId.toString());
      return {
        questionId: qRef.questionId,
        questionType: qSource.questionType,
        statement: qSource.statement,
        options: qSource.options.map((opt) => ({
          optionId: opt.optionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
        subject: qSource.subject,
        topic: qSource.topic,
        subtopic: qSource.subtopic || '',
        difficulty: qSource.difficulty,
        marks: qRef.marks !== undefined ? Number(qRef.marks) : qSource.marks,
        negativeMarks:
          qRef.negativeMarks !== undefined
            ? Number(qRef.negativeMarks)
            : qSource.negativeMarks || 0,
        explanation: qSource.explanation || '',
        evaluationGuidance: qSource.evaluationGuidance || '',
        order: qRef.order || 0,
      };
    });

    return {
      sectionId: sec.sectionId,
      title: sec.title,
      description: sec.description || '',
      instructions: sec.instructions || '',
      order: sec.order || 0,
      sectionMarks: sec.sectionMarks,
      questions: frozenQuestions,
    };
  });

  const nextVersion = (exam.currentPublishedVersion || 0) + 1;

  // 4. Create immutable Snapshot
  const snapshot = new ExamSnapshot({
    organizationId,
    examId: exam._id,
    version: nextVersion,
    examMetadata: {
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      category: exam.category,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      totalMarks: validation.summary.totalMarks,
      passingMarks: validation.summary.passingMarks,
      settings: exam.settings.toObject ? exam.settings.toObject() : exam.settings,
    },
    sections: frozenSections,
    totalQuestions: validation.summary.totalQuestions,
    totalMarks: validation.summary.totalMarks,
    publishedBy: req.user.userId || req.user._id,
  });

  await snapshot.save();

  // 5. Update Exam status & references
  exam.status = EXAM_STATUS.PUBLISHED;
  exam.currentPublishedVersion = nextVersion;
  exam.publishedSnapshotId = snapshot._id;
  exam.totalMarks = validation.summary.totalMarks;
  exam.updatedBy = req.user.userId || req.user._id;

  await exam.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'EXAM_PUBLISHED',
    targetType: 'EXAM',
    targetId: exam._id,
    targetName: exam.title,
    description: `Examination '${exam.title}' published as Version ${nextVersion}`,
    metadata: {
      version: nextVersion,
      snapshotId: snapshot._id,
      totalQuestions: snapshot.totalQuestions,
      totalMarks: snapshot.totalMarks,
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: `Examination published successfully as Version ${nextVersion}.`,
    data: {
      exam,
      snapshotId: snapshot._id,
      version: nextVersion,
    },
  });
});

/**
 * @desc    Archive an examination
 * @route   POST /api/exams/:examId/archive
 * @access  Private (Org Admin, Super Admin)
 */
export const archiveExam = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { examId } = req.params;

  const exam = await Exam.findOne({ _id: examId, organizationId });
  if (!exam) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Examination not found in your organization.',
      error: { code: 'EXAM_NOT_FOUND' },
    });
  }

  const previousStatus = exam.status;
  exam.status = EXAM_STATUS.ARCHIVED;
  exam.updatedBy = req.user.userId || req.user._id;

  await exam.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'EXAM_ARCHIVED',
    targetType: 'EXAM',
    targetId: exam._id,
    targetName: exam.title,
    description: `Examination status changed from ${previousStatus} to ARCHIVED`,
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Examination archived successfully.',
    data: exam,
  });
});
