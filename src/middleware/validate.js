// Lightweight validator middleware.
// Avoids introducing new dependencies for now.

const AppError = require('../utils/AppError');

const validationError = (statusCode, errors) => {
  return new AppError('Validation failed', statusCode, errors, 'VALIDATION_FAILED');
};

function validateBody({ schema, validator, statusCode = 400 }) {
  return (req, res, next) => {
    const errors = validator(schema, req.body);

    if (errors && errors.length) {
      return next(validationError(statusCode, errors));
    }

    return next();
  };
}

function validateQuery({ schema, validator, statusCode = 400 }) {
  return (req, res, next) => {
    const errors = validator(schema, req.query);

    if (errors && errors.length) {
      return next(validationError(statusCode, errors));
    }

    return next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
};
