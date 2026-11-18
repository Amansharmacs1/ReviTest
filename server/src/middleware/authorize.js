import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ROLES } from '../constants/roles.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Authentication required before checking permissions.',
        error: { code: 'UNAUTHENTICATED' },
      });
    }

    // SUPER_ADMIN has global bypass permissions
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: `Forbidden: Role '${req.user.role}' lacks permission for this action.`,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
      });
    }

    next();
  };
};

