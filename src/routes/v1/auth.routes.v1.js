const express = require('express');

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
  verifyGoogleOtpSchema,
} = require('../../validators/authSchemas');
const { validateBody } = require('../../middleware/validate');
const { createRateLimiter, keyByIpAndEmail } = require('../../middleware/rateLimiter');

const router = express.Router();

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: keyByIpAndEmail,
  message: 'Too many reset attempts. Please try again in 15 minutes',
  code: 'FORGOT_PASSWORD_RATE_LIMITED',
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: keyByIpAndEmail,
  message: 'Too many attempts. Please try again later',
  code: 'RESET_PASSWORD_RATE_LIMITED',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: keyByIpAndEmail,
  message: 'Too many login attempts. Try again later.',
  code: 'LOGIN_RATE_LIMITED',
});

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: keyByIpAndEmail,
  message: 'Too many OTP attempts. Try again later.',
  code: 'OTP_RATE_LIMITED',
});

const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many accounts created. Try again later.',
  code: 'SIGNUP_RATE_LIMITED',
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

const refreshTokenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many refresh attempts. Try again later.',
  code: 'REFRESH_TOKEN_RATE_LIMITED',
});

const googleOtpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many OTP attempts. Try again later.',
  code: 'GOOGLE_OTP_RATE_LIMITED',
});

router.post(
  '/refresh-token',
  refreshTokenLimiter,
  AuthController.requireRefreshToken,
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
