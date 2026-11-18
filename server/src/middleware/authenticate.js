import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/User.js';

/**
 * Authentication Middleware
 * Validates JWT Access Token from Authorization header or cookie
 */
export const authenticate = async (req, res, next) => {
  let token = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Authentication required. No valid access token provided.',
      error: { code: 'AUTH_TOKEN_MISSING' },
    });
  }

  try {
    const decoded = verifyAccessToken(token);

    // Verify user exists and is still active
    const user = await User.findById(decoded.userId).select('+tokenVersion');
    if (!user) {
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'The user belonging to this token no longer exists.',
        error: { code: 'AUTH_USER_NOT_FOUND' },
      });
    }

    if (user.status !== 'ACTIVE') {
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: `Account is ${user.status.toLowerCase()}. Access denied.`,
        error: { code: 'ACCOUNT_SUSPENDED' },
      });
    }

    // Attach verified user and tenant context to request
    req.user = {
      _id: user._id,
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
      status: user.status,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Access token has expired. Please refresh your session.',
        error: { code: 'AUTH_TOKEN_EXPIRED' },
      });
    }

    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid access token signature.',
      error: { code: 'AUTH_TOKEN_INVALID' },
    });
  }
};

