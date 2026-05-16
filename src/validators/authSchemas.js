// Minimal request schemas to start Phase 2 without changing endpoint behavior.
// We’ll validate in routes before calling controllers.

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

const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const phoneRegex = /^(?:\+234|0)[789][01]\d{8}$/;
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

const registerSchema = {
  email: (v) => {
    if (!hasString(v)) return 'email is required';
    return emailRegex.test(v.trim()) ? null : 'Email is not valid';
  },
  password: (v) => {
    if (!hasString(v)) return 'password is required';
    if (v.length < 8) return 'Password should be at least 8 characters long';
    return strongPassword.test(v)
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
    if (v.length < 8) return 'Password should be at least 8 characters long';
    return strongPassword.test(v)
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

const refreshAccessTokenSchema = {
  refreshToken: (v) => (hasString(v) ? null : 'refreshToken is required'),
};

const verifyGoogleOtpSchema = {
  otp: (v) => (hasString(v) ? null : 'otp is required'),
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshAccessTokenSchema,
  verifyGoogleOtpSchema,
};
