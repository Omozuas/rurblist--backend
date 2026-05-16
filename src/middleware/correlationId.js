const crypto = require('crypto');

/**
 * Correlation/Request ID middleware.
 * - Reads X-Request-Id if provided
 * - Otherwise generates one
 * - Exposes it on res.locals for logging and downstream use
 */
module.exports = function correlationId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id =
    incoming && typeof incoming === 'string' && incoming.trim()
      ? incoming.trim()
      : crypto.randomUUID();

  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
