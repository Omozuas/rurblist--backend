const express = require('express');
const Route = express.Router();

const VerificationController = require('../controllers/verificationController');
const Checker = require('../middlewares/checker');
const Upload = require('../helper/multer');

// ===============================
// GET MY VERIFICATIONS
// Authenticated users only
// ===============================
Route.get('/me', Checker.authmiddleware, VerificationController.getMyVerifications);

// ===============================
// GET ALL VERIFICATIONS
// Admin only
// ===============================
Route.get(
  '/',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.getAllVerifications,
);

// ===============================
// DOWNLOAD DOCUMENT
// Authenticated users only
// ===============================
Route.get(
  '/:verificationId/documents/:documentId/download',
  Checker.authmiddleware,
  VerificationController.downloadDocument,
);

// ===============================
// DOWNLOAD CERTIFICATE
// Authenticated users only
// ===============================
Route.get(
  '/:verificationId/certificate/download',
  Checker.authmiddleware,
  VerificationController.downloadCertificate,
);

// ===============================
// UPDATE VERIFICATION GENERAL INFO
// Admin only
// ===============================
Route.patch(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.updateVerification,
);

// ===============================
// UPDATE DOCUMENT STATUS
// Admin only
// ===============================
Route.patch(
  '/:verificationId/documents/:documentId/status',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.updateDocumentStatus,
);

// ===============================
// UPLOAD DOCUMENT FILE
// Admin only
// form-data field name: file
// ===============================
Route.patch(
  '/:verificationId/documents/:documentId/upload',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  Upload.single('file'),
  VerificationController.uploadDocumentFile,
);

// ===============================
// SCHEDULE INSPECTION
// Admin only
// ===============================
Route.patch(
  '/:verificationId/inspection/schedule',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.scheduleInspection,
);

// ===============================
// COMPLETE INSPECTION
// Admin only
// ===============================
Route.patch(
  '/:verificationId/inspection/complete',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.completeInspection,
);

// ===============================
// UPLOAD CERTIFICATE
// Admin only
// form-data field name: certificate
// ===============================
Route.patch(
  '/:verificationId/certificate/upload',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  Upload.single('certificate'),
  VerificationController.uploadCertificate,
);

// ===============================
// ADD TIMELINE ENTRY
// Admin only
// ===============================
Route.post(
  '/:id/timeline',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  VerificationController.addTimeline,
);

// ===============================
// GET SINGLE VERIFICATION
// Authenticated users only
// ===============================
Route.get('/:id', Checker.authmiddleware, VerificationController.getVerificationById);

module.exports = Route;
