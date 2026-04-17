const express = require('express');
const Route = express.Router();
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const Checker = require('../middlewares/checker');

// Rate limiter for forgot password
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: {
    success: false,
    message: 'Too many reset attempts. Please try again in 15 minutes',
  },
});

// Rate limiter for reset password
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Try again later.',
  },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP attempts. Try again later.',
  },
});
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many accounts created. Try again later.',
  },
});

// Create new user
Route.post('/register', signupLimiter, AuthController.createUser);

// Verify OTP
Route.post('/verify-otp', otpLimiter, AuthController.verifyOtp);

// Resend OTP
Route.post('/resend-otp', otpLimiter, AuthController.resendOtp);

// Routes with rate limiting
Route.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
Route.post('/reset-password', resetPasswordLimiter, AuthController.resetPassword);

//login user
Route.post('/login', loginLimiter, AuthController.loginUser);

// refresh token
Route.post('/refresh-token', AuthController.refreshAccessToken);

Route.post('/verify-google-otp', AuthController.verifyGoogleOtp);

// Logout user (requires authentication)
Route.post('/logout', Checker.authmiddleware, AuthController.logout);

// Google Auth routes
Route.get('/google', AuthController.googleAuth);
Route.get('/google/callback', AuthController.googleCallback);

module.exports = Route;
