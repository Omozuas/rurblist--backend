const asynchandler = require('express-async-handler');
const fs = require('fs');
const mongoose = require('mongoose');
const slugify = require('slugify');

const Agent = require('../../../models/Agent');
const Comment = require('../../../models/Comment');
const HomeSeeker = require('../../../models/HomeSeeker');
const Property = require('../../../models/Property');
const DojahService = require('../../../config/dojahService');
const UploadCloud = require('../../../config/cloudinary');
const PropertySearch = require('../../../utils/query/propertyQuery');
const { validateId } = require('../../../middleware/validateParams');
const PropertyContract = require('../contracts/propertyContract');

module.exports = {
  searchProperties: asynchandler(async (req, res) => {
    const result = await PropertyContract.searchProperties(
      {
        Property,
        PropertySearch,
      },
      { query: req.query },
    );

    return res.status(200).json(result);
  }),

  getMyProperties: asynchandler(async (req, res) => {
    const result = await PropertyContract.getMyProperties(
      {
        Agent,
        Property,
        PropertySearch,
      },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getSingleProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.getSingleProperty(
      {
        Property,
        Comment,
        mongoose,
        validateId,
      },
      {
        id: req.params.id,
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getPropertyBySlug: asynchandler(async (req, res) => {
    const result = await PropertyContract.getPropertyBySlug(
      { Property },
      { slug: req.params.slug },
    );

    return res.status(200).json(result);
  }),

  getAgentsPropertiesById: asynchandler(async (req, res) => {
    const result = await PropertyContract.getAgentsPropertiesById(
      {
        Agent,
        Property,
        PropertySearch,
        validateId,
      },
      {
        userId: req.params.id,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  likeProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.likeProperty(
      {
        Property,
        validateId,
      },
      {
        id: req.params.id,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  unlikeProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.unlikeProperty(
      {
        Property,
        validateId,
      },
      {
        id: req.params.id,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  addComment: asynchandler(async (req, res) => {
    const result = await PropertyContract.addComment(
      {
        Property,
        Comment,
        validateId,
      },
      {
        id: req.params.id,
        user: req.user,
        body: req.body,
      },
    );

    return res.status(201).json(result);
  }),

  addReply: asynchandler(async (req, res) => {
    const result = await PropertyContract.addReply(
      {
        Property,
        Comment,
        validateId,
      },
      {
        commentId: req.params.commentId,
        user: req.user,
        body: req.body,
      },
    );

    return res.status(201).json(result);
  }),

  getCommentsByProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.getCommentsByProperty(
      {
        Property,
        Comment,
        mongoose,
        validateId,
      },
      {
        propertyId: req.params.propertyId,
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  deleteProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.deleteProperty(
      {
        Agent,
        Property,
        Comment,
        UploadCloud,
        validateId,
      },
      {
        id: req.params.id,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  createProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.createProperty(
      {
        Agent,
        Property,
        UploadCloud,
        fs,
        slugify,
      },
      {
        user: req.user,
        body: req.body,
        files: req.files,
      },
    );

    return res.status(201).json(result);
  }),

  verifyBuyer: asynchandler(async (req, res) => {
    const result = await PropertyContract.verifyBuyer(
      {
        Agent,
        HomeSeeker,
        Property,
        UploadCloud,
        DojahService,
        validateId,
        fs,
      },
      {
        id: req.params.id,
        user: req.user,
        body: req.body,
        files: req.files,
      },
    );

    return res.status(200).json(result);
  }),

  updateProperty: asynchandler(async (req, res) => {
    const result = await PropertyContract.updateProperty(
      {
        Agent,
        Property,
        UploadCloud,
        validateId,
        fs,
      },
      {
        id: req.params.id,
        user: req.user,
        body: req.body,
        files: req.files,
      },
    );

    return res.status(200).json(result);
  }),
};
