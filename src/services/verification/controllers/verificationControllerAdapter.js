const asyncHandler = require('express-async-handler');
const fs = require('fs');

const UploadCloud = require('../../../config/cloudinary');
const Verification = require('../../../models/Verfication');
const VerificationContract = require('../contracts/verificationContract');

module.exports = {
  getAllVerifications: asyncHandler(async (req, res) => {
    const result = await VerificationContract.getAllVerifications(
      { Verification },
      { query: req.query },
    );

    return res.status(200).json(result);
  }),

  getMyVerifications: asyncHandler(async (req, res) => {
    const result = await VerificationContract.getMyVerifications(
      { Verification },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getVerificationById: asyncHandler(async (req, res) => {
    const result = await VerificationContract.getVerificationById(
      { Verification },
      {
        id: req.params.id,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  downloadCertificate: asyncHandler(async (req, res) => {
    const result = await VerificationContract.downloadCertificate(
      { Verification },
      {
        verificationId: req.params.verificationId,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  downloadDocument: asyncHandler(async (req, res) => {
    const result = await VerificationContract.downloadDocument(
      { Verification },
      {
        verificationId: req.params.verificationId,
        documentId: req.params.documentId,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  updateVerification: asyncHandler(async (req, res) => {
    const result = await VerificationContract.updateVerification(
      { Verification },
      {
        id: req.params.id,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  updateDocumentStatus: asyncHandler(async (req, res) => {
    const result = await VerificationContract.updateDocumentStatus(
      { Verification },
      {
        verificationId: req.params.verificationId,
        documentId: req.params.documentId,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  addTimeline: asyncHandler(async (req, res) => {
    const result = await VerificationContract.addTimeline(
      { Verification },
      {
        id: req.params.id,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  scheduleInspection: asyncHandler(async (req, res) => {
    const result = await VerificationContract.scheduleInspection(
      { Verification },
      {
        verificationId: req.params.verificationId,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  completeInspection: asyncHandler(async (req, res) => {
    const result = await VerificationContract.completeInspection(
      { Verification },
      {
        verificationId: req.params.verificationId,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  uploadDocumentFile: asyncHandler(async (req, res) => {
    const result = await VerificationContract.uploadDocumentFile(
      {
        Verification,
        UploadCloud,
        fs,
      },
      {
        verificationId: req.params.verificationId,
        documentId: req.params.documentId,
        file: req.file,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  uploadCertificate: asyncHandler(async (req, res) => {
    const result = await VerificationContract.uploadCertificate(
      {
        Verification,
        UploadCloud,
        fs,
      },
      {
        verificationId: req.params.verificationId,
        file: req.file,
      },
    );

    return res.status(200).json(result);
  }),
};
