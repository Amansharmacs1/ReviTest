import crypto from 'crypto';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { Exam, EXAM_STATUS } from '../models/Exam.js';
import { Question, QUESTION_STATUS } from '../models/Question.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Helper to resolve the authoritative organization ID for the request.
 * For ORG_ADMIN, it strictly comes from req.user.organizationId.
 * For SUPER_ADMIN, it can come from headers/query/params or fallback to user.
 */
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
 * @desc    Get real-time Organization Dashboard Statistics
 * @route   GET /api/organization/dashboard
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationDashboardStats = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  if (!organizationId) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'No organization workspace associated with this session.',
      error: { code: 'TENANT_NOT_ASSOCIATED' },
    });
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization workspace not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  // Aggregate user statistics in parallel using real database queries
  const results = await Promise.all([
    User.countDocuments({ organizationId, role: ROLES.CANDIDATE }),
    User.countDocuments({ organizationId, role: ROLES.CANDIDATE, status: 'ACTIVE' }),
    User.countDocuments({
      organizationId,
      role: ROLES.CANDIDATE,
      status: { $in: ['INACTIVE', 'SUSPENDED'] },
    }),
    User.countDocuments({ organizationId, role: ROLES.PROCTOR }),
    User.countDocuments({ organizationId, role: ROLES.PROCTOR, status: 'ACTIVE' }),
    User.countDocuments({ organizationId, role: ROLES.ORG_ADMIN }),
    User.countDocuments({ organizationId }),
    Exam.countDocuments({ organizationId }),
    Exam.countDocuments({ organizationId, status: EXAM_STATUS.PUBLISHED }),
    Question.countDocuments({ organizationId, status: QUESTION_STATUS.ACTIVE }),
    ExamSchedule.countDocuments({ organizationId }),
    ExamSchedule.countDocuments({ organizationId, status: { $in: ['SCHEDULED', 'ACTIVE'] } }),
    AuditLog.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('-__v')
      .lean(),
  ]);

  const [
    totalCandidates,
    activeCandidates,
    inactiveCandidates,
    totalProctors,
    activeProctors,
    totalAdmins,
    totalMembers,
    totalExams,
    publishedExams,
    totalActiveQuestions,
    totalSchedules,
    activeSchedules,
    recentActivity,
  ] = results;

  const dashboardData = {
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      code: organization.code,
      type: organization.type,
      status: organization.status,
      plan: organization.plan,
      createdAt: organization.createdAt,
    },
    statistics: {
      totalCandidates,
      activeCandidates,
      inactiveCandidates,
      totalProctors,
      activeProctors,
      totalAdmins,
      totalMembers,
      exams: {
        total: totalExams,
        published: publishedExams,
        drafts: totalExams - publishedExams,
      },
      questions: {
        total: totalActiveQuestions,
      },
      schedules: {
        total: totalSchedules,
        active: activeSchedules,
      },
      accountStatus: organization.status,
      registrationDate: organization.createdAt,
    },
    counts: {
      candidates: {
        total: totalCandidates,
        active: activeCandidates,
        inactive: inactiveCandidates,
      },
      proctors: {
        total: totalProctors,
        active: activeProctors,
      },
      totalAdmins,
      totalMembers,
      exams: {
        total: totalExams,
        published: publishedExams,
        drafts: totalExams - publishedExams,
      },
      questions: {
        total: totalActiveQuestions,
      },
      schedules: {
        total: totalSchedules,
        active: activeSchedules,
      },
    },
    recentActivity,
  };

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization dashboard statistics retrieved.',
    data: dashboardData,
  });
});

/**
 * @desc    Get Organization Profile
 * @route   GET /api/organization/profile
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationProfile = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  const safeOrg = organization.toSafeObject();
  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization profile retrieved.',
    data: {
      ...safeOrg,
      organization: safeOrg,
    },
  });
});

/**
 * @desc    Update Permitted Organization Profile Fields
 * @route   PATCH /api/organization/profile
 * @access  Private (Org Admin, Super Admin)
 */
