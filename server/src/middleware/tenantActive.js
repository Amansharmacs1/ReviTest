import { Organization } from '../models/Organization.js';
import { ROLES } from '../constants/roles.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Middleware to verify that the calling user's organization is ACTIVE
 */
export const verifyOrganizationActive = async (req, res, next) => {
  if (req.user?.role === ROLES.SUPER_ADMIN) {
    return next();
  }

  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'No organization workspace associated with this session.',
      error: { code: 'TENANT_NOT_ASSOCIATED' },
    });
  }

  const org = await Organization.findById(organizationId).select('status');
  if (!org) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Organization workspace not found.',
      error: { code: 'ORGANIZATION_NOT_FOUND' },
    });
  }

  if (org.status === 'SUSPENDED') {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message:
        'This organization workspace has been suspended by platform administration.',
      error: { code: 'ORGANIZATION_SUSPENDED' },
    });
  }

  next();
};

export default verifyOrganizationActive;
