function hasString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function isNumberLike(v) {
  return hasValue(v) && Number.isFinite(Number(v));
}

function isBooleanLike(v) {
  return v === true || v === false || v === 'true' || v === 'false';
}

function validate(schema, body) {
  const errors = [];

  for (const [key, rule] of Object.entries(schema)) {
    const value = body ? body[key] : undefined;
    const err = rule(value, body || {});
    if (err) errors.push({ field: key, message: err });
  }

  return errors;
}

module.exports = {
  hasString,
  hasValue,
  isNumberLike,
  isBooleanLike,
  validate,
};
