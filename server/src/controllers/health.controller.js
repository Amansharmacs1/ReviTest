import { env } from '../config/environment.js';
import { getDatabaseStatus } from '../config/database.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { MESSAGES } from '../constants/messages.js';

/**
 * @desc    API Health check
 * @route   GET /api/health
 * @access  Public
 */
export const getApiHealth = asyncHandler(async (req, res) => {
  const memoryUsage = process.memoryUsage();

  const healthData = {
    application: env.appName,
    version: env.appVersion,
    status: 'healthy',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
    },
  };

  return ApiResponse.success(res, {
    statusCode: HTTP_STATUS.OK,
    message: MESSAGES.HEALTH_API_SUCCESS,
    data: healthData,
  });
});

/**
 * @desc    Database Health check
 * @route   GET /api/health/db
 * @access  Public
 */
export const getDatabaseHealth = asyncHandler(async (req, res) => {
  const dbStatus = await getDatabaseStatus();

  const statusCode = dbStatus.connected
    ? HTTP_STATUS.OK
    : HTTP_STATUS.SERVICE_UNAVAILABLE;

  const message = dbStatus.connected
    ? MESSAGES.HEALTH_DB_SUCCESS
    : MESSAGES.HEALTH_DB_ERROR;

  return ApiResponse.success(res, {
    statusCode,
    message,
    data: {
      application: env.appName,
      database: dbStatus,
    },
  });
});
