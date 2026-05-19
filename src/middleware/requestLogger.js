const logger = require('../utils/logger');

function requestLogger() {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const contentLength = Number(res.getHeader('content-length')) || 0;

      logger.info('HTTP request', {
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        responseTimeMs: Number(durationMs.toFixed(3)),
        contentLength,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    });

    next();
  };
}

module.exports = requestLogger;
