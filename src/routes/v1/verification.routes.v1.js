const express = require('express');

const Checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const VerificationController = require('../../services/verification/controllers/verificationControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

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
  VerificationController.updateDocumentStatus,
);
router.patch(
  '/:verificationId/documents/:documentId/upload',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId', 'documentId']),
  Upload.single('file'),
  VerificationController.uploadDocumentFile,
);
router.patch(
  '/:verificationId/certificate/upload',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId']),
  Upload.single('certificate'),
  VerificationController.uploadCertificate,
);
router.patch(
  '/:verificationId/inspection/schedule',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId']),
  VerificationController.scheduleInspection,
);
router.patch(
  '/:verificationId/inspection/complete',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['verificationId']),
  VerificationController.completeInspection,
);
router.post(
  '/:id/timeline',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  VerificationController.addTimeline,
);
router.patch(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  VerificationController.updateVerification,
);

router.get(
  '/:id',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  VerificationController.getVerificationById,
);

module.exports = router;
