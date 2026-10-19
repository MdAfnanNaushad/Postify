/**
 * NoSQL injection sanitizer middleware:
 * Recursively removes keys starting with '$' or containing '.' from req.body, req.query, and req.params
 * to prevent MongoDB operator injection while preserving legitimate values.
 */

function sanitizeObject(target) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = sanitizeObject(target[i]);
    }
    return target;
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      target[key] = sanitizeObject(target[key]);
    }
  }

  return target;
}

const mongoSanitize = (req, res, next) => {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
};

module.exports = { mongoSanitize, sanitizeObject };
