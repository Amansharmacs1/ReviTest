/**
 * Higher-order wrapper for Express route handlers to capture uncaught async errors
 * and forward them to next()
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
