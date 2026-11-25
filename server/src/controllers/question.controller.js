import {
  Question,
  QUESTION_TYPES,
  DIFFICULTY_LEVELS,
  QUESTION_STATUS,
} from '../models/Question.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
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
 * @desc    Get Paginated Questions from Question Bank
 * @route   GET /api/questions
 * @access  Private (Org Admin, Super Admin)
 */
export const getQuestions = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const { search, subject, topic, difficulty, questionType, status } = req.query;

  const query = { organizationId };

  if (subject && subject.trim()) {
    query.subject = subject.trim();
  }

  if (topic && topic.trim()) {
    query.topic = topic.trim();
  }

  if (difficulty && Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    query.difficulty = difficulty;
  }

  if (questionType && Object.values(QUESTION_TYPES).includes(questionType)) {
    query.questionType = questionType;
  }

  if (status && Object.values(QUESTION_STATUS).includes(status)) {
    query.status = status;
  } else {
    // Default to active questions unless explicitly specified
    query.status = QUESTION_STATUS.ACTIVE;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { statement: searchRegex },
      { subject: searchRegex },
      { topic: searchRegex },
      { tags: searchRegex },
    ];
  }

  const [total, questions] = await Promise.all([
    Question.countDocuments(query),
    Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Sanitize evaluationGuidance for list requests
  const sanitizedQuestions = questions.map((q) => {
    const copy = { ...q };
    delete copy.evaluationGuidance;
    return copy;
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Questions retrieved successfully.',
    data: {
      questions: sanitizedQuestions,
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
 * @desc    Create a new question in the Question Bank
 * @route   POST /api/questions
 * @access  Private (Org Admin, Super Admin)
 */
export const createQuestion = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const {
    questionType,
    statement,
    options,
    subject,
    topic,
    subtopic,
    difficulty,
    marks,
    negativeMarks,
    explanation,
    evaluationGuidance,
    tags,
  } = req.body;

  if (!questionType || !statement || !subject || !topic || marks === undefined) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Question type, statement, subject, topic, and marks are required.',
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  // Build clean options array
  let cleanOptions = [];
  if (Array.isArray(options)) {
    cleanOptions = options.map((opt) => ({
      text: opt.text ? String(opt.text).trim() : '',
      isCorrect: Boolean(opt.isCorrect),
    }));
  }

  const question = new Question({
    organizationId,
    questionType,
    statement: statement.trim(),
    options: cleanOptions,
    subject: subject.trim(),
    topic: topic.trim(),
    subtopic: subtopic ? subtopic.trim() : '',
    difficulty: difficulty || DIFFICULTY_LEVELS.MEDIUM,
    marks: Number(marks),
    negativeMarks: Number(negativeMarks) || 0,
    explanation: explanation ? explanation.trim() : '',
    evaluationGuidance: evaluationGuidance ? evaluationGuidance.trim() : '',
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()) : [],
    status: QUESTION_STATUS.ACTIVE,
    createdBy: req.user.userId || req.user._id,
  });

  await question.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'QUESTION_CREATED',
    targetType: 'QUESTION',
    targetId: question._id,
    targetName: question.statement.substring(0, 50),
    description: `Question (${question.questionType}) created in subject '${question.subject}'`,
    metadata: {
      questionType: question.questionType,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      marks: question.marks,
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Question created successfully.',
    data: question.toSafeObject({ includeAnswers: true }),
  });
});

/**
 * @desc    Get question details by ID
 * @route   GET /api/questions/:questionId
 * @access  Private (Org Admin, Super Admin)
 */
export const getQuestionById = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { questionId } = req.params;

  const question = await Question.findOne({ _id: questionId, organizationId });
  if (!question) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Question not found in your organization.',
      error: { code: 'QUESTION_NOT_FOUND' },
    });
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Question details retrieved.',
    data: question.toSafeObject({ includeAnswers: true }),
  });
});

/**
 * @desc    Update a question in the Question Bank
 * @route   PATCH /api/questions/:questionId
 * @access  Private (Org Admin, Super Admin)
 */
