const asynchandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const SendEmails = require('../helper/email_sender');
const UploadCloud = require('../config/cloudnary');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Property = require('../models/Property');
const Comment = require('../models/Comment');
const validateId = require('../helper/validatemongodb');
const DojahService = require('../config/dojahService');

const cleanupUploadedFiles = async (files) => {
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

const deleteCloudinaryAsset = async (publicId, resourceType) => {
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

const buildCloudinaryFile = (result) => ({
  url: result.url,
  download_url: UploadCloud.getDownloadUrl(result.public_id, result.resource_type),
  public_id: result.public_id,
  resource_type: result.resource_type,
});

const normalizeName = (value = '') => value.trim().toLowerCase();

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const namesMatch = (inputName, verifiedName) =>
  normalizeName(inputName) === normalizeName(verifiedName);

const verifyAgentIdentity = async ({ nin, cacNumber, firstName, lastName, companyName }) => {
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

class AgentController {
  static createAgent = asynchandler(async (req, res) => {
    console.log('🔥 HIT CONTROLLER');

    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Unauthorized');
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
    } = req.body;

    const parsedYears = Number(yearsOfExperience);
    const parsedAgreement = isAgreement === true || isAgreement === 'true';

    if (!parsedAgreement) {
      res.status(400);
      throw new Error('You must accept the terms and agreement');
    }

    if (!firstName || !lastName) {
      res.status(400);
      throw new Error('Full name is required');
    }

    if (!nin) {
      res.status(400);
      throw new Error('NIN is required');
    }

    if (isNaN(parsedYears) || parsedYears < 0) {
      res.status(400);
      throw new Error('Valid years of experience is required');
    }

    if (!req.files?.selfie || !req.files?.ninSlip) {
      res.status(400);
      throw new Error('Required documents missing');
    }
    const existingUserAgent = await Agent.findOne({ user: user._id });

    if (existingUserAgent) {
      res.status(400);
      throw new Error('You already have an agent profile');
    }
    const existingAgent = await Agent.findOne({ nin });
    if (existingAgent) {
      res.status(400);
      throw new Error('Agent with this NIN already exists');
    }

    const fileFields = ['selfie', 'ninSlip', 'cacDoc'];
    const uploadedFiles = [];

    let fileUrls = {
      selfieUrl: null,
      ninSlipUrl: null,
      cacDocumentUrl: null,
    };

    let agent;

    try {
      const verifiedIdentity = await verifyAgentIdentity({
        nin,
        cacNumber,
        firstName,
        lastName,
        companyName,
      });

      // ===============================
      // 📂 UPLOAD FILES
      // ===============================
      for (const field of fileFields) {
        const fileArray = req.files?.[field];
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
          fileUrls.selfieUrl = buildCloudinaryFile(result);
        }

        if (field === 'ninSlip') {
          fileUrls.ninSlipUrl = buildCloudinaryFile(result);
        }

        if (field === 'cacDoc') {
          fileUrls.cacDocumentUrl = buildCloudinaryFile(result);
        }
      }

      // ===============================
      // 🧾 CREATE AGENT
      // ===============================
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
        status: 'approved', // 🔥 Move to review
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
      // ===============================
      // 👤 UPDATE USER
      // ===============================
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { roles: 'Agent' },
      });
      await User.findByIdAndUpdate(user._id, {
        $pull: { roles: 'Home_Seeker' },
      });
      await agent.populate('user', 'email fullName roles _id phoneNumber profileImage');
      // ===============================
      // 📧 EMAILS (non-critical)
      // ===============================
      try {
        const fullUser = await User.findById(user._id);

        if (fullUser?.email) {
          await SendEmails.sendAgentApplicationEmail(fullUser.email, firstName);
          await SendEmails.sendAgentApprovalEmail(fullUser.email, agent.firstName);
        }

        await SendEmails.sendAdminAgentNotification(agent);
      } catch (emailErr) {
        console.log('Email error:', emailErr.message);
        // ❗ don't fail request because of email
      }

      // ===============================
      // 🧹 CLEAN LOCAL FILES
      // ===============================
      await cleanupUploadedFiles(req.files);
      res.status(201).json({
        success: true,
        message: 'Agent application submitted successfully',
        data: agent,
      });
    } catch (error) {
      // 🔥 ROLLBACK CLOUDINARY
      await Promise.all(
        uploadedFiles.map((file) => UploadCloud.delete(file.public_id, file.resource_type)),
      );

      // ❗ OPTIONAL: rollback DB if agent was created
      if (agent) {
        await Agent.deleteOne({ _id: agent._id });
        await User.findByIdAndUpdate(user._id, {
          $pull: { roles: 'Agent' },
        });
      }
      await cleanupUploadedFiles(req.files);
      res.status(error.statusCode || 500);
      throw new Error(error.message || 'Something went wrong');
    }
  });

  static getMyAgent = asynchandler(async (req, res) => {
    const user = req.user;

    const agent = await Agent.findOne({ user: user._id }).populate(
      'user',
      'email fullName roles _id phoneNumber profileImage',
    );

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    res.status(200).json({
      success: true,
      data: agent,
    });
  });

  static updateAgent = asynchandler(async (req, res) => {
    const user = req.user;
    const { selfiePublicId, cacDocPublicId } = req.body;

    const agent = await Agent.findOne({ user: user._id });

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    // 🚫 BLOCK restricted fields
    const restrictedFields = ['nin', 'firstName', 'lastName', 'dateOfBirth'];

    for (const field of restrictedFields) {
      if (req.body[field]) {
        res.status(400);
        throw new Error(`${field} cannot be updated`);
      }
    }

    // ✅ Allowed updates
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
        if (req.body[field] !== undefined) {
          agent[field] = req.body[field];
        }
      }

      if (req.body.cacNumber) {
        const verifiedIdentity = await verifyAgentIdentity({
          cacNumber: req.body.cacNumber,
          companyName: agent.companyName,
        });

        agent.kycStatus.cacVerified = verifiedIdentity.kycStatus.cacVerified || false;
        agent.verificationData.cac = verifiedIdentity.verificationData.cac || null;
      }

      if (req.files?.selfie?.[0]) {
        const result = await UploadCloud.upload(req.files.selfie[0].path, 'rublist/agents/selfie');

        uploadedFiles.push({
          public_id: result.public_id,
          resource_type: result.resource_type,
        });

        oldFilesToDelete.push({
          public_id: selfiePublicId || agent.selfieUrl?.public_id,
          resource_type: agent.selfieUrl?.resource_type,
        });

        agent.selfieUrl = {
          ...buildCloudinaryFile(result),
        };
      }

      if (req.files?.cacDoc?.[0]) {
        const result = await UploadCloud.upload(req.files.cacDoc[0].path, 'rublist/agents/cacDoc');

        uploadedFiles.push({
          public_id: result.public_id,
          resource_type: result.resource_type,
        });

        oldFilesToDelete.push({
          public_id: cacDocPublicId || agent.cacDocumentUrl?.public_id,
          resource_type: agent.cacDocumentUrl?.resource_type,
        });

        agent.cacDocumentUrl = {
          ...buildCloudinaryFile(result),
        };
      }

      await agent.save();

      const deleteResults = await Promise.allSettled(
        oldFilesToDelete.map((file) => deleteCloudinaryAsset(file.public_id, file.resource_type)),
      );

      deleteResults.forEach((result) => {
        if (result.status === 'rejected') {
          console.log('Old Cloudinary file delete failed:', result.reason.message);
        }
      });

      await cleanupUploadedFiles(req.files);

      res.status(200).json({
        success: true,
        message: 'Agent updated successfully',
        data: agent,
      });
    } catch (error) {
      await Promise.all(
        uploadedFiles.map((file) => UploadCloud.delete(file.public_id, file.resource_type)),
      );

      await cleanupUploadedFiles(req.files);

      res.status(error.statusCode || 500);
      throw new Error(error.message || 'Failed to update agent');
    }
  });

  static deleteAgent = asynchandler(async (req, res) => {
    const user = req.user;

    // ✅ Find agent correctly
    const agent = await Agent.findOne({ user: user._id });

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    // 🔐 Authorization (self or admin)
    const isAdmin = user.roles.includes('Admin');
    const isOwner = agent.user.toString() === user._id.toString();

    if (!isAdmin && !isOwner) {
      res.status(403);
      throw new Error('Not authorized');
    }

    // ===============================
    // 🔥 GET ALL PROPERTIES
    // ===============================
    const properties = await Property.find({ owner: agent._id });

    const propertyIds = properties.map((p) => p._id);

    // ===============================
    // 🔥 COLLECT ALL IMAGES
    // ===============================
    const imagesToDelete = [];

    // Agent images
    if (agent.selfieUrl?.public_id) {
      imagesToDelete.push(agent.selfieUrl.public_id);
    }

    if (agent.ninSlipUrl?.public_id) {
      imagesToDelete.push(agent.ninSlipUrl.public_id);
    }

    if (agent.cacDocumentUrl?.public_id) {
      imagesToDelete.push(agent.cacDocumentUrl.public_id);
    }

    // Property images
    properties.forEach((property) => {
      property.images?.forEach((img) => {
        if (img.public_id) {
          imagesToDelete.push(img.public_id);
        }
      });
    });

    try {
      // ===============================
      // 🖼 DELETE ALL IMAGES
      // ===============================
      await Promise.all(imagesToDelete.map((public_id) => UploadCloud.delete(public_id)));

      // ===============================
      // 💬 DELETE COMMENTS
      // ===============================
      await Comment.deleteMany({
        property: { $in: propertyIds },
      });

      // ===============================
      // 🏠 DELETE PROPERTIES
      // ===============================
      await Property.deleteMany({
        owner: agent._id,
      });

      // ===============================
      // 👤 DELETE AGENT
      // ===============================
      await agent.deleteOne();

      // ===============================
      // 🔄 REMOVE ROLE FROM USER
      // ===============================
      await User.findByIdAndUpdate(user._id, {
        $pull: { roles: 'Agent' },
      });

      res.status(200).json({
        success: true,
        message: 'Agent and all related data deleted successfully',
      });
    } catch (error) {
      res.status(500);
      throw new Error(error.message || 'Failed to delete agent properly');
    }
  });

  static getAgentByUserId = asynchandler(async (req, res) => {
    const { userId } = req.params;
    validateId.validateMongodbId(userId);
    if (!userId) {
      res.status(400);
      throw new Error('User ID is required');
    }

    const agent = await Agent.findOne({ user: userId }).populate(
      'user',
      'email fullName  _id phoneNumber profileImage',
    );
    console.log('Agent found:', agent);
    if (!agent) {
      res.status(404);
      throw new Error('Agent not found for this user');
    }

    res.status(200).json({
      success: true,
      data: agent,
    });
  });

  static completeAgentProfile = asynchandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      res.status(401);
      throw new Error('Unauthorized');
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
    } = req.body;

    const parsedAgreement = isAgreement === true || isAgreement === 'true';
    const parsedYears = Number(yearsOfExperience);
    if (!parsedAgreement) {
      res.status(400);
      throw new Error('You must accept the terms and agreement');
    }

    const agent = await Agent.findOne({ user: user._id });

    if (!agent) {
      res.status(404);
      throw new Error('Agent profile not found');
    }

    if (agent.status === 'approved') {
      res.status(400);
      throw new Error('Agent already verified');
    }

    const uploadedFiles = [];

    let fileUrls = {
      selfieUrl: null,
      ninSlipUrl: null,
      cacDocumentUrl: null,
    };

    try {
      const verifiedIdentity = await verifyAgentIdentity({
        nin,
        cacNumber,
        firstName: firstName || agent.firstName,
        lastName: lastName || agent.lastName,
        companyName: companyName || agent.companyName,
      });

      const fileFields = ['selfie', 'ninSlip', 'cacDoc'];

      // 📂 Upload files
      for (const field of fileFields) {
        const fileArray = req.files?.[field];
        if (!fileArray || fileArray.length === 0) continue;

        const file = fileArray[0];
        if (!file?.path) continue;

        const result = await UploadCloud.upload(file.path, `rublist/agents/${field}`);

        uploadedFiles.push({
          public_id: result.public_id,
          resource_type: result.resource_type,
        });

        if (field === 'selfie') {
          fileUrls.selfieUrl = buildCloudinaryFile(result);
        }

        if (field === 'ninSlip') {
          fileUrls.ninSlipUrl = buildCloudinaryFile(result);
        }

        if (field === 'cacDoc') {
          fileUrls.cacDocumentUrl = buildCloudinaryFile(result);
        }
      }

      // 🧾 Update agent
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

      // ✅ AGREEMENT (IMPORTANT)
      agent.isAgreement = parsedAgreement;

      // 🔥 Move to review
      agent.status = 'approved';

      await agent.save();
      await agent.populate('user', 'email fullName roles _id phoneNumber profileImage');

      await SendEmails.sendAgentApprovalEmail(agent.user.email, agent.firstName);
      await SendEmails.sendAdminAgentNotification(agent);
      // 🧹 Clean local files
      await cleanupUploadedFiles(req.files);

      res.status(200).json({
        success: true,
        message: 'Agent profile submitted for review',
        data: agent,
      });
    } catch (error) {
      await Promise.all(
        uploadedFiles.map((file) => UploadCloud.delete(file.public_id, file.resource_type)),
      );

      await cleanupUploadedFiles(req.files);
      res.status(error.statusCode || 500);
      throw new Error(error.message || 'Something went wrong');
    }
  });

  /* static verifyAgent = asynchandler(async (req, res) => {
    const { agentId } = req.params;

    const agent = await Agent.findById(agentId).populate('agent');

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    // Prevent re-verification
    if (agent.status === 'approved') {
      res.status(400);
      throw new Error('Agent already approved');
    }

    let ninValid = false;
    let cacValid = false;

    // ===============================
    // 🔍 VERIFY NIN
    // ===============================
    if (agent.nin) {
      try {
        const ninData = await DojahService.verifyNIN(agent.nin);

        if (ninData?.isValid) {
          ninValid = true;
          agent.kycStatus.ninVerified = true;
          agent.verificationData.nin = ninData.data;
        } else {
          agent.kycStatus.ninVerified = false;
        }
      } catch (err) {
        res.status(400);
        console.log('NIN verification failed:', err.message);
        throw new Error(`NIN verification failed:${err.message}`);
      }
    }

    // ===============================
    // 🔍 VERIFY CAC (OPTIONAL)
    // ===============================
    if (agent.cacNumber) {
      try {
        const cacData = await DojahService.verifyCAC(agent.cacNumber);

        if (cacData?.isValid) {
          cacValid = true;
          agent.kycStatus.cacVerified = true;
          agent.verificationData.cac = cacData.data;
        } else {
          agent.kycStatus.cacVerified = false;
        }
      } catch (err) {
        res.status(400);
        console.log('CAC verification failed:', err.message);
        throw new Error(`CAC verification failed:${err.message}`);
      }
    }

    // ===============================
    // 🧠 DECISION ENGINE
    // ===============================
    if (ninValid) {
      agent.status = 'approved';

      // 📧 SEND APPROVAL EMAIL
      await SendEmails.sendAgentApprovalEmail(agent.agent.email, agent.firstName);
    } else {
      agent.status = 'rejected';

      // 📧 SEND REJECTION EMAIL
      await SendEmails.sendAgentRejectionEmail(agent.agent.email, agent.firstName);
    }

    await agent.save();

    res.status(200).json({
      success: true,
      data: {
        status: agent.status,
        kycStatus: agent.kycStatus,
      },
    });
  });*/
}

module.exports = AgentController;
