const asynchandler = require('express-async-handler');

const jwtToken = require('../config/jwtToken');
const AppError = require('../utils/AppError');
const User = require('../models/User');

class Checker {
  static authmiddleware = asynchandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Not authorized. No token provided', 401);
    }

    const token = authHeader.slice('Bearer '.length).trim();

    if (!token) {
      throw new AppError('Not authorized. No token provided', 401);
    }

    let decoded;

    try {
      decoded = jwtToken.verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    const user = await User.findById(decoded.userId)
      .select('_id fullName email phoneNumber roles profileImage isBlocked passwordChangedDate')
      .lean();

    if (!user) {
      throw new AppError('Invalid or expired token', 401);
    }

    if (user.isBlocked) {
      throw new AppError('Your account has been blocked', 403);
    }

    if (user.passwordChangedDate) {
      const pwChangedAt =
        user.passwordChangedDate instanceof Date
          ? user.passwordChangedDate
          : new Date(user.passwordChangedDate);

      const tokenIssuedAtMs = decoded?.iat ? decoded.iat * 1000 : 0;

      if (!Number.isNaN(pwChangedAt.getTime()) && tokenIssuedAtMs < pwChangedAt.getTime()) {
        throw new AppError('Password recently changed. Please login again.', 401);
      }
    }

    req.user = user;
    return next();
  });

  static allowRoles = (...allowedRoles) =>
    asynchandler(async (req, res, next) => {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
      const hasRole = userRoles.some((role) => allowedRoles.includes(role));

      if (!hasRole) {
        throw new AppError('Access denied', 403);
      }

      return next();
    });
}

module.exports = Checker;