export const updateQuestion = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { questionId } = req.params;

  const question = await Question.findOne({ _id: questionId, organizationId });
  if (!question) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Question not found in your organization.',
      error: { code: 'QUESTION_NOT_FOUND' },
    });
  }

  const {
    statement,
    options,
    subject,
    topic,
    subtopic,
    difficulty,
    marks,
    negativeMarks,
    explanation,
    evaluationGuidance,
    tags,
    status,
  } = req.body;

  if (statement !== undefined) question.statement = String(statement).trim();
  if (subject !== undefined) question.subject = String(subject).trim();
  if (topic !== undefined) question.topic = String(topic).trim();
  if (subtopic !== undefined) question.subtopic = String(subtopic).trim();
  if (difficulty !== undefined && Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    question.difficulty = difficulty;
  }
  if (marks !== undefined) question.marks = Number(marks);
  if (negativeMarks !== undefined) question.negativeMarks = Number(negativeMarks);
  if (explanation !== undefined) question.explanation = String(explanation).trim();
  if (evaluationGuidance !== undefined) {
    question.evaluationGuidance = String(evaluationGuidance).trim();
  }
  if (status !== undefined && Object.values(QUESTION_STATUS).includes(status)) {
    question.status = status;
  }
  if (Array.isArray(tags)) {
    question.tags = tags.map((t) => String(t).trim().toLowerCase());
  }

  if (Array.isArray(options)) {
    question.options = options.map((opt) => ({
      optionId: opt.optionId,
      text: String(opt.text).trim(),
      isCorrect: Boolean(opt.isCorrect),
    }));
  }

  question.updatedBy = req.user.userId || req.user._id;

  await question.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'QUESTION_UPDATED',
    targetType: 'QUESTION',
    targetId: question._id,
    targetName: question.statement.substring(0, 50),
    description: `Question updated by ${req.user.name}`,
    metadata: {
      questionType: question.questionType,
      updatedFields: Object.keys(req.body),
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Question updated successfully.',
    data: question.toSafeObject({ includeAnswers: true }),
  });
});

/**
 * @desc    Duplicate an existing question as a new Question Bank item
 * @route   POST /api/questions/:questionId/duplicate
 * @access  Private (Org Admin, Super Admin)
 */
export const duplicateQuestion = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { questionId } = req.params;

  const original = await Question.findOne({ _id: questionId, organizationId });
  if (!original) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Original question not found in your organization.',
      error: { code: 'QUESTION_NOT_FOUND' },
    });
  }

  const duplicated = new Question({
    organizationId,
    questionType: original.questionType,
    statement: `${original.statement} (Copy)`,
    options: original.options.map((opt) => ({
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
    subject: original.subject,
    topic: original.topic,
    subtopic: original.subtopic,
    difficulty: original.difficulty,
    marks: original.marks,
    negativeMarks: original.negativeMarks,
    explanation: original.explanation,
    evaluationGuidance: original.evaluationGuidance,
    tags: original.tags,
    status: QUESTION_STATUS.ACTIVE,
    createdBy: req.user.userId || req.user._id,
  });

  await duplicated.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'QUESTION_DUPLICATED',
    targetType: 'QUESTION',
    targetId: duplicated._id,
    targetName: duplicated.statement.substring(0, 50),
    description: `Question duplicated from original (${original._id})`,
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Question duplicated successfully.',
    data: duplicated.toSafeObject({ includeAnswers: true }),
  });
});

/**
 * @desc    Archive a question (soft deletion)
 * @route   PATCH /api/questions/:questionId/archive
 * @access  Private (Org Admin, Super Admin)
 */
export const archiveQuestion = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { questionId } = req.params;

  const question = await Question.findOne({ _id: questionId, organizationId });
  if (!question) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Question not found in your organization.',
      error: { code: 'QUESTION_NOT_FOUND' },
    });
  }

  const previousStatus = question.status;
  question.status = QUESTION_STATUS.ARCHIVED;
  question.updatedBy = req.user.userId || req.user._id;

  await question.save();

  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'QUESTION_ARCHIVED',
    targetType: 'QUESTION',
    targetId: question._id,
    targetName: question.statement.substring(0, 50),
    description: `Question status changed from ${previousStatus} to ARCHIVED`,
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Question archived successfully.',
    data: question.toSafeObject({ includeAnswers: true }),
  });
});

/**
 * @desc    Get distinct subjects in Organization Question Bank
 * @route   GET /api/questions/meta/subjects
 * @access  Private (Org Admin, Super Admin)
 */
export const getDistinctSubjects = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const subjects = await Question.distinct('subject', { organizationId });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subjects retrieved.',
    data: { subjects: subjects.filter(Boolean).sort() },
  });
});

/**
 * @desc    Get distinct topics in Organization Question Bank
 * @route   GET /api/questions/meta/topics
 * @access  Private (Org Admin, Super Admin)
 */
export const getDistinctTopics = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { subject } = req.query;

  const filter = { organizationId };
  if (subject && subject.trim()) {
    filter.subject = subject.trim();
  }

  const topics = await Question.distinct('topic', filter);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Topics retrieved.',
    data: { topics: topics.filter(Boolean).sort() },
  });
});
