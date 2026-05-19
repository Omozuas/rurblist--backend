const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

function validateMongoId(value, field = 'id') {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${field}`, 400);
  }

  return value;
}

const validateId = {
  validateMongodbId: validateMongoId,
};

function validateMongoIdParams(paramKeys = []) {
  return (req, res, next) => {
    try {
      for (const key of paramKeys) {
        validateMongoId(req.params?.[key], key);
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  validateMongoId,
  validateMongoIdParams,
  validateId,
};
