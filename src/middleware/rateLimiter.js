const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const AppError = require('../utils/AppError');

const getPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getRateLimitNumber = (envKey, fallback) => {
  return getPositiveNumber(process.env[envKey], fallback);
};

const createRateLimiter = ({ message, code = 'RATE_LIMITED', ...options }) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    handler(req, res, next) {
      next(new AppError(message, 429, undefined, code));
    },
  });

const keyByIpAndEmail = (req) => {
  const ip = ipKeyGenerator(req.ip);
  const email = req.body?.email;

  return email ? `${ip}:${email.toLowerCase().trim()}` : ip;
};

const createMutationLimiter = ({
  windowEnv = 'MUTATION_RATE_LIMIT_WINDOW_MS',
  maxEnv = 'MUTATION_RATE_LIMIT_MAX',
  windowMs = getRateLimitNumber(windowEnv, 15 * 60 * 1000),
  max = getRateLimitNumber(maxEnv, 60),
  message = 'Too many requests. Please try again later.',
  code = 'MUTATION_RATE_LIMITED',
} = {}) =>
  createRateLimiter({
    windowMs,
    max,
    message,
    code,
  });

const createUploadLimiter = ({
  windowEnv = 'UPLOAD_RATE_LIMIT_WINDOW_MS',
  maxEnv = 'UPLOAD_RATE_LIMIT_MAX',
  windowMs = getRateLimitNumber(windowEnv, 15 * 60 * 1000),
  max = getRateLimitNumber(maxEnv, 20),
  message = 'Too many upload attempts. Please try again later.',
  code = 'UPLOAD_RATE_LIMITED',
} = {}) =>
  createRateLimiter({
    windowMs,
    max,
    message,
    code,
  });

module.exports = {
  createRateLimiter,
  createMutationLimiter,
  createUploadLimiter,
  getRateLimitNumber,
  keyByIpAndEmail,
  ipKeyGenerator,
};
