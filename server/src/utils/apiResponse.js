import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export class ApiResponse {
  /**
   * Send a successful JSON response
   */
  static success(
    res,
    { statusCode = HTTP_STATUS.OK, message = 'Success', data = null, meta = undefined }
  ) {
    const payload = {
      success: true,
      message,
      ...(data !== null && { data }),
      ...(meta !== undefined && { meta }),
    };
    return res.status(statusCode).json(payload);
  }

  /**
   * Send a formatted error JSON response
   */
  static error(
    res,
    {
      statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message = 'Error',
      error = null,
      errors = null,
    }
  ) {
    const payload = {
      success: false,
      message,
      ...(error && { error }),
      ...(errors && { errors }),
    };
    return res.status(statusCode).json(payload);
  }
}
