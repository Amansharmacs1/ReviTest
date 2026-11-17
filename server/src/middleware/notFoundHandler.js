import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { MESSAGES } from '../constants/messages.js';

export const notFoundHandler = (req, res) => {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `${MESSAGES.NOT_FOUND}: ${req.method} ${req.originalUrl}`,
    error: {
      code: 'ROUTE_NOT_FOUND',
      path: req.originalUrl,
      method: req.method,
    },
  });
};
