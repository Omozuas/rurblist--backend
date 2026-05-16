const AppError = require('../../../utils/AppError');

const cleanupUploadedFiles = async (fs, files) => {
  for (const field of Object.values(files || {})) {
    for (const file of field) {
      if (file?.path) {
        try {
          await fs.promises.unlink(file.path);
        } catch {}
      }
    }
  }
};

const deleteCloudinaryAsset = async (UploadCloud, publicId, resourceType) => {
  if (!publicId) return;

  const resourceTypes = resourceType ? [resourceType] : ['image', 'raw'];
  let lastError;

  for (const type of resourceTypes) {
    try {
      const result = await UploadCloud.delete(publicId, type);
      if (result?.result === 'ok' || result?.result === 'not found') return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
};

const buildCloudinaryFile = (UploadCloud, result) => ({
  url: result.url,
  download_url: UploadCloud.getDownloadUrl(result.public_id, result.resource_type),
  public_id: result.public_id,
  resource_type: result.resource_type,
});

const normalizeName = (value = '') => value.trim().toLowerCase();

const createHttpError = (message, statusCode = 400) => {
  return new AppError(message, statusCode);
};

const namesMatch = (inputName, verifiedName) =>
  normalizeName(inputName) === normalizeName(verifiedName);

const verifyAgentIdentity = async (deps, input) => {
  const { DojahService } = deps;
  const { nin, cacNumber, firstName, lastName, companyName } = input;
  const kycStatus = {};
  const verificationData = {};

  if (nin) {
    const ninResult = await DojahService.verifyNIN(nin);

    if (!ninResult.success || !ninResult.isValid) {
      throw createHttpError(
        ninResult.error || 'NIN verification failed',
        ninResult.statusCode || 400,
      );
    }

    const ninEntity = ninResult.data?.entity;

    if (!ninEntity) {
      throw createHttpError('NIN verification returned no record');
    }

    if (
      !namesMatch(firstName, ninEntity.first_name) ||
      !namesMatch(lastName, ninEntity.last_name)
    ) {
      throw createHttpError('First name or last name does not match NIN record');
    }

    kycStatus.ninVerified = true;
    verificationData.nin = ninResult.data?.entity;
  }

  if (cacNumber) {
    if (!companyName) {
      throw createHttpError('Company name is required for CAC verification');
    }

    const cacResult = await DojahService.verifyCAC(cacNumber);

    if (!cacResult.success || !cacResult.isValid) {
      throw createHttpError(
        cacResult.error || 'CAC verification failed',
        cacResult.statusCode || 400,
      );
    }

    const cacEntity = cacResult.data?.entity;

    if (!cacEntity) {
      throw createHttpError('CAC verification returned no record');
    }

    if (!namesMatch(companyName, cacEntity.company_name)) {
      throw createHttpError('Company name does not match CAC record');
    }

    kycStatus.cacVerified = true;
    verificationData.cac = cacResult.data?.entity;
  }

  return { kycStatus, verificationData };
};

const getMyAgent = async (deps, input) => {
  const { Agent } = deps;
  const { user } = input;

  if (!user?._id) {
    throw new AppError('Unauthorized', 401);
  }

  const agent = await Agent.findOne({ user: user._id }).populate(
    'user',
    'email fullName roles _id phoneNumber profileImage',
  );

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  return {
    success: true,
    data: agent,
  };
};

const getAgentByUserId = async (deps, input) => {
  const { Agent, validateId } = deps;
  const { userId } = input;

  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  validateId.validateMongodbId(userId);

  const agent = await Agent.findOne({ user: userId }).populate(
    'user',
    'email fullName  _id phoneNumber profileImage',
  );

  if (!agent) {
    throw new AppError('Agent not found for this user', 404);
  }

  return {
    success: true,
    data: agent,
  };
};

const createAgent = async (deps, input) => {
  const { Agent, User, UploadCloud, DojahService, SendEmails, fs, path } = deps;
  const { user, body, files } = input;

  if (!user?._id) {
    throw new AppError('Unauthorized', 401);
  }

  const {
    firstName,
    lastName,
    dateOfBirth,
    city,
    address,
    nationality,
    nin,
    cacNumber,
    companyName,
    yearsOfExperience,
    description,
    isAgreement,
  } = body;

  const parsedYears = Number(yearsOfExperience);
  const parsedAgreement = isAgreement === true || isAgreement === 'true';

  if (!parsedAgreement) {
    throw new AppError('You must accept the terms and agreement', 400);
  }

  if (!firstName || !lastName) {
    throw new AppError('First name and last name are required', 400);
  }

  if (!nin) {
    throw new AppError('NIN is required', 400);
  }

  if (isNaN(parsedYears) || parsedYears < 0) {
    throw new AppError('Valid years of experience is required', 400);
  }

  if (!files?.selfie || !files?.ninSlip) {
    throw new AppError('Selfie and NIN slip are required documents', 400);
  }

  const existingUserAgent = await Agent.findOne({ user: user._id });

  if (existingUserAgent) {
    throw new AppError('You already have an agent profile', 400);
  }

  const existingAgent = await Agent.findOne({ nin });
  if (existingAgent) {
    throw new AppError('Agent with this NIN already exists', 400);
  }

  const fileFields = ['selfie', 'ninSlip', 'cacDoc'];
  const uploadedFiles = [];

  const fileUrls = {
    selfieUrl: null,
    ninSlipUrl: null,
    cacDocumentUrl: null,
  };

  let agent;

  try {
    const verifiedIdentity = await verifyAgentIdentity(
      { DojahService },
      {
        nin,
        cacNumber,
        firstName,
        lastName,
        companyName,
      },
    );

    for (const field of fileFields) {
      const fileArray = files?.[field];
      if (!fileArray || fileArray.length === 0) continue;

      const file = fileArray[0];
      if (!file?.path) continue;

      const filePath = path.resolve(file.path);
      const result = await UploadCloud.upload(filePath, `rublist/agents/${field}`);

      uploadedFiles.push({
        public_id: result.public_id,
        resource_type: result.resource_type,
      });

      if (field === 'selfie') {
        fileUrls.selfieUrl = buildCloudinaryFile(UploadCloud, result);
      }

      if (field === 'ninSlip') {
        fileUrls.ninSlipUrl = buildCloudinaryFile(UploadCloud, result);
      }

      if (field === 'cacDoc') {
        fileUrls.cacDocumentUrl = buildCloudinaryFile(UploadCloud, result);
      }
    }

    agent = await Agent.create({
      firstName,
      lastName,
      dateOfBirth,
      city,
      address,
      nationality,
      nin,
      cacNumber,
      companyName,
      yearsOfExperience: parsedYears,
      description,
      isAgreement: parsedAgreement,
      user: user._id,
      status: 'approved',
      kycStatus: {
        ninVerified: verifiedIdentity.kycStatus.ninVerified || false,
        cacVerified: verifiedIdentity.kycStatus.cacVerified || false,
      },
      verificationData: {
        nin: verifiedIdentity.verificationData.nin || null,
        cac: verifiedIdentity.verificationData.cac || null,
      },
      ...fileUrls,
    });

    await User.findByIdAndUpdate(user._id, {
      $addToSet: { roles: 'Agent' },
    });
    await User.findByIdAndUpdate(user._id, {
      $pull: { roles: 'Home_Seeker' },
    });

    await agent.populate('user', 'email fullName roles _id phoneNumber profileImage');

    try {
      const fullUser = await User.findById(user._id);

      if (fullUser?.email) {
        await SendEmails.sendAgentApplicationEmail(fullUser.email, firstName);
        await SendEmails.sendAgentApprovalEmail(fullUser.email, agent.firstName);
      }

      await SendEmails.sendAdminAgentNotification(agent);
    } catch (emailErr) {
      console.log('Email error:', emailErr.message);
    }

    await cleanupUploadedFiles(fs, files);

    return {
      success: true,
      message: 'Agent application submitted successfully',
      data: agent,
    };
  } catch (error) {
    await Promise.all(
      uploadedFiles.map((file) => UploadCloud.delete(file.public_id, file.resource_type)),
    );

    if (agent) {
      await Agent.deleteOne({ _id: agent._id });
      await User.findByIdAndUpdate(user._id, {
        $pull: { roles: 'Agent' },
      });
    }

    await cleanupUploadedFiles(fs, files);
    throw error instanceof AppError
      ? error
      : new AppError(error.message || 'Something went wrong', 500);
  }
};

const completeAgentProfile = async (deps, input) => {
  const { Agent, UploadCloud, DojahService, SendEmails, fs } = deps;
  const { user, body, files } = input;

  if (!user?._id) {
    throw new AppError('Unauthorized', 401);
  }

  const {
    nin,
    cacNumber,
    companyName,
    bvn,
    isAgreement,
    yearsOfExperience,
    description,
    dateOfBirth,
    nationality,
    city,
    address,
    firstName,
    lastName,
  } = body;

  const parsedAgreement = isAgreement === true || isAgreement === 'true';
  const parsedYears = Number(yearsOfExperience);

  if (!parsedAgreement) {
    throw new AppError('You must accept the terms and agreement', 400);
  }

  const agent = await Agent.findOne({ user: user._id });

  if (!agent) {
    throw new AppError('Agent profile not found', 404);
  }

  if (agent.status === 'approved') {
    throw new AppError('Agent profile is already complete and approved', 400);
  }

  const uploadedFiles = [];

  const fileUrls = {
    selfieUrl: null,
    ninSlipUrl: null,
    cacDocumentUrl: null,
  };

  try {
    const verifiedIdentity = await verifyAgentIdentity(
      { DojahService },
      {
        nin,
        cacNumber,
        firstName: firstName || agent.firstName,
        lastName: lastName || agent.lastName,
        companyName: companyName || agent.companyName,
      },
    );

    const fileFields = ['selfie', 'ninSlip', 'cacDoc'];

    for (const field of fileFields) {
      const fileArray = files?.[field];
      if (!fileArray || fileArray.length === 0) continue;

      const file = fileArray[0];
      if (!file?.path) continue;

      const result = await UploadCloud.upload(file.path, `rublist/agents/${field}`);

      uploadedFiles.push({
        public_id: result.public_id,
        resource_type: result.resource_type,
      });

      if (field === 'selfie') {
        fileUrls.selfieUrl = buildCloudinaryFile(UploadCloud, result);
      }

      if (field === 'ninSlip') {
        fileUrls.ninSlipUrl = buildCloudinaryFile(UploadCloud, result);
      }

      if (field === 'cacDoc') {
        fileUrls.cacDocumentUrl = buildCloudinaryFile(UploadCloud, result);
      }
    }

    if (nin) agent.nin = nin;
    if (cacNumber) agent.cacNumber = cacNumber;
    if (companyName) agent.companyName = companyName;
    if (bvn) agent.bvn = bvn;
    if (yearsOfExperience) agent.yearsOfExperience = parsedYears;
    if (description) agent.description = description;
    if (dateOfBirth) agent.dateOfBirth = dateOfBirth;
    if (nationality) agent.nationality = nationality;
    if (address) agent.address = address;
    if (firstName) agent.firstName = firstName;
    if (lastName) agent.lastName = lastName;
    if (city) agent.city = city;

    if (verifiedIdentity.kycStatus.ninVerified !== undefined) {
      agent.kycStatus.ninVerified = verifiedIdentity.kycStatus.ninVerified;
    }

    if (verifiedIdentity.kycStatus.cacVerified !== undefined) {
      agent.kycStatus.cacVerified = verifiedIdentity.kycStatus.cacVerified;
    }

    if (verifiedIdentity.verificationData.nin) {
      agent.verificationData.nin = verifiedIdentity.verificationData.nin;
    }

    if (verifiedIdentity.verificationData.cac) {
      agent.verificationData.cac = verifiedIdentity.verificationData.cac;
    }

    if (fileUrls.selfieUrl) agent.selfieUrl = fileUrls.selfieUrl;
    if (fileUrls.ninSlipUrl) agent.ninSlipUrl = fileUrls.ninSlipUrl;
    if (fileUrls.cacDocumentUrl) agent.cacDocumentUrl = fileUrls.cacDocumentUrl;

    agent.isAgreement = parsedAgreement;
    agent.status = 'approved';

    await agent.save();
    await agent.populate('user', 'email fullName roles _id phoneNumber profileImage');

    await SendEmails.sendAgentApprovalEmail(agent.user.email, agent.firstName);
    await SendEmails.sendAdminAgentNotification(agent);

    await cleanupUploadedFiles(fs, files);

    return {
      success: true,
      message: 'Agent profile submitted for review',
      data: agent,
    };
  } catch (error) {
    await Promise.all(
      uploadedFiles.map((file) => UploadCloud.delete(file.public_id, file.resource_type)),
    );

    await cleanupUploadedFiles(fs, files);

    throw error instanceof AppError
      ? error
      : new AppError(error.message || 'Something went wrong', 500);
  }
};

const updateAgent = async (deps, input) => {
  const { Agent, UploadCloud, DojahService, fs } = deps;
  const { user, body, files } = input;
  const { selfiePublicId, cacDocPublicId } = body;

  if (!user?._id) {
    throw new AppError('Unauthorized', 401);
  }

  const agent = await Agent.findOne({ user: user._id });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  const restrictedFields = ['nin', 'firstName', 'lastName', 'dateOfBirth'];

  for (const field of restrictedFields) {
    if (body[field]) {
      const err = new Error(`${field} cannot be updated`);
      err.statusCode = 400;
      throw err;
    }
  }

  const updatableFields = [
    'city',
    'address',
    'nationality',
    'cacNumber',
    'companyName',
    'yearsOfExperience',
    'description',
  ];

  const uploadedFiles = [];
  const oldFilesToDelete = [];

  try {
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        agent[field] = body[field];
      }
    }

    if (body.cacNumber) {
      const verifiedIdentity = await verifyAgentIdentity(
        { DojahService },
        {
          cacNumber: body.cacNumber,
          companyName: agent.companyName,
        },
      );

      agent.kycStatus.cacVerified = verifiedIdentity.kycStatus.cacVerified || false;
      agent.verificationData.cac = verifiedIdentity.verificationData.cac || null;
    }

    if (files?.selfie?.[0]) {
      const result = await UploadCloud.upload(files.selfie[0].path, 'rublist/agents/selfie');

      uploadedFiles.push({
        public_id: result.public_id,
        resource_type: result.resource_type,
      });

      oldFilesToDelete.push({
        public_id: selfiePublicId || agent.selfieUrl?.public_id,
        resource_type: agent.selfieUrl?.resource_type,
      });

      agent.selfieUrl = {
        ...buildCloudinaryFile(UploadCloud, result),
      };
    }

    if (files?.cacDoc?.[0]) {
      const result = await UploadCloud.upload(files.cacDoc[0].path, 'rublist/agents/cacDoc');

      uploadedFiles.push({
        public_id: result.public_id,
        resource_type: result.resource_type,
      });

      oldFilesToDelete.push({
        public_id: cacDocPublicId || agent.cacDocumentUrl?.public_id,
        resource_type: agent.cacDocumentUrl?.resource_type,
      });

      agent.cacDocumentUrl = {
        ...buildCloudinaryFile(UploadCloud, result),
      };
    }

    await agent.save();

    const deleteResults = await Promise.allSettled(
      oldFilesToDelete.map((file) =>
        deleteCloudinaryAsset(UploadCloud, file.public_id, file.resource_type),
      ),
    );

    deleteResults.forEach((result) => {
      if (result.status === 'rejected') {
        console.log('Old Cloudinary file delete failed:', result.reason.message);
      }
    });

    await cleanupUploadedFiles(fs, files);

    return {
      success: true,
      message: 'Agent updated successfully',
      data: agent,
    };
  } catch (error) {
    await Promise.all(
      uploadedFiles.map((file) => UploadCloud.delete(file.public_id, file.resource_type)),
    );

    await cleanupUploadedFiles(fs, files);
    throw error instanceof AppError
      ? error
      : new AppError(error.message || 'Failed to update agent', 500);
  }
};

