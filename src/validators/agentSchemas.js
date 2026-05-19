const { hasString, isBooleanLike, isNumberLike, validate } = require('./common');

const createAgentSchema = {
  firstName: (v) => (hasString(v) ? null : 'firstName is required'),
  lastName: (v) => (hasString(v) ? null : 'lastName is required'),
  nin: (v) => (hasString(v) ? null : 'nin is required'),
  yearsOfExperience: (v) =>
    isNumberLike(v) && Number(v) >= 0 ? null : 'yearsOfExperience must be a valid number',
  isAgreement: (v) => (isBooleanLike(v) ? null : 'isAgreement is required'),
};

const completeAgentProfileSchema = createAgentSchema;

const updateAgentSchema = {
  nin: (v) => (v === undefined ? null : 'nin cannot be updated'),
  firstName: (v) => (v === undefined ? null : 'firstName cannot be updated'),
  lastName: (v) => (v === undefined ? null : 'lastName cannot be updated'),
  dateOfBirth: (v) => (v === undefined ? null : 'dateOfBirth cannot be updated'),
  yearsOfExperience: (v) =>
    v === undefined || (isNumberLike(v) && Number(v) >= 0)
      ? null
      : 'yearsOfExperience must be a valid number',
};

module.exports = {
  validate,
  createAgentSchema,
  completeAgentProfileSchema,
  updateAgentSchema,
};
