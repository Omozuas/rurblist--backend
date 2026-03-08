class ErrorHandler {

  static notfound(req, res, next) {
    const error = new Error(`Not Found: ${req.originalUrl}`);
    error.statusCode = 404;
    res.statusCode=404;
    next(error);
  }

  static errorHandler(err, req, res, next) {

    let statusCode = res.statusCode || 500;
    let message = err.message || "Internal Server Error";

    /**
     * MongoDB Invalid ObjectId
     */
    if (err.name === "CastError") {
      statusCode = 400;
      message = `Invalid ${err.path}: ${err.value}`;
    }

    /**
     * MongoDB Duplicate Key
     */
    if (err.code === 11000) {
      statusCode = 400;
      const field = Object.keys(err.keyValue)[0];
      message = `${field} already exists`;
    }

    /**
     * Mongoose Validation Error
     */
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = Object.values(err.errors)
        .map(val => val.message)
        .join(", ");
    }

    /**
     * JWT Errors
     */
    if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    }

    if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    }

    const response = {
      success: false,
      message
    };

    if (process.env.NODE_ENV === "development") {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;