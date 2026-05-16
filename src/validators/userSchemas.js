function hasString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validate(schema, body) {
  const errors = [];

  for (const [key, rule] of Object.entries(schema)) {
    const value = body ? body[key] : undefined;
    const err = rule(value, body);
    if (err) errors.push({ field: key, message: err });
  }

  return errors;
}

function isMongoId(v) {
  if (typeof v !== 'string') return false;
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const changePasswordSchema = {
  oldPassword: (v) => (hasString(v) ? null : 'oldPassword is required'),
  password: (v) => (hasString(v) ? null : 'password is required'),
};

// Param validation (used with validate() against req.params)
const mongoIdParamSchema = {
  id: (v) => (isMongoId(v) ? null : 'id must be a valid MongoId'),
  propertyId: (v) => (isMongoId(v) ? null : 'propertyId must be a valid MongoId'),
};

module.exports = {
  validate,
  changePasswordSchema,
  mongoIdParamSchema,
};
