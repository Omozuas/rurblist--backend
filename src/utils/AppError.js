class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined, code = undefined) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.success = false;
    this.isOperational = true;

    if (details !== undefined) {
      this.details = details;
    }

    if (code !== undefined) {
      this.code = code;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
