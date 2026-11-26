import { env } from '../config/environment.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { MESSAGES } from '../constants/messages.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || MESSAGES.INTERNAL_ERROR;
  let errors = err.errors || null;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    const errorMessages = Object.values(err.errors).map((e) => e.message);
    message = errorMessages.length ? errorMessages.join('. ') : 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Resource not found or invalid format: ${err.path}`;
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. It must be unique.`;
  }

  logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, err);

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    error: {
      code: err.code || 'INTERNAL_ERROR',
      ...(env.isDevelopment && { stack: err.stack }),
    },
  };

  return res.status(statusCode).json(response);
};
