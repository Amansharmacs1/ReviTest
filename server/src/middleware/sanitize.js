/**
 * Request Sanitization Middleware
 * Recursively removes MongoDB operator keys (starting with '$' or containing '.')
 * and prototype pollution properties to prevent NoSQL injection.
 */
function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned = {};
  for (const [key, val] of Object.entries(obj)) {
    // Strip dangerous keys
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      continue;
    }
    cleaned[key] = cleanObject(val);
  }
  return cleaned;
}

export const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params);
  }
  next();
};

export default sanitizeInput;
