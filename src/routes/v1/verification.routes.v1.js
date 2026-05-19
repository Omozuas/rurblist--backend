const express = require('express');

const Checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const VerificationController = require('../../services/verification/controllers/verificationControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const { validateBody } = require('../../middleware/validate');
const { createMutationLimiter, createUploadLimiter } = require('../../middleware/rateLimiter');
const {
  validate,
  scheduleInspectionSchema,
  updateVerificationSchema,
  updateDocumentStatusSchema,
  uploadDocumentSchema,
  completeInspectionSchema,
  timelineSchema,
} = require('../../validators/verificationSchemas');

const router = express.Router();

const verificationMutationLimiter = createMutationLimiter({
  maxEnv: 'VERIFICATION_MUTATION_RATE_LIMIT_MAX',
  max: 40,
  code: 'VERIFICATION_MUTATION_RATE_LIMITED',
});
const verificationUploadLimiter = createUploadLimiter({
  maxEnv: 'VERIFICATION_UPLOAD_RATE_LIMIT_MAX',
  max: 15,
  code: 'VERIFICATION_UPLOAD_RATE_LIMITED',
});

router.get('/me', Checker.authmiddleware, VerificationController.getMyVerifications);
router.get(
  '/',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.getAllVerifications,
);
router.get(
  '/:verificationId/documents/:documentId/download',
  Checker.authmiddleware,
  validateMongoIdParams(['verificationId', 'documentId']),
  VerificationController.downloadDocument,
);
router.get(
  '/:verificationId/certificate/download',
  Checker.authmiddleware,
  validateMongoIdParams(['verificationId']),
  VerificationController.downloadCertificate,
);
router.patch(
  '/:verificationId/documents/:documentId/status',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId', 'documentId']),
  verificationMutationLimiter,
  validateBody({ schema: updateDocumentStatusSchema, validator: validate }),
  VerificationController.updateDocumentStatus,
);
router.patch(
  '/:verificationId/documents/:documentId/upload',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId', 'documentId']),
  verificationUploadLimiter,
  Upload.single('file'),
  validateBody({ schema: uploadDocumentSchema, validator: validate }),
  VerificationController.uploadDocumentFile,
);
router.patch(
  '/:verificationId/certificate/upload',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId']),
  verificationUploadLimiter,
  Upload.single('certificate'),
  VerificationController.uploadCertificate,
);
router.patch(
  '/:verificationId/inspection/schedule',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId']),
  verificationMutationLimiter,
  validateBody({ schema: scheduleInspectionSchema, validator: validate }),
  VerificationController.scheduleInspection,
);
router.patch(
  '/:verificationId/inspection/complete',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId']),
  verificationMutationLimiter,
  validateBody({ schema: completeInspectionSchema, validator: validate }),
  VerificationController.completeInspection,
);
router.post(
  '/:id/timeline',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  verificationMutationLimiter,
  validateBody({ schema: timelineSchema, validator: validate }),
  VerificationController.addTimeline,
);
router.patch(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  verificationMutationLimiter,
  validateBody({ schema: updateVerificationSchema, validator: validate }),
  VerificationController.updateVerification,
);

router.get(
  '/:id',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  VerificationController.getVerificationById,
);

module.exports = router;
