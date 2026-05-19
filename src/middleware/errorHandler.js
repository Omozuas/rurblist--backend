const isProduction = () => (process.env.NODE_ENV || '').trim() === 'production';

const getStatusCode = (err, res) => {
  if (Number.isInteger(err.statusCode) && err.statusCode >= 400) {
    return err.statusCode;
  }

  if (Number.isInteger(err.status) && err.status >= 400) {
    return err.status;
  }

  return res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
};

const getDuplicateKeyMessage = (err) => {
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
  return field ? `${field} already exists` : 'Duplicate value already exists';
};

const normalizeError = (err, res) => {
  const statusCode = getStatusCode(err, res);

  let message = err.message || 'Internal Server Error';
  let details = err && err.details;
  let code = err && err.code;

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return { statusCode: 400, message: 'Invalid JSON payload', code: 'INVALID_JSON' };
  }

  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' };
  }

  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid ${err.path}: ${err.value}`, code: 'INVALID_ID' };
  }

  if (err.code === 11000) {
    return { statusCode: 400, message: getDuplicateKeyMessage(err), code: 'DUPLICATE_VALUE' };
  }

  if (err.name === 'ValidationError') {
    return {
      statusCode: 400,
      message: Object.values(err.errors)
        .map((val) => val.message)
        .join(', '),
      code: 'VALIDATION_ERROR',
    };
  }

  if (err.name === 'MulterError') {
    return { statusCode: 400, message: err.message || 'Invalid file upload', code: 'UPLOAD_ERROR' };
  }

  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token', code: 'INVALID_TOKEN' };
  }

  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired', code: 'TOKEN_EXPIRED' };
  }

  if (statusCode >= 500 && isProduction()) {
    message = 'Internal Server Error';
    details = undefined;
    code = undefined;
  }

  return { statusCode, message, details, code };
};

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class ErrorHandler {
  static notfound(req, res, next) {
    const error = new AppError(`Not Found: ${req.originalUrl}`, 404);
    next(error);
  }

  static errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    const { statusCode, message, details, code } = normalizeError(err, res);
    const requestId = res.locals.requestId;

    if (statusCode >= 500) {
      logger.error('Server error', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        error: err,
      });
    }

    const response = {
      success: false,
      status: statusCode < 500 ? 'fail' : 'error',
      message,
    };

    if (code) {
      response.code = code;
    }

    const hasValidationErrors = code === 'VALIDATION_FAILED' && Array.isArray(details);

    if (hasValidationErrors) {
      response.errors = details;
    }

    if (!hasValidationErrors && details !== undefined && !isProduction()) {
      response.details = details;
    }

    if (requestId) {
      response.requestId = requestId;
    }

    if (!isProduction()) {
      response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;
