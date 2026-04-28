const asyncHandler = require('express-async-handler');
const fs = require('fs');
const Verification = require('../models/Verfication');
const UploadCloud = require('../config/cloudnary');

class VerificationController {
  static getAllVerifications = asyncHandler(async (req, res) => {
    const verifications = await Verification.find()
      .populate('user', 'fullName email phoneNumber')
      .populate({
        path: 'agent',
        populate: {
          path: 'user',
          select: 'fullName email phoneNumber',
        },
      })
      .populate('property')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: verifications.length,
      data: verifications,
    });
  });

  static getMyVerifications = asyncHandler(async (req, res) => {
    const verifications = await Verification.find({ user: req.user._id })
      .populate({
        path: 'agent',
        populate: {
          path: 'user',
          select: 'fullName email phoneNumber',
        },
      })
      .populate('property')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: verifications.length,
      data: verifications,
    });
  });

  static getVerificationById = asyncHandler(async (req, res) => {
    const verification = await Verification.findById(req.params.id)
      .populate('user', 'fullName email phoneNumber')
      .populate({
        path: 'agent',
        populate: {
          path: 'user',
          select: 'fullName email phoneNumber',
        },
      })
      .populate('property')
      .populate('payment');

    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }

    res.status(200).json({
      success: true,
      data: verification,
    });
  });

  static updateVerification = asyncHandler(async (req, res) => {
    const { status, currentStage, inspection, fundsReleased, fundsReleasedAt, rejectionReason } =
      req.body;

    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }

    if (status) verification.status = status;
    if (currentStage) verification.currentStage = currentStage;
    if (inspection) verification.inspection = inspection;

    if (typeof fundsReleased === 'boolean') {
      verification.fundsReleased = fundsReleased;
      verification.fundsReleasedAt = fundsReleased ? fundsReleasedAt || new Date() : null;
    }

    if (rejectionReason !== undefined) {
      verification.rejectionReason = rejectionReason;
    }

    verification.timeline.push({
      title: 'Verification Updated',
      description: `Verification status updated to ${verification.status}`,
      status: verification.status === 'rejected' ? 'failed' : 'info',
      date: new Date(),
    });

    await verification.save();

    res.status(200).json({
      success: true,
      message: 'Verification updated successfully',
      data: verification,
    });
  });

  static updateDocumentStatus = asyncHandler(async (req, res) => {
    const { verificationId, documentId } = req.params;
    const { status, note } = req.body;

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }

    const document = verification.documents.id(documentId);

    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }

    if (status) document.status = status;
    if (note !== undefined) document.note = note;

    if (status === 'submitted') document.submittedAt = new Date();
    if (status === 'verified') document.verifiedAt = new Date();
    if (status === 'rejected') document.rejectedAt = new Date();

    verification.timeline.push({
      title: `${document.name} ${status}`,
      description: note || `${document.name} status updated to ${status}`,
      status: status === 'verified' ? 'success' : status === 'rejected' ? 'failed' : 'info',
      date: new Date(),
    });

    await verification.save();

    res.status(200).json({
      success: true,
      message: 'Document status updated successfully',
      data: verification,
    });
  });

  static uploadDocumentFile = asyncHandler(async (req, res) => {
    const { verificationId, documentId } = req.params;
    const { status = 'submitted', note = '' } = req.body;

    if (!req.file) {
      res.status(400);
      throw new Error('Document file is required');
    }

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      await fs.promises.unlink(req.file.path);
      res.status(404);
      throw new Error('Verification not found');
    }

    const document = verification.documents.id(documentId);

    if (!document) {
      await fs.promises.unlink(req.file.path);
      res.status(404);
      throw new Error('Document not found');
    }

    const result = await UploadCloud.upload(req.file.path, 'rublist/verifications/documents');

    document.file = {
      url: result.url,
      public_id: result.public_id,
    };

    document.status = status;
    document.note = note;
    document.submittedAt = document.submittedAt || new Date();

    if (status === 'verified') document.verifiedAt = new Date();
    if (status === 'rejected') document.rejectedAt = new Date();

    verification.timeline.push({
      title: `${document.name} Uploaded`,
      description: note || `${document.name} has been uploaded`,
      status: status === 'verified' ? 'success' : status === 'rejected' ? 'failed' : 'info',
      date: new Date(),
    });

    await verification.save();

    await fs.promises.unlink(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: verification,
    });
  });

  static uploadCertificate = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;

    if (!req.file) {
      res.status(400);
      throw new Error('Certificate file is required');
    }

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      await fs.promises.unlink(req.file.path);
      res.status(404);
      throw new Error('Verification not found');
    }

    const result = await UploadCloud.upload(req.file.path, 'rublist/verifications/certificates');

    verification.certificate.url = result.url;
    verification.certificate.public_id = result.public_id;
    verification.certificate.issuedAt = new Date();

    verification.status = 'completed';
    verification.isCompleted = true;
    verification.completedAt = new Date();

    verification.fundsReleased = true;
    verification.fundsReleasedAt = new Date();

    verification.currentStage = {
      title: 'Verification Completed Successfully',
      description: 'Funds have been released to seller',
      estimatedCompletion: null,
    };

    verification.timeline.push(
      {
        title: 'Verification Completed',
        description: 'Property verification has been completed successfully',
        status: 'success',
        date: new Date(),
      },
      {
        title: 'Verification Certificate Uploaded',
        description: 'Verification certificate has been uploaded successfully',
        status: 'success',
        date: new Date(),
      },
      {
        title: 'Funds Released',
        description: 'Funds have been released to seller',
        status: 'success',
        date: new Date(),
      },
    );

    await verification.save();

    await fs.promises.unlink(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: verification,
    });
  });

  static addTimeline = asyncHandler(async (req, res) => {
    const { title, description, status = 'info', date } = req.body;

    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }

    verification.timeline.push({
      title,
      description,
      status,
      date: date || new Date(),
    });

    await verification.save();

    res.status(200).json({
      success: true,
      message: 'Timeline added successfully',
      data: verification,
    });
  });

  static scheduleInspection = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
    const { scheduledAt, note = '' } = req.body;

    if (!scheduledAt) {
      res.status(400);
      throw new Error('scheduledAt is required');
    }

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }

    verification.status = 'inspection_scheduled';

    verification.inspection.scheduledAt = new Date(scheduledAt);
    verification.inspection.note = note;

    verification.currentStage = {
      title: 'Inspection Scheduled',
      description: 'Property inspection has been scheduled',
      estimatedCompletion: '1-2 business days',
    };

    verification.timeline.push({
      title: 'Inspection Scheduled',
      description: note || `Inspection scheduled for ${new Date(scheduledAt).toDateString()}`,
      status: 'info',
      date: new Date(),
    });

    await verification.save();

    res.status(200).json({
      success: true,
      message: 'Inspection scheduled successfully',
      data: verification,
    });
  });

  static completeInspection = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
    const { note = '' } = req.body;

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }

    verification.inspection.completedAt = new Date();

    verification.status = 'documents_under_review';

    verification.currentStage = {
      title: 'Inspection Completed',
      description: 'Property inspection has been completed successfully',
      estimatedCompletion: '1-2 business days',
    };

    verification.timeline.push({
      title: 'Inspection Completed',
      description: note || 'Property inspection has been completed successfully',
      status: 'success',
      date: new Date(),
    });

    await verification.save();

    res.status(200).json({
      success: true,
      message: 'Inspection completed successfully',
      data: verification,
    });
  });

  static downloadCertificate = asyncHandler(async (req, res) => {
    const { verificationId } = req.params;
  
    const verification = await Verification.findById(verificationId);
  
    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }
  
    if (!verification.certificate || !verification.certificate.url) {
      res.status(404);
      throw new Error('Certificate not uploaded yet');
    }
  
    return res.status(200).json({
      success: true,
      message: 'Certificate download link fetched successfully',
      data: {
        certificateId: verification.certificate.certificateId,
        url: verification.certificate.url,
        issuedAt: verification.certificate.issuedAt,
      },
    });
  });

  static downloadDocument = asyncHandler(async (req, res) => {
    const { verificationId, documentId } = req.params;
  
    const verification = await Verification.findById(verificationId);
  
    if (!verification) {
      res.status(404);
      throw new Error('Verification not found');
    }
  
    const document = verification.documents.id(documentId);
  
    if (!document) {
      res.status(404);
      throw new Error('Document not found');
    }
  
    if (!document.file || !document.file.url) {
      res.status(404);
      throw new Error('No file uploaded for this document');
    }
  
    return res.status(200).json({
      success: true,
      message: 'Document download link fetched successfully',
      data: {
        name: document.name,
        url: document.file.url,
      },
    });
  });
}

module.exports = VerificationController;
