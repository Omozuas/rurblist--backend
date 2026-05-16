// Lightweight validator middleware.
// Avoids introducing new dependencies for now.

const errorWithStatus = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

function validateBody({ schema, validator, statusCode = 400 }) {
  return (req, res, next) => {
    const errors = validator(schema, req.body);

    if (errors && errors.length) {
      return next(
        errorWithStatus(statusCode, errors.map((e) => `${e.field}: ${e.message}`).join(', ')),
      );
    }

    return next();
  };
}

module.exports = {
  validateBody,
};