const deleteAgent = async (deps, input) => {
  const { Agent, User, Property, Comment, UploadCloud } = deps;
  const { user } = input;

  if (!user?._id) {
    throw new AppError('Unauthorized', 401);
  }

  const agent = await Agent.findOne({ user: user._id });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  const isAdmin = user.roles.includes('Admin');
  const isOwner = agent.user.toString() === user._id.toString();

  if (!isAdmin && !isOwner) {
    throw new AppError('Forbidden: You do not have permission to delete this agent', 403);
  }

  const properties = await Property.find({ owner: agent._id });
  const propertyIds = properties.map((property) => property._id);
  const imagesToDelete = [];

  if (agent.selfieUrl?.public_id) {
    imagesToDelete.push(agent.selfieUrl.public_id);
  }

  if (agent.ninSlipUrl?.public_id) {
    imagesToDelete.push(agent.ninSlipUrl.public_id);
  }

  if (agent.cacDocumentUrl?.public_id) {
    imagesToDelete.push(agent.cacDocumentUrl.public_id);
  }

  properties.forEach((property) => {
    property.images?.forEach((image) => {
      if (image.public_id) {
        imagesToDelete.push(image.public_id);
      }
    });
  });

  try {
    await Promise.all(imagesToDelete.map((publicId) => UploadCloud.delete(publicId)));

    await Comment.deleteMany({
      property: { $in: propertyIds },
    });

    await Property.deleteMany({
      owner: agent._id,
    });

    await agent.deleteOne();

    await User.findByIdAndUpdate(user._id, {
      $pull: { roles: 'Agent' },
    });

    return {
      success: true,
      message: 'Agent and all related data deleted successfully',
    };
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(error.message || 'Failed to delete agent properly', 500);
  }
};

module.exports = {
  getMyAgent,
  getAgentByUserId,
  createAgent,
  completeAgentProfile,
  updateAgent,
  deleteAgent,
};
