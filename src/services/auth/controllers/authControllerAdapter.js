const asynchandler = require('express-async-handler');
const passport = require('passport');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const User = require('../../../models/User');
const HomeSeeker = require('../../../models/HomeSeeker');
const Agent = require('../../../models/Agent');
const SendEmails = require('../../email/emailService');
const jwtToken = require('../../../config/jwtToken');
const AuthContract = require('../contracts/authContract');
const AppError = require('../../../utils/AppError');

const accessCookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || 'rublist_auth';
const refreshCookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';

const getCookieMaxAge = (envKey, fallback) => {
  const value = Number(process.env[envKey]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const buildAuthResponseData = ({ accessToken, refreshToken }) => {
  const data = { accessToken };

  if (process.env.RETURN_REFRESH_TOKEN_IN_BODY !== 'false') {
    data.refreshToken = refreshToken;
  }

  return data;
};

const cookieOptions = () => {
  const isProduction = (process.env.NODE_ENV || '').trim() === 'production';

  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE.trim() === 'true'
      : isProduction,
    sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax'),
    path: '/',
  };
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const options = cookieOptions();

  res.cookie(refreshCookieName, refreshToken, {
    ...options,
    maxAge: getCookieMaxAge('REFRESH_TOKEN_COOKIE_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1000),
  });

  res.cookie(accessCookieName, accessToken, {
    ...options,
    maxAge: getCookieMaxAge('ACCESS_TOKEN_COOKIE_MAX_AGE_MS', 60 * 60 * 1000),
  });
};

const clearAuthCookies = (res) => {
  const options = cookieOptions();

  res.clearCookie(refreshCookieName, options);
  res.clearCookie(accessCookieName, options);
};

module.exports = {
  requireRefreshToken: (req, res, next) => {
    const refreshToken = req.cookies?.[refreshCookieName] || req.body?.refreshToken;

    if (!refreshToken) {
      return next(
        new AppError('refreshToken is required', 400, undefined, 'REFRESH_TOKEN_REQUIRED'),
      );
    }

    return next();
  },

  createUser: asynchandler(async (req, res) => {
    const result = await AuthContract.createUser({ User, HomeSeeker, Agent }, req.body);
    return res.status(201).json(result);
  }),

  loginUser: asynchandler(async (req, res) => {
    const { accessToken, refreshToken } = await AuthContract.loginUser({ User }, req.body);

    setAuthCookies(res, { accessToken, refreshToken });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: buildAuthResponseData({ accessToken, refreshToken }),
    });
  }),

  verifyOtp: asynchandler(async (req, res) => {
    const result = await AuthContract.verifyOtp({ User, SendEmails }, req.body);
    return res.status(200).json({ success: true, message: result?.message, data: result });
  }),

  resendOtp: asynchandler(async (req, res) => {
    const result = await AuthContract.resendOtp({ User, SendEmails }, req.body);
    return res.status(200).json({ success: true, message: result?.message, data: result });
  }),

  forgotPassword: asynchandler(async (req, res) => {
    const result = await AuthContract.forgotPassword({ User, SendEmails, crypto }, req.body);
    return res.status(200).json({ success: true, message: result?.message, data: result });
  }),

  resetPassword: asynchandler(async (req, res) => {
    const result = await AuthContract.resetPassword({ User, crypto, bcrypt }, req.body);
    return res.status(200).json({ success: true, message: result?.message, data: result });
  }),

  refreshAccessToken: asynchandler(async (req, res) => {
    const refreshToken = req.cookies?.[refreshCookieName] || req.body.refreshToken;
    const result = await AuthContract.refreshAccessToken({ User, jwtToken }, { refreshToken });

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return res.status(200).json({
      success: true,
      message: 'success',
      data: buildAuthResponseData({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
    });
  }),

  verifyGoogleOtp: asynchandler(async (req, res) => {
    const result = await AuthContract.verifyGoogleOtp({ User, jwtToken, crypto }, req.body);

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return res.status(200).json({
      success: true,
      message: 'success',
      data: buildAuthResponseData({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
    });
  }),

  logout: asynchandler(async (req, res) => {
    const result = await AuthContract.logout({ User }, { user: req.user });

    clearAuthCookies(res);

    return res.status(200).json(result);
  }),

  googleAuth: passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),

  googleCallback: [
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    asynchandler(async (req, res) => {
      const result = await AuthContract.completeGoogleCallback({ User }, { user: req.user });

      return res.redirect(`${process.env.FRONTEND_URL}/oAuth-success-page?ticket=${result.ticket}`);
    }),
  ],
};
