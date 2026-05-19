const { hasString, isNumberLike, validate } = require('./common');

const createTourSchema = {
  agentId: (v) => (hasString(v) ? null : 'agentId is required'),
  propertyId: (v) => (hasString(v) ? null : 'propertyId is required'),
  price: (v) => (isNumberLike(v) && Number(v) >= 1000 ? null : 'price must be at least 1000'),
  tourType: (v) => (hasString(v) ? null : 'tourType is required'),
  scheduledAt: (v) => (hasString(v) ? null : 'scheduledAt is required'),
};

const rescheduleTourSchema = {
  newDate: (v) => (hasString(v) ? null : 'newDate is required'),
};

const sendMessageSchema = {
  agentId: (v) => (hasString(v) ? null : 'agentId is required'),
  text: (v) => (hasString(v) ? null : 'text is required'),
};

module.exports = {
  validate,
  createTourSchema,
  rescheduleTourSchema,
  sendMessageSchema,
};
