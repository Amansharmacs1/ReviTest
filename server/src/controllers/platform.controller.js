import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * @desc    Get Platform-level Dashboard Statistics for Super Admin
 * @route   GET /api/platform/dashboard
 * @access  Private (Super Admin Only)
 */
export const getPlatformDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalOrganizations,
    activeOrganizations,
    pendingOrganizations,
    suspendedOrganizations,
    totalUsers,
    totalCandidates,
    totalProctors,
    totalOrgAdmins,
    recentPlatformActivity,
  ] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ status: 'ACTIVE' }),
    Organization.countDocuments({ status: 'PENDING_VERIFICATION' }),
    Organization.countDocuments({ status: 'SUSPENDED' }),
    User.countDocuments(),
    User.countDocuments({ role: ROLES.CANDIDATE }),
    User.countDocuments({ role: ROLES.PROCTOR }),
    User.countDocuments({ role: ROLES.ORG_ADMIN }),
    AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('organizationId', 'name slug code')
      .lean(),
  ]);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Platform dashboard metrics retrieved.',
    data: {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        pending: pendingOrganizations,
        suspended: suspendedOrganizations,
      },
      users: {
        total: totalUsers,
        candidates: totalCandidates,
        proctors: totalProctors,
        orgAdmins: totalOrgAdmins,
      },
      recentActivity: recentPlatformActivity,
    },
  });
});

/**
 * @desc    Get All Registered Organizations (Search, Filter & Pagination)
 * @route   GET /api/platform/organizations
 * @access  Private (Super Admin Only)
 */
export const getPlatformOrganizations = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const { search, status, type } = req.query;

  const query = {};

  if (status && ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { slug: searchRegex },
      { code: searchRegex },
      { contactEmail: searchRegex },
    ];
  }

  const [total, organizations] = await Promise.all([
    Organization.countDocuments(query),
    Organization.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  // Aggregate user counts for each organization in this page
  const orgIds = organizations.map((org) => org._id);
  const userCounts = await User.aggregate([
    { $match: { organizationId: { $in: orgIds } } },
    { $group: { _id: '$organizationId', count: { $sum: 1 } } },
  ]);

  const countMap = userCounts.reduce((acc, curr) => {
    acc[curr._id.toString()] = curr.count;
    return acc;
  }, {});

  const enrichedOrgs = organizations.map((org) => ({
    ...org,
    userCount: countMap[org._id.toString()] || 0,
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Platform organizations retrieved.',
    data: {
      organizations: enrichedOrgs,
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
 * @desc    Get Single Organization Details for Platform Admin
 * @route   GET /api/platform/organizations/:organizationId
 * @access  Private (Super Admin Only)
 */
export const getPlatformOrganizationById = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  const organization = await Organization.findById(organizationId).lean();
  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  // Count breakdowns
  const [candidatesCount, proctorsCount, adminsCount, auditLogs] = await Promise.all([
    User.countDocuments({ organizationId, role: ROLES.CANDIDATE }),
    User.countDocuments({ organizationId, role: ROLES.PROCTOR }),
    User.countDocuments({ organizationId, role: ROLES.ORG_ADMIN }),
    AuditLog.find({ organizationId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization details retrieved.',
    data: {
      ...organization,
      metrics: {
        totalUsers: candidatesCount + proctorsCount + adminsCount,
        candidatesCount,
        proctorsCount,
        adminsCount,
      },
      recentLogs: auditLogs,
    },
  });
});

/**
 * @desc    Update Organization Status (Activate, Suspend, Reactivate)
 * @route   PATCH /api/platform/organizations/:organizationId/status
 * @access  Private (Super Admin Only)
 */
export const updatePlatformOrganizationStatus = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const { status, reason } = req.body;

  if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message:
        "Valid status ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') is required.",
      error: { code: 'INVALID_STATUS' },
    });
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  const previousStatus = organization.status;
  organization.status = status;
  await organization.save();

  // Audit Log
  const actionName =
    status === 'ACTIVE'
      ? 'ORG_REACTIVATED'
      : status === 'SUSPENDED'
        ? 'ORG_SUSPENDED'
        : 'ORG_STATUS_CHANGED';

  await logAuditEvent({
    actor: req.user,
    organizationId: organization._id,
    action: actionName,
    targetType: 'ORGANIZATION',
    targetId: organization._id,
    targetName: organization.name,
    description: `Platform Administrator changed organization '${organization.name}' status from ${previousStatus} to ${status}`,
    metadata: {
      organizationId: organization._id,
      previousStatus,
      newStatus: status,
      reason: reason || '',
    },
    req,
  });

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: `Organization has been ${status.toLowerCase()} successfully.`,
    data: organization.toSafeObject(),
  });
});
