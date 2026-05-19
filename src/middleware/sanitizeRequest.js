const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);

const shouldRemoveKey = (key) => blockedKeys.has(key) || key.startsWith('$') || key.includes('.');

const sanitizeValue = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  Object.keys(value).forEach((key) => {
    if (shouldRemoveKey(key)) {
      delete value[key];
      return;
    }

    value[key] = sanitizeValue(value[key]);
  });

  return value;
};

module.exports = function sanitizeRequest(req, res, next) {
  sanitizeValue(req.body);
  sanitizeValue(req.params);
  sanitizeValue(req.query);

  next();
};
