const { emailRegex, phoneRegex } = require('../constants/authRules');
const { hasString, validate } = require('./common');

const changePasswordSchema = {
  oldPassword: (v) => (hasString(v) ? null : 'oldPassword is required'),
  password: (v) => (hasString(v) ? null : 'password is required'),
};

const updateUserSchema = {
  email: (v) => (v === undefined || emailRegex.test(String(v).trim()) ? null : 'email is invalid'),
  mobile: (v) =>
    v === undefined || phoneRegex.test(String(v).trim()) ? null : 'mobile is invalid',
  nin: (v) =>
    v === undefined || String(v).trim().length === 11 ? null : 'nin must be 11 characters',
};

module.exports = {
  validate,
  changePasswordSchema,
  updateUserSchema,
};
