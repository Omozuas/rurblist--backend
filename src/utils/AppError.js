class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.isOperational = true;

    if (details !== undefined) {
      this.details = details;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