export const updateOrganizationProfile = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  // Whitelisted fields that ORG_ADMIN is allowed to update
  const { name, type, contactEmail, phone, website, address, settings } = req.body;

  if (name && typeof name === 'string') organization.name = name.trim();
  if (type) organization.type = type;
  if (contactEmail) organization.contactEmail = contactEmail.trim().toLowerCase();
  if (phone !== undefined) organization.phone = String(phone).trim();
  if (website !== undefined) organization.website = String(website).trim();

  if (address && typeof address === 'object') {
    organization.address = {
      street: address.street || organization.address?.street || '',
      city: address.city || organization.address?.city || '',
      state: address.state || organization.address?.state || '',
      country: address.country || organization.address?.country || '',
      zipCode: address.zipCode || organization.address?.zipCode || '',
    };
  }

  if (settings && typeof settings === 'object') {
    if (settings.allowSelfRegistration !== undefined) {
      organization.settings.allowSelfRegistration = Boolean(
        settings.allowSelfRegistration
      );
    }
    const reqProctor =
      settings.requireProctoringByDefault ?? settings.requireProctoringDefault;
    if (reqProctor !== undefined) {
      organization.settings.requireProctoringByDefault = Boolean(reqProctor);
    }
    const durMinutes =
      settings.defaultExamDurationMinutes ?? settings.defaultDurationMinutes;
    if (durMinutes !== undefined) {
      organization.settings.defaultExamDurationMinutes = Number(durMinutes);
    }
    if (settings.primaryColor) {
      organization.settings.primaryColor = settings.primaryColor;
    }
    if (settings.logoUrl !== undefined) {
      organization.settings.logoUrl = settings.logoUrl;
    }
  }

  await organization.save();

  // Record audit log
  await logAuditEvent({
    actor: req.user,
    organizationId: organization._id,
    action: 'ORG_PROFILE_UPDATED',
    targetType: 'ORGANIZATION',
    targetId: organization._id,
    targetName: organization.name,
    description: `Organization profile updated by ${req.user.name}`,
    metadata: { updatedFields: Object.keys(req.body) },
    req,
  });

  const safeOrg = organization.toSafeObject();
  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization profile updated successfully.',
    data: {
      ...safeOrg,
      organization: safeOrg,
    },
  });
});

/**
 * @desc    Get Organization Users (Server-side Search, Filter & Pagination)
 * @route   GET /api/organization/users
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationUsers = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const { search, role, status } = req.query;

  // Build query scoped strictly to the organization
  const query = { organizationId };

  // Role filter
  if (role && Object.values(ROLES).includes(role)) {
    query.role = role;
  }

  // Status filter
  if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    query.status = status;
  }

  // Search by name or email
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select('-password -tokenVersion')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization users retrieved.',
    data: {
      users,
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
 * @desc    Get Single User by ID
 * @route   GET /api/organization/users/:userId
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationUserById = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { userId } = req.params;

  const user = await User.findOne({
    _id: userId,
    organizationId,
  }).select('-password -tokenVersion');

  if (!user) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'User not found in this organization.',
      error: { code: 'USER_NOT_FOUND' },
    });
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'User details retrieved.',
    data: user,
  });
});

/**
 * @desc    Update User Status (Activate, Deactivate, Suspend)
 * @route   PATCH /api/organization/users/:userId/status
 * @access  Private (Org Admin, Super Admin)
 */
export const updateOrganizationUserStatus = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { userId } = req.params;
  const { status, reason } = req.body;

  if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: "Valid status ('ACTIVE', 'INACTIVE', 'SUSPENDED') is required.",
      error: { code: 'INVALID_STATUS' },
    });
  }

  // Prevent self-deactivation which could lock the workspace
  if (userId.toString() === req.user.userId.toString()) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Administrators cannot change their own account status.',
      error: { code: 'SELF_STATUS_CHANGE_PROHIBITED' },
    });
  }

  // Strictly verify target user belongs to this organization
  const user = await User.findOne({ _id: userId, organizationId });
  if (!user) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'User not found in this organization.',
      error: { code: 'USER_NOT_FOUND' },
    });
  }

  // Prevent modifying Super Admin users
  if (user.role === ROLES.SUPER_ADMIN) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: 'Cannot modify platform super administrator accounts.',
      error: { code: 'SUPER_ADMIN_MODIFICATION_PROHIBITED' },
    });
  }

  const previousStatus = user.status;
  user.status = status;

  // Invalidate user's existing tokens if deactivated/suspended
  if (status !== 'ACTIVE') {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  await user.save();

  // Audit Log
  const actionName = status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: actionName,
    targetType: 'USER',
    targetId: user._id,
    targetName: user.name,
    description: `User '${user.name}' status changed from ${previousStatus} to ${status}`,
    metadata: {
      userId: user._id,
      email: user.email,
      role: user.role,
      previousStatus,
      newStatus: status,
      reason: reason || '',
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: `User account has been ${status.toLowerCase()} successfully.`,
    data: {
      ...user.toSafeObject(),
      user: user.toSafeObject(),
    },
  });
});

