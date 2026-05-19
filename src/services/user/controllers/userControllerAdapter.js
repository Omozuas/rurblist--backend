const asynchandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const fs = require('fs');

const User = require('../../../models/User');
const HomeSeeker = require('../../../models/HomeSeeker');
const Agent = require('../../../models/Agent');
const Property = require('../../../models/Property');
const SendEmails = require('../../email/emailService');
const { validateId } = require('../../../middleware/validateParams');
const ApiFeatures = require('../../../utils/query/userQuery');
const UploadCloud = require('../../../config/cloudinary');
const UserContract = require('../contracts/userContract');

module.exports = {
  getUsers: asynchandler(async (req, res) => {
    const result = await UserContract.getUsers(
      {
        User,
        ApiFeatures,
      },
      { query: req.query },
    );

    return res.status(200).json(result);
  }),

  getUserById: asynchandler(async (req, res) => {
    const result = await UserContract.getUserById(
      {
        User,
        HomeSeeker,
        Agent,
        validateId,
      },
      { id: req.params.id },
    );

    return res.status(200).json(result);
  }),

  updateUserById: asynchandler(async (req, res) => {
    const result = await UserContract.updateUserById(
      {
        User,
        HomeSeeker,
        UploadCloud,
        validateId,
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

  getCurrentUser: asynchandler(async (req, res) => {
    const result = await UserContract.getCurrentUser(
      {
        User,
        HomeSeeker,
        Agent,
        validateId,
      },
      { user: req.user },
    );

    return res.status(200).json(result);
  }),

  getSavedProperties: asynchandler(async (req, res) => {
    const result = await UserContract.getSavedProperties(
      {
        HomeSeeker,
        Agent,
        Property,
      },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  toggleSaveProperty: asynchandler(async (req, res) => {
    const result = await UserContract.toggleSaveProperty(
      {
        HomeSeeker,
        Agent,
        Property,
        validateId,
      },
      {
        user: req.user,
        propertyId: req.params.propertyId,
      },
    );

    return res.status(200).json(result);
  }),

  blockUserById: asynchandler(async (req, res) => {
    const result = await UserContract.blockUserById(
      {
        User,
        validateId,
      },
      { id: req.params.id },
    );

    return res.status(200).json(result);
  }),

  unblockUserById: asynchandler(async (req, res) => {
    const result = await UserContract.unblockUserById(
      {
        User,
        validateId,
      },
      { id: req.params.id },
    );

    return res.status(200).json(result);
  }),

  deleteUserById: asynchandler(async (req, res) => {
    const result = await UserContract.deleteUserById(
      {
        User,
        UploadCloud,
        validateId,
      },
      { id: req.params.id },
    );

    return res.status(200).json(result);
  }),

  deleteMyAccount: asynchandler(async (req, res) => {
    const result = await UserContract.deleteMyAccount(
      {
        User,
        UploadCloud,
        validateId,
      },
      { user: req.user },
    );

    return res.status(200).json(result);
  }),

  updateUserPassword: asynchandler(async (req, res) => {
    const result = await UserContract.updateUserPassword(
      {
        User,
        SendEmails,
        bcrypt,
        validateId,
      },
      {
        user: req.user,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),
};
