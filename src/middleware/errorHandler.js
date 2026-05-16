const isProduction = () => process.env.NODE_ENV === 'production';

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

  // If it's an operational AppError, keep its message/status as-is.
  // Then allow the existing special-cases to override when applicable
  // (SyntaxError, JWT errors, Mongoose validation, multer, etc.).
  let message = err.message || 'Internal Server Error';

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return { statusCode: 400, message: 'Invalid JSON payload' };
  }

  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body too large' };
  }

  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid ${err.path}: ${err.value}` };
  }

  if (err.code === 11000) {
    return { statusCode: 400, message: getDuplicateKeyMessage(err) };
  }

  if (err.name === 'ValidationError') {
    return {
      statusCode: 400,
      message: Object.values(err.errors)
        .map((val) => val.message)
        .join(', '),
    };
  }

  if (err.name === 'MulterError') {
    return { statusCode: 400, message: err.message || 'Invalid file upload' };
  }

  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token' };
  }

  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired' };
  }

  if (statusCode >= 500 && isProduction()) {
    message = 'Internal Server Error';
  }

  return { statusCode, message, details: err && err.details };
};

const AppError = require('../utils/AppError');

class ErrorHandler {
  static notfound(req, res, next) {
    const error = new AppError(`Not Found: ${req.originalUrl}`, 404);
    next(error);
  }

  static errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    const { statusCode, message, details } = normalizeError(err, res);
    const requestId = res.locals.requestId;

    if (statusCode >= 500) {
      console.error('Server error:', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        message: err.message,
        stack: err.stack,
      });
    }

    const response = {
      success: false,
      message,
    };

    if (details !== undefined && !isProduction()) {
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
