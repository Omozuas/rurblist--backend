const express = require('express');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

const errorhandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const rootRoutes = require('./routes/root.routes');
const v1Routes = require('./routes/v1');

// NEW: correlation id middleware
const correlationId = require('./middleware/correlationId');
const requestLogger = require('./middleware/requestLogger');
const sanitizeRequest = require('./middleware/sanitizeRequest');

const getNodeEnv = () => (process.env.NODE_ENV || 'development').trim();

const getPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getAllowedOrigins = () => {
  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const frontendUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim();
  const nodeEnv = getNodeEnv();

  const productionOrigins = [frontendUrl, ...envOrigins].filter(Boolean);
  const developmentOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.161:3000',
    frontendUrl,
    ...envOrigins,
  ].filter(Boolean);

  return [...new Set(nodeEnv === 'production' ? productionOrigins : developmentOrigins)];
};

function createApp() {
  const app = express();

  const nodeEnv = getNodeEnv();
  const allowedOrigins = getAllowedOrigins();
  const bodyLimit = process.env.REQUEST_BODY_LIMIT || '1mb';
  const rateLimitWindowMs = getPositiveNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  );
  const rateLimitMax = getPositiveNumber(
    process.env.RATE_LIMIT_MAX,
    nodeEnv === 'production' ? 300 : 1000,
  );

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('query parser', 'extended');

  // app use
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts:
        nodeEnv === 'production'
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
    }),
  );
  app.use(correlationId);

  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      limit: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      handler(req, res, next) {
        next(new AppError('Too many requests. Please try again later.', 429));
      },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new AppError('Not allowed by CORS', 403, { origin }, 'CORS_DENIED'));
      },
      credentials: true,
      optionsSuccessStatus: 204,
    }),
  );

  app.use(compression());
  app.use(requestLogger());

  // VERY IMPORTANT: webhook raw body must be registered before JSON parsers.
  app.use(
    ['/api/payments/webhook', '/api/v1/payments/webhook'],
    express.raw({ type: 'application/json' }),
  );

  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.use(sanitizeRequest);
  app.use(cookieParser());
  app.use(passport.initialize());

  // Health endpoints (do not require auth)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/readiness', async (req, res, next) => {
    try {
      const readinessCheck = require('./health/readiness');
      const result = await readinessCheck();
      return res.status(result.ready ? 200 : 503).json({
        success: result.ready,
        ...result,
      });
    } catch (e) {
      next(e);
    }
  });

  // Root routes
  app.use(rootRoutes);

  // NEW: versioned routes
  app.use('/api/v1', v1Routes);

  // Backwards-compatible: keep existing `/api/*` working by delegating to v1.
  // (We mount v1 again under /api so old clients keep working.)
  app.use('/api', v1Routes);

  // error handlers
  app.use(errorhandler.notfound);
  app.use(errorhandler.errorHandler);

  return app;
}

module.exports = createApp;
