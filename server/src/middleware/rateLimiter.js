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
