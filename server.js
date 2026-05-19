const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');

const dbConnect = require('./src/config/dbConnection');
const validateEnv = require('./src/config/validateEnv');
const logger = require('./src/utils/logger');
const packageJson = require('./package.json');

const createApp = require('./src/app');

validateEnv();

require('./src/jobs/pingServer');

let server;
let isShuttingDown = false;

const getNodeEnv = () => (process.env.NODE_ENV || 'development').trim();

const getStartupMetadata = (port) => ({
  app: packageJson.name,
  version: packageJson.version,
  env: getNodeEnv(),
  port,
  pid: process.pid,
  node: process.version,
  shutdownTimeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000,
});

const closeDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.close(false);
  logger.info('Database connection closed');
};

const shutdown = async (signal, error) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (error) {
    logger.error('Fatal process error', { signal, error });
  } else {
    logger.info('Shutdown signal received', { signal });
  }

  const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;
  const forcedShutdown = setTimeout(() => {
    logger.error('Forced shutdown after timeout', { signal, timeoutMs });
    process.exit(1);
  }, timeoutMs);

  if (typeof forcedShutdown.unref === 'function') {
    forcedShutdown.unref();
  }

  const exit = async (code) => {
    clearTimeout(forcedShutdown);
    await closeDatabase();
    process.exit(code);
  };

  if (!server) {
    await exit(error ? 1 : 0);
    return;
  }

  server.close(async (closeError) => {
    if (closeError) {
      logger.error('HTTP server close failed', { error: closeError });
      await exit(1);
      return;
    }

    logger.info('HTTP server closed');
    await exit(error ? 1 : 0);
  });
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  shutdown('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  shutdown('uncaughtException', error);
});

// start server
const startServer = async () => {
  await dbConnect();
  require('./src/config/passport'); // Load Google strategy

  const app = createApp();

  const port = process.env.PORT || 6003;
  server = app.listen(port, () => {
    logger.info('Server started', getStartupMetadata(port));
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
