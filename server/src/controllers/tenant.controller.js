import { Organization } from '../models/Organization.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get Public Organization Info for candidate onboarding / branding
 * @route   GET /api/tenants/public/:identifier
 * @access  Public
 */
export const getPublicTenant = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  if (!identifier) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Organization identifier is required.',
      error: { code: 'IDENTIFIER_REQUIRED' },
    });
  }

  const query = identifier.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: identifier }
    : {
        $or: [{ slug: identifier.toLowerCase() }, { code: identifier.toUpperCase() }],
      };

  const organization = await Organization.findOne(query);

  if (!organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: `Organization '${identifier}' was not found.`,
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Organization workspace details retrieved.',
    data: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      code: organization.code,
      type: organization.type,
      status: organization.status,
      settings: {
        allowSelfRegistration: organization.settings.allowSelfRegistration,
        primaryColor: organization.settings.primaryColor,
        logoUrl: organization.settings.logoUrl,
      },
    },
  });
});

/**
 * @desc    Get Current Workspace Details
 * @route   GET /api/tenants/current
 * @access  Private (Authenticated)
 */
export const getCurrentTenant = asyncHandler(async (req, res) => {
  if (!req.organization) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'No organization context associated with this session.',
      error: { code: 'TENANT_NOT_ASSOCIATED' },
    });
  }

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Current organization workspace retrieved.',
    data: req.organization.toSafeObject(),
  });
});

/**
 * @desc    Update Organization Workspace Settings
 * @route   PATCH /api/tenants/settings
 * @access  Private (Org Admin & Super Admin)
 */
export const updateTenantSettings = asyncHandler(async (req, res) => {
  const {
    allowSelfRegistration,
    requireProctoringByDefault,
    defaultExamDurationMinutes,
    primaryColor,
    logoUrl,
  } = req.body;

  const organization = req.organization;

  if (allowSelfRegistration !== undefined) {
    organization.settings.allowSelfRegistration = Boolean(allowSelfRegistration);
  }
  if (requireProctoringByDefault !== undefined) {
    organization.settings.requireProctoringByDefault = Boolean(
      requireProctoringByDefault
    );
  }
  if (defaultExamDurationMinutes !== undefined) {
    organization.settings.defaultExamDurationMinutes = Number(defaultExamDurationMinutes);
  }
  if (primaryColor) {
    organization.settings.primaryColor = primaryColor;
  }
  if (logoUrl !== undefined) {
    organization.settings.logoUrl = logoUrl;
  }

  await organization.save();

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Workspace settings updated successfully.',
    data: organization.toSafeObject(),
  });
});
