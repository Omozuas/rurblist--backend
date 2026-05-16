const verificationService = require('../verificationService');

module.exports = {
  getAllVerifications: async (deps, input) =>
    verificationService.getAllVerifications(deps, input),
  getMyVerifications: async (deps, input) =>
    verificationService.getMyVerifications(deps, input),
  getVerificationById: async (deps, input) =>
    verificationService.getVerificationById(deps, input),
  downloadCertificate: async (deps, input) =>
    verificationService.downloadCertificate(deps, input),
  downloadDocument: async (deps, input) => verificationService.downloadDocument(deps, input),
  updateVerification: async (deps, input) =>
    verificationService.updateVerification(deps, input),
  updateDocumentStatus: async (deps, input) =>
    verificationService.updateDocumentStatus(deps, input),
  addTimeline: async (deps, input) => verificationService.addTimeline(deps, input),
  scheduleInspection: async (deps, input) =>
    verificationService.scheduleInspection(deps, input),
  completeInspection: async (deps, input) =>
    verificationService.completeInspection(deps, input),
  uploadDocumentFile: async (deps, input) =>
    verificationService.uploadDocumentFile(deps, input),
  uploadCertificate: async (deps, input) => verificationService.uploadCertificate(deps, input),
};
