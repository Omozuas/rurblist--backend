const asynchandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const SendEmails = require('../helper/email_sender');
const UploadCloud = require('../config/cloudnary');
const Agent = require('../models/Agent');
const User = require('../models/User');
const mongoose = require('mongoose');
// const DojahService = require('../config/dojahService');

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
      throw new Error('You must accept the terms and agreement');
    }

    if (!firstName || !lastName) {
      throw new Error('Full name is required');
    }

    if (!nin) {
      throw new Error('NIN is required');
    }

    if (isNaN(parsedYears) || parsedYears < 0) {
      throw new Error('Valid years of experience is required');
    }

    if (!req.files || !req.files.selfie) {
      throw new Error('Profile Image is required');
    }

    const existingAgent = await Agent.findOne({ nin });
    if (existingAgent) {
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
          fileUrls.selfieUrl = {
            url: result.url,
            public_id: result.public_id,
          };
        }

        if (field === 'ninSlip') {
          fileUrls.ninSlipUrl = {
            url: result.url,
            public_id: result.public_id,
          };
        }

        if (field === 'cacDoc') {
          fileUrls.cacDocumentUrl = {
            url: result.url,
            public_id: result.public_id,
          };
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
        agent: user._id,
        ...fileUrls,
      });
      await agent.populate('agent', 'email firstName lastName isAgent _id phoneNumber');
      // ===============================
      // 👤 UPDATE USER
      // ===============================
      await User.findByIdAndUpdate(user._id, {
        isAgent: true,
      });

      // ===============================
      // 📧 EMAILS (non-critical)
      // ===============================
      try {
        const fullUser = await User.findById(user._id);

        if (fullUser?.email) {
          await SendEmails.sendAgentApplicationEmail(fullUser.email, firstName);
        }

        await SendEmails.sendAdminAgentNotification(agent);
      } catch (emailErr) {
        console.log('Email error:', emailErr.message);
        // ❗ don't fail request because of email
      }

      // ===============================
      // 🧹 CLEAN LOCAL FILES
      // ===============================
      for (const field of Object.values(req.files)) {
        for (const file of field) {
          if (file?.path) {
            try {
              await fs.promises.unlink(file.path);
            } catch {}
          }
        }
      }

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
        await User.findByIdAndUpdate(user._id, { isAgent: false });
      }
      res.status(500);
      throw new Error(error.message || 'Something went wrong');
    }
  });

  static getMyAgent = asynchandler(async (req, res) => {
    const user = req.user;

    const agent = await Agent.findOne({ agent: user._id }).populate(
      'agent',
      'email fullName isAgent _id phoneNumber profileImage',
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

    const agent = await Agent.findOne({ agent: user._id });

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    // 🚫 BLOCK restricted fields
    const restrictedFields = ['nin', 'cacNumber'];

    for (const field of restrictedFields) {
      if (req.body[field]) {
        res.status(400);
        throw new Error(`${field} cannot be updated`);
      }
    }

    // ✅ Allowed updates
    const updatableFields = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'city',
      'address',
      'nationality',
      'companyName',
      'yearsOfExperience',
      'description',
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        agent[field] = req.body[field];
      }
    }

    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      data: agent,
    });
  });

  static deleteAgent = asynchandler(async (req, res) => {
    const user = req.user;

    const agent = await Agent.findOne({ agent: user._id });

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    const imagesToDelete = [];

    // Collect all Cloudinary public_ids safely
    if (agent.selfieUrl?.public_id) {
      imagesToDelete.push(agent.selfieUrl.public_id);
    }

    if (agent.ninSlipUrl?.public_id) {
      imagesToDelete.push(agent.ninSlipUrl.public_id);
    }

    if (agent.cacDocumentUrl?.public_id) {
      imagesToDelete.push(agent.cacDocumentUrl.public_id);
    }

    try {
      // 🔥 DELETE FROM CLOUDINARY
      await Promise.all(imagesToDelete.map((public_id) => UploadCloud.delete(public_id)));

      // 🗑️ DELETE FROM DB
      await agent.deleteOne();

      res.status(200).json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      res.status(500);
      throw new Error('Failed to delete agent properly');
    }
  });

  static getAgentByUserId = asynchandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      res.status(400);
      throw new Error('User ID is required');
    }

    const agent = await Agent.findOne({ agent: userId }).populate(
      'agent',
      'email fullName isAgent _id phoneNumber profileImage',
    );

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found for this user');
    }

    res.status(200).json({
      success: true,
      data: agent,
    });
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
