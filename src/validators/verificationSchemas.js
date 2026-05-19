const { hasString, validate } = require('./common');

const scheduleInspectionSchema = {
  scheduledAt: (v) => (hasString(v) ? null : 'scheduledAt is required'),
};

const allowedVerificationStatuses = new Set([
  'pending',
  'documents_under_review',
  'inspection_scheduled',
  'completed',
  'rejected',
]);

const allowedDocumentStatuses = new Set(['pending', 'submitted', 'verified', 'rejected']);

const updateVerificationSchema = {
  status: (v) =>
    v === undefined || allowedVerificationStatuses.has(v) ? null : 'status is invalid',
};

const updateDocumentStatusSchema = {
  status: (v) => (allowedDocumentStatuses.has(v) ? null : 'status is invalid'),
};

const uploadDocumentSchema = {
  status: (v) =>
    v === undefined || allowedDocumentStatuses.has(v) ? null : 'status is invalid',
};

const completeInspectionSchema = {
  note: (v) => (v === undefined || hasString(v) ? null : 'note must be a string'),
};

const timelineSchema = {
  title: (v) => (hasString(v) ? null : 'title is required'),
  description: (v) => (hasString(v) ? null : 'description is required'),
};

module.exports = {
  validate,
  scheduleInspectionSchema,
  updateVerificationSchema,
  updateDocumentStatusSchema,
  uploadDocumentSchema,
  completeInspectionSchema,
  timelineSchema,
};
