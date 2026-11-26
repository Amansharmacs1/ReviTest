import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { MESSAGES } from '../constants/messages.js';

export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true, // Return standard RateLimit headers in the response
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: MESSAGES.RATE_LIMIT_EXCEEDED,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(env.rateLimit.windowMs / 1000 / 60) + ' minutes',
      },
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isProduction ? 30 : 200, // 30 in production, 200 in development/testing
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
      },
    });
  },
});

export const exportRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many data exports requested. Please wait before exporting again.',
      error: {
        code: 'EXPORT_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 minutes',
      },
    });
  },
});
