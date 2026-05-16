const asynchandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');

const Agent = require('../../../models/Agent');
const User = require('../../../models/User');
const Property = require('../../../models/Property');
const Comment = require('../../../models/Comment');
const UploadCloud = require('../../../config/cloudinary');
const DojahService = require('../../../config/dojahService');
const SendEmails = require('../../email/emailService');
const { validateId } = require('../../../middleware/validateParams');
const AgentContract = require('../contracts/agentContract');

module.exports = {
  getMyAgent: asynchandler(async (req, res) => {
    const result = await AgentContract.getMyAgent({ Agent }, { user: req.user });
    return res.status(200).json(result);
  }),

  getAgentByUserId: asynchandler(async (req, res) => {
    const result = await AgentContract.getAgentByUserId(
      {
        Agent,
        validateId,
      },
      { userId: req.params.userId },
    );

    return res.status(200).json(result);
  }),

  createAgent: asynchandler(async (req, res) => {
    const result = await AgentContract.createAgent(
      {
        Agent,
        User,
        UploadCloud,
        DojahService,
        SendEmails,
        fs,
        path,
      },
      {
        user: req.user,
        body: req.body,
        files: req.files,
      },
    );

    return res.status(201).json(result);
  }),

  completeAgentProfile: asynchandler(async (req, res) => {
    const result = await AgentContract.completeAgentProfile(
      {
        Agent,
        UploadCloud,
        DojahService,
        SendEmails,
        fs,
      },
      {
        user: req.user,
        body: req.body,
        files: req.files,
      },
    );

    return res.status(200).json(result);
  }),

  updateAgent: asynchandler(async (req, res) => {
    const result = await AgentContract.updateAgent(
      {
        Agent,
        UploadCloud,
        DojahService,
        fs,
      },
      {
        user: req.user,
        body: req.body,
        files: req.files,
      },
    );

    return res.status(200).json(result);
  }),

  deleteAgent: asynchandler(async (req, res) => {
    const result = await AgentContract.deleteAgent(
      {
        Agent,
        User,
        Property,
        Comment,
        UploadCloud,
      },
      { user: req.user },
    );

    return res.status(200).json(result);
  }),
};