/**
 * @desc    Get Organization Proctors
 * @route   GET /api/organization/proctors
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationProctors = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const { search, status } = req.query;

  const query = { organizationId, role: ROLES.PROCTOR };

  if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const [total, proctors] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select('-password -tokenVersion')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization proctors retrieved.',
    data: {
      proctors,
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
 * @desc    Create or Invite a Proctor under Organization
 * @route   POST /api/organization/proctors
 * @access  Private (Org Admin, Super Admin)
 */
export const createOrganizationProctor = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { name, email, password, phone, department } = req.body;

  if (!name || !email) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Proctor name and official email address are required.',
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  const emailClean = email.trim().toLowerCase();

  // Check if proctor already exists in this organization
  const existingUser = await User.findOne({
    email: emailClean,
    organizationId,
  });

  if (existingUser) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.CONFLICT,
      message: 'A user with this email already exists in this organization.',
      error: { code: 'EMAIL_ALREADY_EXISTS' },
    });
  }

  // Generate a secure temporary password if none provided
  const temporaryPassword = password || crypto.randomBytes(6).toString('hex') + 'A1!';

  const proctor = await User.create({
    organizationId,
    name: name.trim(),
    email: emailClean,
    password: temporaryPassword,
    role: ROLES.PROCTOR,
    status: 'ACTIVE',
    profile: {
      phone: phone ? String(phone).trim() : '',
      department: department ? String(department).trim() : '',
    },
  });

  // Audit log
  await logAuditEvent({
    actor: req.user,
    organizationId,
    action: 'PROCTOR_CREATED',
    targetType: 'USER',
    targetId: proctor._id,
    targetName: proctor.name,
    description: `Proctor account '${proctor.name}' created by ${req.user.name}`,
    metadata: { email: proctor.email, department },
    req,
  });

  const safeProctor = proctor.toSafeObject();
  const responseData = {
    ...safeProctor,
    proctor: safeProctor,
    temporaryPassword: !password ? temporaryPassword : null,
    temporaryPasswordNotice: !password ? temporaryPassword : null,
  };

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Proctor account created successfully.',
    data: responseData,
  });
});

/**
 * @desc    Get Organization Candidates
 * @route   GET /api/organization/candidates
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationCandidates = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const { search, status } = req.query;

  const query = { organizationId, role: ROLES.CANDIDATE };

  if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { 'profile.studentId': searchRegex },
    ];
  }

  const [total, candidates] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select('-password -tokenVersion')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization candidates retrieved.',
    data: {
      candidates,
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
 * @desc    Get Candidate Details by ID
 * @route   GET /api/organization/candidates/:userId
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationCandidateById = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);
  const { userId } = req.params;

  const candidate = await User.findOne({
    _id: userId,
    organizationId,
    role: ROLES.CANDIDATE,
  }).select('-password -tokenVersion');

  if (!candidate) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Candidate not found in this organization.',
      error: { code: 'CANDIDATE_NOT_FOUND' },
    });
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Candidate details retrieved.',
    data: candidate,
  });
});

/**
 * @desc    Get Organization Audit Logs
 * @route   GET /api/organization/audit-logs
 * @access  Private (Org Admin, Super Admin)
 */
export const getOrganizationAuditLogs = asyncHandler(async (req, res) => {
  const organizationId = resolveAuthOrgId(req);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
  const skip = (page - 1) * limit;

  const query = { organizationId };

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization activity logs retrieved.',
    data: {
      logs,
      auditLogs: logs,
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
