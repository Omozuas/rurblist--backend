// Minimal request schemas to start Phase 2 without changing endpoint behavior.
// We’ll validate in routes before calling controllers.

const {
  emailRegex,
  phoneRegex,
  strongPasswordRegex,
  minPasswordLength,
} = require('../constants/authRules');
const { hasString, validate } = require('./common');

const registerSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Email is not valid';
  },
  password: (v) => {
    if (!hasString(v)) return 'password is required';
    if (v.length < minPasswordLength) {
      return `Password should be at least ${minPasswordLength} characters long`;
    }
    return strongPasswordRegex.test(v)
      ? null
      : 'Password must contain uppercase, lowercase, number, special character and be at least 8 characters';
  },
  role: (v) => (hasString(v) ? null : 'role is required'),
  fullName: (v) => (hasString(v) ? null : 'fullName is required'),
  phoneNumber: (v) => {
    if (!hasString(v)) return 'phoneNumber is required';
    return phoneRegex.test(v.trim()) ? null : 'Invalid phone number';
  },
};

const verifyOtpSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Email is not valid';
  },
  otp: (v) => (hasString(v) ? null : 'otp is required'),
};

const resendOtpSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Email is not valid';
  },
};

const forgotPasswordSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Email is not valid';
  },
};

const resetPasswordSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Email is not valid';
  },
  otp: (v) => (hasString(v) ? null : 'otp is required'),
  password: (v) => {
    if (!hasString(v)) return 'password is required';
    if (v.length < minPasswordLength) {
      return `Password should be at least ${minPasswordLength} characters long`;
    }
    return strongPasswordRegex.test(v)
      ? null
      : 'Password must contain uppercase, lowercase, number, special character and be at least 8 characters';
  },
};

const loginSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Invalid email format';
  },
  password: (v) => (hasString(v) ? null : 'password is required'),
};

const verifyGoogleOtpSchema = {
  otp: (v, body) => (hasString(v) || hasString(body?.ticket) ? null : 'otp or ticket is required'),
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyGoogleOtpSchema,
};
