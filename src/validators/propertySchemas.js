const { hasString, isNumberLike, validate } = require('./common');

const optionalNumber = (field) => (v) =>
  v === undefined || isNumberLike(v) ? null : `${field} must be a valid number`;

const requiredPositiveNumber = (field) => (v) =>
  isNumberLike(v) && Number(v) > 0 ? null : `${field} must be a positive number`;

const optionalPositiveNumber = (field) => (v) =>
  v === undefined || (isNumberLike(v) && Number(v) > 0)
    ? null
    : `${field} must be a positive number`;

const createPropertySchema = {
  title: (v) => (hasString(v) ? null : 'title is required'),
  description: (v) => (hasString(v) ? null : 'description is required'),
  type: (v) => (hasString(v) ? null : 'type is required'),
  status: (v) => (hasString(v) ? null : 'status is required'),
  price: requiredPositiveNumber('price'),
  inspectionFee: requiredPositiveNumber('inspectionFee'),
  agentFee: optionalPositiveNumber('agentFee'),
  bedrooms: optionalNumber('bedrooms'),
  bathrooms: optionalNumber('bathrooms'),
  size: optionalNumber('size'),
  lat: (v) => (isNumberLike(v) ? null : 'lat must be a valid number'),
  lng: (v) => (isNumberLike(v) ? null : 'lng must be a valid number'),
};

const updatePropertySchema = {
  price: optionalPositiveNumber('price'),
  inspectionFee: optionalPositiveNumber('inspectionFee'),
  agentFee: optionalPositiveNumber('agentFee'),
  bedrooms: optionalNumber('bedrooms'),
  bathrooms: optionalNumber('bathrooms'),
  size: optionalNumber('size'),
  lat: (v) => (v === undefined || isNumberLike(v) ? null : 'lat must be a valid number'),
  lng: (v) => (v === undefined || isNumberLike(v) ? null : 'lng must be a valid number'),
};

const commentSchema = {
  text: (v) => (hasString(v) && v.trim().length >= 2 ? null : 'text must be at least 2 characters'),
};

const verifyBuyerSchema = {
  nin: (v) => (hasString(v) && v.trim().length === 11 ? null : 'nin must be 11 characters'),
};

module.exports = {
  validate,
  createPropertySchema,
  updatePropertySchema,
  commentSchema,
  verifyBuyerSchema,
};
