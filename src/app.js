const express = require('express');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

const errorhandler = require('./middleware/errorHandler');

const rootRoutes = require('./routes/root.routes');
const v1Routes = require('./routes/v1');

// NEW: correlation id middleware
const correlationId = require('./middleware/correlationId');

function createApp() {
  const app = express();

  const defaultOrigins = [
    'http://localhost:3000',
    'http://192.168.1.161:3000',
    'https://rurblist.netlify.app',
    'https://rurblist-frontend.vercel.app',
    'https://rurblist.co',
  ];
  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('query parser', 'extended');

  // app use
  app.use(helmet());
  app.use(correlationId);

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: process.env.NODE_ENV === 'production' ? 300 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        const corsError = new Error('Not allowed by CORS');
        corsError.statusCode = 403;
        return callback(corsError);
      },
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // VERY IMPORTANT: webhook raw body must be registered before JSON parsers.
  app.use(
    ['/api/payments/webhook', '/api/v1/payments/webhook'],
    express.raw({ type: 'application/json' }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(passport.initialize());

  // Health endpoints (do not require auth)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'ok',
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
