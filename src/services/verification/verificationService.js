const VerificationUseCases = require('./useCases/VerificationUseCases');

module.exports = {
  getAllVerifications: VerificationUseCases.getAllVerifications,
  getMyVerifications: VerificationUseCases.getMyVerifications,
  getVerificationById: VerificationUseCases.getVerificationById,
  downloadCertificate: VerificationUseCases.downloadCertificate,
  downloadDocument: VerificationUseCases.downloadDocument,
  updateVerification: VerificationUseCases.updateVerification,
  updateDocumentStatus: VerificationUseCases.updateDocumentStatus,
  addTimeline: VerificationUseCases.addTimeline,
  scheduleInspection: VerificationUseCases.scheduleInspection,
  completeInspection: VerificationUseCases.completeInspection,
  uploadDocumentFile: VerificationUseCases.uploadDocumentFile,
  uploadCertificate: VerificationUseCases.uploadCertificate,
};
