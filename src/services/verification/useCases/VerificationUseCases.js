const AppError = require('../../../utils/AppError');

const parseCursor = (cursor) => {
  if (!cursor) return null;

  try {
    return JSON.parse(cursor);
  } catch {
    throw new AppError('Invalid cursor format', 400);
  }
};

const buildCursorFilter = (cursor) => {
  const parsedCursor = parseCursor(cursor);

  if (!parsedCursor) return {};

  return {
    $or: [
      { createdAt: { $lt: new Date(parsedCursor.value) } },
      {
        createdAt: new Date(parsedCursor.value),
        _id: { $lt: parsedCursor.id },
      },
    ],
  };
};

const buildCursorResponse = (items, limit) => {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = data[data.length - 1];

  return {
    data,
    hasNextPage,
    nextCursor:
      hasNextPage && lastItem
        ? {
            value: lastItem.createdAt,
            id: lastItem._id,
          }
        : null,
  };
};

const getIdString = (value) => {
  if (!value) return null;
  if (value._id) return value._id.toString();
  return value.toString();
};

const canAccessVerification = (verification, user) => {
  if (user.roles?.includes('Admin')) return true;

  const userId = user._id.toString();
  const verificationUserId = getIdString(verification.user);
  const agentUserId = getIdString(verification.agent?.user);

  return verificationUserId === userId || agentUserId === userId;
};

