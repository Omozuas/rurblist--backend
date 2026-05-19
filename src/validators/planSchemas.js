const { hasString, isNumberLike, validate } = require('./common');

const createPlanSchema = {
  name: (v) => (hasString(v) ? null : 'name is required'),
  amount: (v) => (isNumberLike(v) ? null : 'amount must be a valid number'),
  features: (v) => (Array.isArray(v) && v.length ? null : 'features must be a non-empty array'),
};

module.exports = {
  validate,
  createPlanSchema,
};
