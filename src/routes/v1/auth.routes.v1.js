const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const AuthController = require('../../services/auth/controllers/authControllerAdapter');
const Checker = require('../../middleware/checker');
const {
  validate,
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshAccessTokenSchema,
  verifyGoogleOtpSchema,
} = require('../../validators/authSchemas');
const { validateBody } = require('../../middleware/validate');

const router = express.Router();

// Rate limiters (same behavior)
// Rate limiter helpers: key off (IP + email) when email exists to prevent IP rotation abuse.
// If email is missing, it falls back to just IP.
const limiterKeyFor = (req) => {
  const ip = ipKeyGenerator(req.ip);
  const email = req.body?.email;
  return email ? `${ip}:${email.toLowerCase().trim()}` : ip;
};

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: limiterKeyFor,
  message: {
    success: false,
    message: 'Too many reset attempts. Please try again in 15 minutes',
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: limiterKeyFor,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: limiterKeyFor,
  message: {
    success: false,
    message: 'Too many login attempts. Try again later.',
  },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: limiterKeyFor,
  message: {
    success: false,
    message: 'Too many OTP attempts. Try again later.',
  },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many accounts created. Try again later.',
  },
});

router.post(
  '/register',
  signupLimiter,
  validateBody({ schema: registerSchema, validator: validate }),
  AuthController.createUser,
);

router.post(
  '/login',
  loginLimiter,
  validateBody({ schema: loginSchema, validator: validate }),
  AuthController.loginUser,
);

router.post(
  '/verify-otp',
  otpLimiter,
  validateBody({ schema: verifyOtpSchema, validator: validate }),
  AuthController.verifyOtp,
);

router.post(
  '/resend-otp',
  otpLimiter,
  validateBody({ schema: resendOtpSchema, validator: validate }),
  AuthController.resendOtp,
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateBody({ schema: forgotPasswordSchema, validator: validate }),
  AuthController.forgotPassword,
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validateBody({ schema: resetPasswordSchema, validator: validate }),
  AuthController.resetPassword,
);

const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many refresh attempts. Try again later.',
  },
});

const googleOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP attempts. Try again later.',
  },
});

router.post(
  '/refresh-token',
  refreshTokenLimiter,
  validateBody({ schema: refreshAccessTokenSchema, validator: validate }),
  AuthController.refreshAccessToken,
);

router.post(
  '/verify-google-otp',
  googleOtpLimiter,
  validateBody({ schema: verifyGoogleOtpSchema, validator: validate }),
  AuthController.verifyGoogleOtp,
);

// Google OAuth (passport redirect flow) - migrate to v1 routes.
// These rely on AuthController.googleAuth / AuthController.googleCallback.
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);

// All JSON auth endpoints migrated to v1+services.
// Legacy auth routes are intentionally NOT mounted here to make v1 the source of truth.

router.post('/logout', Checker.authmiddleware, AuthController.logout);

module.exports = router;