const getAllVerifications = async (deps, input) => {
  const { Verification } = deps;
  const { query } = input;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const filter = buildCursorFilter(query.cursor);

  const verifications = await Verification.find(filter)
    .populate('user', 'fullName email phoneNumber')
    .populate({
      path: 'agent',
      select: 'firstName lastName companyName user',
      populate: {
        path: 'user',
        select: 'fullName email phoneNumber',
      },
    })
    .populate('property', 'title price status location images slug')
    .populate('payment', 'amount currency status reference paidAt')
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(verifications, limit);

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getMyVerifications = async (deps, input) => {
  const { Verification } = deps;
  const { user, query } = input;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const filter = {
    user: user._id,
    ...buildCursorFilter(query.cursor),
  };

  const verifications = await Verification.find(filter)
    .populate({
      path: 'agent',
      select: 'selfieUrl firstName lastName address companyName city nationality user',
      populate: {
        path: 'user',
        select: 'fullName email phoneNumber',
      },
    })
    .populate('property', 'title price status location images slug')
    .populate('payment', 'amount currency status reference paidAt')
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(verifications, limit);

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getVerificationById = async (deps, input) => {
  const { Verification } = deps;
  const { id, user } = input;

  const verification = await Verification.findById(id)
    .populate('user', 'fullName email phoneNumber profileImage')
    .populate({
      path: 'agent',
      select: 'firstName lastName companyName user selfieUrl',
      populate: {
        path: 'user',
        select: 'fullName email phoneNumber profileImage',
      },
    })
    .populate('property', 'title price status location images slug')
    .populate('payment', 'amount currency status reference paidAt');

  if (!verification) {
    throw new AppError('Verification not found', 404);
  }

  if (!canAccessVerification(verification, user)) {
    throw new AppError('Not authorized to view this verification', 403);
  }

  return {
    success: true,
    data: verification,
  };
};

const downloadCertificate = async (deps, input) => {
  const { Verification } = deps;
  const { verificationId, user } = input;

  const verification = await Verification.findById(verificationId).populate({
    path: 'agent',
    select: 'user',
  });

  if (!verification) {
    throw new AppError('Verification not found', 404);
  }

  if (!canAccessVerification(verification, user)) {
    throw new AppError('Not authorized to access this verification', 403);
  }

  if (!verification.certificate || !verification.certificate.url) {
    throw new AppError('Certificate not uploaded yet', 404);
  }

  return {
    success: true,
    message: 'Certificate download link fetched successfully',
    data: {
      certificateId: verification.certificate.certificateId,
      url: verification.certificate.url,
      issuedAt: verification.certificate.issuedAt,
    },
  };
};

const downloadDocument = async (deps, input) => {
  const { Verification } = deps;
  const { verificationId, documentId, user } = input;

  const verification = await Verification.findById(verificationId).populate({
    path: 'agent',
    select: 'user',
  });

  if (!verification) {
    throw new AppError('Verification not found', 404);
  }

  if (!canAccessVerification(verification, user)) {
    throw new AppError('Not authorized to access this verification', 403);
  }

  const document = verification.documents.id(documentId);

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  if (!document.file || !document.file.url) {
    throw new AppError('No file uploaded for this document', 404);
  }

  return {
    success: true,
    message: 'Document download link fetched successfully',
    data: {
      name: document.name,
      url: document.file.url,
    },
  };
};

const updateVerification = async (deps, input) => {
  const { Verification } = deps;
  const { id, body } = input;
  const { status, currentStage, inspection, fundsReleased, fundsReleasedAt, rejectionReason } =
    body;

  const verification = await Verification.findById(id);

  if (!verification) {
    throw new AppError('Verification not found', 404);
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

  return {
    success: true,
    message: 'Verification updated successfully',
    data: verification,
  };
};

const updateDocumentStatus = async (deps, input) => {
  const { Verification } = deps;
  const { verificationId, documentId, body } = input;
  const { status, note } = body;

  const verification = await Verification.findById(verificationId);

  if (!verification) {
    throw new AppError('Verification not found', 404);
  }

  const document = verification.documents.id(documentId);

  if (!document) {
    throw new AppError('Document not found', 404);
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

  return {
    success: true,
    message: 'Document status updated successfully',
    data: verification,
  };
};

const addTimeline = async (deps, input) => {
  const { Verification } = deps;
  const { id, body } = input;
  const { title, description, status = 'info', date } = body;

  const verification = await Verification.findById(id);

  if (!verification) {
    throw new AppError('Verification not found', 404);
  }

  verification.timeline.push({
    title,
    description,
    status,
    date: date || new Date(),
  });

  await verification.save();

  return {
    success: true,
    message: 'Timeline added successfully',
    data: verification,
  };
};

const scheduleInspection = async (deps, input) => {
  const { Verification } = deps;
  const { verificationId, body } = input;
  const { scheduledAt, note = '' } = body;

  if (!scheduledAt) {
    throw new AppError('scheduledAt is required', 400);
  }

  const verification = await Verification.findById(verificationId);

  if (!verification) {
    throw new AppError('Verification not found', 404);
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

  return {
    success: true,
    message: 'Inspection scheduled successfully',
    data: verification,
  };
};

const completeInspection = async (deps, input) => {
  const { Verification } = deps;
  const { verificationId, body } = input;
  const { note = '' } = body;

  const verification = await Verification.findById(verificationId);

  if (!verification) {
    throw new AppError('Verification not found', 404);
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

  return {
    success: true,
    message: 'Inspection completed successfully',
    data: verification,
  };
};

const cleanupFile = async (fs, filePath) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch {}
};

const uploadDocumentFile = async (deps, input) => {
  const { Verification, UploadCloud, fs } = deps;
  const { verificationId, documentId, file, body } = input;
  const { status = 'submitted', note = '' } = body;

  if (!file) {
    throw new AppError('Document file is required', 400);
  }

  const verification = await Verification.findById(verificationId);

  if (!verification) {
    await cleanupFile(fs, file.path);
    throw new AppError('Verification not found', 404);
  }

  const document = verification.documents.id(documentId);

  if (!document) {
    await cleanupFile(fs, file.path);
    throw new AppError('Document not found', 404);
  }

  try {
    const result = await UploadCloud.upload(file.path, 'rublist/verifications/documents');

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
  } finally {
    await cleanupFile(fs, file.path);
  }

  return {
    success: true,
    message: 'Document uploaded successfully',
    data: verification,
  };
};

const uploadCertificate = async (deps, input) => {
  const { Verification, UploadCloud, fs } = deps;
  const { verificationId, file } = input;

  if (!file) {
    throw new AppError('Certificate file is required', 400);
  }

  const verification = await Verification.findById(verificationId);

  if (!verification) {
    await cleanupFile(fs, file.path);
    throw new AppError('Verification not found', 404);
  }

  try {
    const result = await UploadCloud.upload(file.path, 'rublist/verifications/certificates');

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
  } finally {
    await cleanupFile(fs, file.path);
  }

  return {
    success: true,
    message: 'Certificate uploaded successfully',
    data: verification,
  };
};

module.exports = {
  getAllVerifications,
  getMyVerifications,
  getVerificationById,
  downloadCertificate,
  downloadDocument,
  updateVerification,
  updateDocumentStatus,
  addTimeline,
  scheduleInspection,
  completeInspection,
  uploadDocumentFile,
  uploadCertificate,
};
