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

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const options = cookieOptions();

  res.cookie('refreshToken', refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('rublist_auth', accessToken, {
    ...options,
    maxAge: 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const options = cookieOptions();

  res.clearCookie('refreshToken', options);
  res.clearCookie('rublist_auth', options);
};

module.exports = {
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
      data: { accessToken, refreshToken },
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
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await AuthContract.refreshAccessToken({ User, jwtToken }, { refreshToken });

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return res.status(200).json({
      success: true,
      message: 'success',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
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
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
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
      const result = await AuthContract.completeGoogleCallback(
        { User, crypto },
        { user: req.user },
      );

      return res.redirect(`${process.env.FRONTEND_URL}/oAuth-success-page?otp=${result.otp}`);
    }),
  ],
};
