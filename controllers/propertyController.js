// controllers/property.controller.js
const asynchandler = require('express-async-handler');
const PropertySearch = require('../helper/propertyQueryDb');
const Property = require('../models/Property');
const Agent = require('../models/Agent');
const HomeSeeker = require('../models/HomeSeeker');
const Comment = require('../models/Comment');
const validateId = require('../helper/validatemongodb');
const UploadCloud = require('../config/cloudnary');
const slugify = require('slugify');
const fs = require('fs');
const mongoose = require('mongoose');
const DojahService = require('../config/dojahService');

const cleanupFiles = async (files = []) => {
  await Promise.all(
    files.map((file) =>
      file?.path ? fs.promises.unlink(file.path).catch(() => {}) : Promise.resolve(),
    ),
  );
};

class PropertyController {
  /*
     /api/properties?search=my big house or can search for anything
     /api/property?minPrice=20000000&maxPrice=35000000
     /api/properties?bedrooms[gte]=3
     /api/properties?lat=6.5244&lng=3.3792&radius=10
     /api/properties?sort=-trendingScore
     /api/properties?cursor=65f12ab...
     /api/properties?type=Duplex
     /api/properties?status=For_Sale
     /api/property?bathrooms[gte]=7
     /api/properties?location.city=Ikeja
     /api/properties?location.city=Ikeja
     /api/properties?sort=price
     /api/properties?sort=-price
     /api/properties?sort=-views
     /api/properties?sort=-views
     /api/properties?page=2&limit=12
     /api/properties?search=lekki
     &type=Duplex
     &price[gte]=2000000
     &bedrooms[gte]=4
     &location.state=Lagos
     &sort=-price
     &page=1
     &limit=10
    */
  static searchProperties = async (req, res) => {
    const baseQuery = {
      isAvailable: true,
      // verificationStatus: 'verified',
    };

    const features = new PropertySearch(Property.find(baseQuery), req.query)
      .search()
      .filter()
      .geoSearch()
      .sort()
      .limitFields()
      .cursorPaginate()
      .populate([
        {
          path: 'owner',
          populate: {
            path: 'user',
            select: 'fullName profileImage roles phoneNumber',
          },
        },
        {
          path: 'comments',
        },
      ]);

    const properties = await features.query.lean();

    // 🔥 COMMENT COUNT (temporary)
    const propertyIds = properties.map((p) => p._id);

    const commentsCount = await Comment.aggregate([
      { $match: { property: { $in: propertyIds } } },
      { $group: { _id: '$property', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    commentsCount.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const result = properties.map((property) => ({
      ...property,
      commentsCount: countMap[property._id.toString()] || 0,
    }));

    // ✅ cursor fix
    const sort = req.query.sort || '-createdAt';
    const sortField = sort.split(',')[0].replace('-', '');

    const lastItem = result[result.length - 1];

    const nextCursor = lastItem
      ? {
          value: lastItem[sortField],
          id: lastItem._id,
        }
      : null;

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
      nextCursor,
    });
  };

  static updateProperty = asynchandler(async (req, res) => {
    const { id } = req.params;
    const { removeImages } = req.body;
    const uploadedImages = [];

    validateId.validateMongodbId(id);
    const property = await Property.findById(id);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    const agent = await Agent.findOne({ user: req.user._id });

    if (!agent) {
      res.status(403);
      throw new Error('You are not an agent');
    }
    if (agent.status !== 'approved') {
      res.status(403);
      throw new Error('Agent not approved');
    }

    if (property.owner.toString() !== agent._id.toString() && !req.user.roles.includes('Admin')) {
      res.status(403);
      throw new Error('Not authorized');
    }

    try {
      if (removeImages && Array.isArray(removeImages)) {
        const existingPublicIds = property.images.map((img) => img.public_id);

        for (const publicId of removeImages) {
          if (existingPublicIds.includes(publicId)) {
            await UploadCloud.delete(publicId);
            property.images = property.images.filter((img) => img.public_id !== publicId);
          }
        }
      }

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await UploadCloud.upload(file.path, 'rublist/properties');

          const image = {
            url: result.url,
            public_id: result.public_id,
          };

          uploadedImages.push(image);
          property.images.push(image);
        }
      }

      const allowedFields = [
        'title',
        'description',
        'price',
        'bedrooms',
        'bathrooms',
        'type',
        'status',
        'size',
        'agentFee',
        'inspectionFee',
        'paymentFrequency',
        'furnishingStatus',
        'amenities',
        'location',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          property[field] = req.body[field];
        }
      });

      await property.save();
    } catch (error) {
      await Promise.all(uploadedImages.map((img) => UploadCloud.delete(img.public_id)));
      throw error;
    } finally {
      await cleanupFiles(req.files);
    }

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: property,
    });
  });
  static deleteProperty = asynchandler(async (req, res) => {
    const { id } = req.params;
    validateId.validateMongodbId(id);
    const property = await Property.findById(id);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }
    const agent = await Agent.findOne({ user: req.user._id });
    const isAdmin = req.user.roles.includes('Admin');

    if (!agent && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized');
    }

    // if (agent && agent.status !== 'approved') {
    //   res.status(403);
    //   throw new Error('Agent not approved');
    // }

    // 🔐 Authorization
    if (!isAdmin && property.owner.toString() !== agent._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this property');
    }

    // 🔥 1️⃣ Delete images from Cloudinary
    if (property.images && property.images.length > 0) {
      await Promise.all(
        property.images.map(async (img) => {
          if (img.public_id) {
            await UploadCloud.delete(img.public_id);
          }
        }),
      );
    }

    // 🔥 2️⃣ Delete related comments
    await Comment.deleteMany({ property: id });

    // 🔥 3️⃣ Delete property
    await property.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Property and related images deleted successfully',
    });
  });

  static unlikeProperty = asynchandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    validateId.validateMongodbId(id);
    const property = await Property.findById(id);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    const hasLiked = property.likes.some((uid) => uid.toString() === userId.toString());

    const hasUnliked = property.unlikes.some((uid) => uid.toString() === userId.toString());

    // 🔥 Toggle OFF unlike
    if (hasUnliked) {
      await Property.findByIdAndUpdate(id, {
        $pull: { unlikes: userId },
        $inc: { unlikesCount: -1 },
      });

      return res.status(200).json({
        success: true,
        message: 'Unlike removed',
      });
    }

    // 🔥 Remove like if exists
    if (hasLiked) {
      await Property.findByIdAndUpdate(id, {
        $pull: { likes: userId },
        $inc: { likesCount: -1 },
      });
    }

    // 🔥 Add unlike
    await Property.findByIdAndUpdate(id, {
      $addToSet: { unlikes: userId },
      $inc: { unlikesCount: 1 },
    });

    res.status(200).json({
      success: true,
      message: 'Property unliked',
    });
  });

  static likeProperty = asynchandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;
    validateId.validateMongodbId(id);
    const property = await Property.findById(id);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    const hasLiked = property.likes.some((uid) => uid.toString() === userId.toString());

    const hasUnliked = property.unlikes.some((uid) => uid.toString() === userId.toString());

    // 🔥 Toggle OFF like
    if (hasLiked) {
      await Property.findByIdAndUpdate(id, {
        $pull: { likes: userId },
        $inc: { likesCount: -1 },
      });

      return res.status(200).json({
        success: true,
        message: 'Like removed',
      });
    }

    // 🔥 Remove unlike if exists
    if (hasUnliked) {
      await Property.findByIdAndUpdate(id, {
        $pull: { unlikes: userId },
        $inc: { unlikesCount: -1 },
      });
    }

    // 🔥 Add like
    await Property.findByIdAndUpdate(id, {
      $addToSet: { likes: userId },
      $inc: { likesCount: 1 },
    });

    res.status(200).json({
      success: true,
      message: 'Property liked',
    });
  });

  static addReply = asynchandler(async (req, res) => {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length < 2) {
      res.status(400);
      throw new Error('Reply must be at least 2 characters');
    }

    const parent = await Comment.findById(commentId);

    if (!parent) {
      res.status(404);
      throw new Error('Parent comment not found');
    }

    // ❗ prevent deep nesting (optional)
    // if (parent.parentComment) {
    //   res.status(400);
    //   throw new Error('Cannot reply to a reply');
    // }

    const reply = await Comment.create({
      property: parent.property,
      user: req.user._id,
      text: text.trim(),
      parentComment: parent._id,
    });

    await reply.populate('user', 'fullName profileImage');

    // 🔥 increment comment count
    await Property.findByIdAndUpdate(parent.property, {
      $inc: { commentsCount: 1 },
    });

    res.status(201).json({
      success: true,
      data: reply,
    });
  });

  static addComment = asynchandler(async (req, res) => {
    const { id } = req.params;

    const { text } = req.body;

    validateId.validateMongodbId(id);

    if (!text || text.trim().length < 2) {
      res.status(400);
      throw new Error('Comment must be at least 2 characters');
    }

    const property = await Property.findById(id);

    if (!property || !property.isAvailable) {
      res.status(404);
      throw new Error('Property not available for comments');
    }

    const comment = await Comment.create({
      property: id,
      user: req.user.id,
      text: text.trim(),
      parentComment: null,
    });
    await comment.populate('user', 'fullName profileImage');

    // 🔥 increment comment count
    await Property.findByIdAndUpdate(id, {
      $inc: { commentsCount: 1 },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  });

  static getReplies = asynchandler(async (req, res) => {
    const { commentId } = req.params;
    const { page = 1, limit = 5 } = req.query;

    validateId.validateMongodbId(commentId);

    const parent = await Comment.findById(commentId);

    if (!parent) {
      res.status(404);
      throw new Error('Comment not found');
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 5, 50);
    const skip = (pageNum - 1) * limitNum;

    const replies = await Comment.find({
      parentComment: commentId,
    })
      .populate('user', 'fullName profileImage roles')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Comment.countDocuments({
      parentComment: commentId,
    });

    const hasMore = skip + replies.length < total;

    res.status(200).json({
      success: true,
      count: replies.length,
      total,
      page: pageNum,
      hasMore,
      data: replies,
    });
  });
  /* static getReplies = asynchandler(async (req, res) => {
    const { commentId } = req.params;
    let { page = 1, limit = 5 } = req.query;

    validateId.validateMongodbId(commentId);

    const parent = await Comment.findById(commentId);
    if (!parent) {
      res.status(404);
      throw new Error('Comment not found');
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 50) || 5;
    const skip = (pageNum - 1) * limitNum;

    // 🔥 STEP 1: Get ALL comments under same property
    const allComments = await Comment.find({
      property: parent.property,
    })
      .select('_id parentComment createdAt')
      .lean();

    // 🔥 STEP 2: Build parent -> children map
    const childrenMap = new Map();

    allComments.forEach((c) => {
      const parentId = c.parentComment?.toString();
      if (!parentId) return;

      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }

      childrenMap.get(parentId).push(c._id.toString());
    });

    // 🔥 STEP 3: Recursively collect all descendant IDs
    const getAllDescendants = (id) => {
      let result = [];

      const children = childrenMap.get(id) || [];

      for (const childId of children) {
        result.push(childId);
        result = result.concat(getAllDescendants(childId));
      }

      return result;
    };

    const allReplyIds = getAllDescendants(commentId);

    // ❗ If no replies
    if (allReplyIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: pageNum,
        hasMore: false,
        data: [],
      });
    }

    // 🔥 STEP 4: Use your SAME pagination logic
    const query = {
      _id: { $in: allReplyIds.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    const [replies, total] = await Promise.all([
      Comment.find(query)
        .populate('user', 'fullName profileImage roles')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Comment.countDocuments(query),
    ]);

    const hasMore = skip + replies.length < total;

    res.status(200).json({
      success: true,
      count: replies.length,
      total,
      page: pageNum,
      hasMore,
      data: replies,
    });
  }); */

  /*GET /api/property/69b316fc2c8fd1f441fc01f8/comments?replyLimit=3&replyPage=1*/
  static getCommentsByProperty = asynchandler(async (req, res) => {
    const { propertyId } = req.params;
    const { cursor, limit = 10, replyLimit = 10 } = req.query;

    validateId.validateMongodbId(propertyId);

    const currentUserId = req.user ? req.user.id : null;

    // ✅ Safe cursor parsing
    let parsedCursor = null;
    try {
      parsedCursor = cursor ? JSON.parse(cursor) : null;
    } catch {
      res.status(400);
      throw new Error('Invalid cursor format');
    }

    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const replyLimitNum = Math.min(parseInt(replyLimit) || 10, 50);

    const property = await Property.findById(propertyId).select('owner isAvailable');

    if (!property || !property.isAvailable) {
      res.status(404);
      throw new Error('Property not available');
    }

    const ownerAgentId = property.owner;

    const matchStage = {
      property: new mongoose.Types.ObjectId(propertyId),
      parentComment: null,
    };

    // ✅ Cursor pagination
    if (parsedCursor) {
      matchStage.$or = [
        { createdAt: { $lt: new Date(parsedCursor.value) } },
        {
          createdAt: new Date(parsedCursor.value),
          _id: { $lt: new mongoose.Types.ObjectId(parsedCursor.id) },
        },
      ];
    }

    const comments = await Comment.aggregate([
      { $match: matchStage },

      { $sort: { createdAt: -1, _id: -1 } },

      { $limit: limitNum + 1 },

      // ✅ Populate parent user
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // ✅ Populate agent
      {
        $lookup: {
          from: 'agents',
          localField: 'user._id',
          foreignField: 'user',
          as: 'agent',
        },
      },

      // ✅ Clean parent user
      {
        $project: {
          text: 1,
          createdAt: 1,
          property: 1,
          parentComment: 1,

          user: {
            _id: '$user._id',
            fullName: '$user.fullName',
            profileImage: '$user.profileImage',
            phoneNumber: '$user.phoneNumber',
            roles: '$user.roles',
          },

          agentId: { $arrayElemAt: ['$agent._id', 0] },
        },
      },

      // 🔥 GET ALL REPLIES (ALL LEVELS FLAT)
      {
        $graphLookup: {
          from: 'comments',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentComment',
          as: 'replies',
          depthField: 'depth',
        },
      },

      { $unwind: { path: '$replies', preserveNullAndEmptyArrays: true } },

      // ✅ Populate reply users
      {
        $lookup: {
          from: 'users',
          localField: 'replies.user',
          foreignField: '_id',
          as: 'replies.user',
        },
      },
      { $unwind: { path: '$replies.user', preserveNullAndEmptyArrays: true } },

      // 🔥 CLEAN replies (THIS FIXES YOUR ISSUE)
      {
        $project: {
          text: 1,
          createdAt: 1,
          property: 1,
          parentComment: 1,

          user: 1,
          agentId: 1,

          reply: {
            _id: '$replies._id',
            text: '$replies.text',
            createdAt: '$replies.createdAt',
            parentComment: '$replies.parentComment',
            user: {
              _id: '$replies.user._id',
              fullName: '$replies.user.fullName',
              profileImage: '$replies.user.profileImage',
              phoneNumber: '$replies.user.phoneNumber',
              roles: '$replies.user.roles',
            },
          },
        },
      },

      // ✅ Group back replies
      {
        $group: {
          _id: '$_id',
          text: { $first: '$text' },
          createdAt: { $first: '$createdAt' },
          property: { $first: '$property' },
          parentComment: { $first: '$parentComment' },

          user: { $first: '$user' },
          agentId: { $first: '$agentId' },

          replies: { $push: '$reply' },
        },
      },

      // ✅ Remove null replies
      {
        $addFields: {
          replies: {
            $filter: {
              input: '$replies',
              as: 'r',
              cond: { $ne: ['$$r._id', null] },
            },
          },
        },
      },

      // ✅ Apply reply limit
      {
        $addFields: {
          replies: { $slice: ['$replies', replyLimitNum] },
        },
      },

      // ✅ Flags
      {
        $addFields: {
          isOwnerComment: {
            $eq: ['$agentId', ownerAgentId],
          },
          isCurrentUser: {
            $eq: ['$user._id', currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null],
          },
        },
      },
    ]);

    // ✅ Cursor logic
    let nextCursor = null;

    if (comments.length > limitNum) {
      const nextItem = comments.pop();

      nextCursor = {
        value: nextItem.createdAt,
        id: nextItem._id,
      };
    }

    const hasMore = !!nextCursor;

    res.status(200).json({
      success: true,
      count: comments.length,
      hasMore,
      nextCursor,
      data: comments,
    });
  });

  static getMyProperties = asynchandler(async (req, res) => {
    const userId = req.user._id;

    const agent = await Agent.findOne({ user: userId });

    if (!agent) {
      res.status(403);
      throw new Error('You are not an agent');
    }
    const baseQuery = {
      isAvailable: true,
      owner: agent._id,
      // verificationStatus: 'verified',
    };

    const features = new PropertySearch(Property.find(baseQuery), req.query)
      .search()
      .filter()
      .sort()
      .limitFields()
      .cursorPaginate();
    const properties = await features.query.lean();

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  });

  static getSingleProperty = asynchandler(async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    validateId.validateMongodbId(id);

    const property = await Property.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { returnDocument: 'after' },
    )
      .populate({
        path: 'owner',
        populate: {
          path: 'user',
          select: 'fullName profileImage roles phoneNumber',
        },
      })
      .lean();

    if (!property || property.isDeleted || !property.isAvailable) {
      res.status(404);
      throw new Error('Property not available');
    }

    const ownerAgentId = property.owner._id;

    const comments = await Comment.aggregate([
      {
        $match: {
          property: new mongoose.Types.ObjectId(id),
          parentComment: null,
        },
      },

      // user
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // agent lookup
      {
        $lookup: {
          from: 'agents',
          localField: 'user._id',
          foreignField: 'user',
          as: 'agent',
        },
      },

      {
        $project: {
          text: 1,
          property: 1,
          parentComment: 1,
          createdAt: 1,

          'user._id': 1,
          'user.fullName': 1,
          'user.profileImage': 1,
          'user.roles': 1,
          'user.phoneNumber': 1,

          agentId: { $arrayElemAt: ['$agent._id', 0] },
        },
      },

      // replies
      {
        $lookup: {
          from: 'comments',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$parentComment', '$$commentId'] },
              },
            },

            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: '$user' },

            {
              $project: {
                text: 1,
                createdAt: 1,

                'user._id': 1,
                'user.fullName': 1,
                'user.profileImage': 1,
                'user.roles': 1,
                'user.phoneNumber': 1,
              },
            },

            { $sort: { createdAt: 1 } },
          ],
          as: 'replies',
        },
      },

      {
        $addFields: {
          isOwnerComment: {
            $eq: ['$agentId', ownerAgentId],
          },
          isCurrentUser: {
            $eq: ['$user._id', currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null],
          },
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    property.comments = comments;

    res.status(200).json({
      success: true,
      data: property,
    });
  });

  static getPropertyBySlug = asynchandler(async (req, res) => {
    const { slug } = req.params;

    const property = await Property.findOne({ slug })
      .populate({
        path: 'owner',
        populate: {
          path: 'user',
          select: 'fullName profileImage roles phoneNumber',
        },
      })
      .lean();

    if (!property || property.isDeleted || !property.isAvailable) {
      res.status(404);
      throw new Error('Property not found');
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  });

  static getAgentsPropertiesById = asynchandler(async (req, res) => {
    const userId = req.params.id;
    console.log('Agent ID:', userId);
    validateId.validateMongodbId(userId);

    const agent = await Agent.findOne({ user: userId });

    if (!agent) {
      res.status(404);
      throw new Error('Agent not found');
    }

    // if (agent.status !== 'approved') {
    //   res.status(403);
    //   throw new Error('Agent is not approved');
    // }

    const features = new PropertySearch(
      Property.find({
        owner: agent._id,
        // isDeleted: false,
        isAvailable: true,
      }),
      req.query,
    )
      .filter()
      .sort()
      .limitFields()
      .cursorPaginate();
    const properties = await features.query.lean();

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  });

  static createProperty = asynchandler(async (req, res) => {
    const {
      title,
      description,
      type,
      status,
      price,
      bedrooms,
      bathrooms,
      size,
      agentFee,
      inspectionFee,
      amenities,
      furnishingStatus,
      paymentFrequency,
      address,
      city,
      state,
      country,
      lat,
      lng,
    } = req.body;

    // ✅ Agent check
    const agent = await Agent.findOne({ user: req.user._id });

    if (!agent) {
      res.status(403);
      throw new Error('You are not an agent');
    }

    // if (agent.status !== 'approved') {
    //   res.status(403);
    //   throw new Error('Agent not approved');
    // }
    // ===============================
    // ✅ Basic Required Validation
    // ===============================

    if (!title || !description || !type || !status || !price) {
      res.status(400);
      throw new Error('Missing required property fields');
    }

    // ✅ Numbers
    const parsedPrice = Number(price);
    const parsedInspectionFee = Number(inspectionFee);
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (isNaN(parsedPrice) || isNaN(parsedInspectionFee)) {
      res.status(400);
      throw new Error('Invalid price or inspection fee');
    }

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      res.status(400);
      throw new Error('Invalid coordinates');
    }

    // Validate images exist

    if (!req.files || req.files.length < 3) {
      res.status(400);
      throw new Error('Minimum 3 property images required');
    }
    if (req.files.length > 6) {
      res.status(400);
      throw new Error('Maximum 6 images allowed');
    }

    // ✅ Property limit
    const count = await Property.countDocuments({ owner: agent._id });

    if (count >= 50) {
      res.status(400);
      throw new Error('Property limit reached');
    }

    // ===============================
    // 🖼 Upload Images to Cloudinary
    // ===============================
    let uploadedImages = [];

    try {
      for (const file of req.files) {
        const result = await UploadCloud.upload(file.path, 'rublist/properties');

        uploadedImages.push({
          url: result.url,
          public_id: result.public_id,
        });
      }
      // ===============================
      // 🏗 Create Property Document
      // ===============================
      const property = await Property.create({
        title,
        description,
        type,
        status,
        furnishingStatus,
        price: parsedPrice,
        bedrooms,
        bathrooms,
        size,
        agentFee,
        inspectionFee: parsedInspectionFee,
        paymentFrequency,
        slug: `${slugify(title, { lower: true, strict: true })}-${Date.now()}`,
        amenities,
        location: {
          address,
          city,
          state,
          country,
          coordinates: {
            type: 'Point',
            coordinates: [parsedLng, parsedLat],
          },
        },

        images: uploadedImages,
        owner: agent._id,
        isAvailable: true,
      });

      res.status(201).json({
        success: true,
        message: 'Property created successfully',
        property,
      });
    } catch (error) {
      // delete already uploaded images
      await Promise.all(uploadedImages.map((img) => UploadCloud.delete(img.public_id)));
      res.status(500);
      throw new Error(error.message || 'Failed to create property');
    } finally {
      await cleanupFiles(req.files);
    }
  });

  static verfyBuyer = asynchandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    let homeSeeker = null;
    let agent = null;
    let profile = null;
    let roleFolder = null;

    if (user.roles.includes('Home_Seeker')) {
      homeSeeker = await HomeSeeker.findOne({ user: user._id });
    }

    if (user.roles.includes('Agent')) {
      agent = await Agent.findOne({ user: user._id });
    }

    if (homeSeeker) {
      profile = homeSeeker;
      roleFolder = 'homeseeker';
    } else if (agent) {
      profile = agent;
      roleFolder = 'agents';
    }

    if (!profile) {
      res.status(403);
      throw new Error('Unauthorized role or profile not found');
    }

    if (profile.status === 'approved' && profile.kycStatus?.ninVerified === true) {
      return res.status(200).json({
        success: true,
        message: 'Buyer already verified',
        data: profile,
      });
    }

    const nin = req.body?.nin?.trim();
    const ninFile = req.files?.nin?.[0] || req.files?.ninSlip?.[0];

    if (!nin) {
      res.status(400);
      throw new Error('NIN is required');
    }
    if (nin.length !== 11) {
      res.status(400);
      throw new Error('Invalid NIN');
    }

    if (!ninFile) {
      res.status(400);
      throw new Error('NIN image is required');
    }

    validateId.validateMongodbId(id);
    const property = await Property.findById(id);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    /*
    const verifyResult = await DojahService.verifyNIN(nin);

    if (!verifyResult.success) {
      res.status(400);
      throw new Error('NIN verification failed');
    }

    if (!verifyResult.isValid) {
      res.status(400);
      throw new Error('NIN is not valid');
    }
*/
    let uploaded = null;

    try {
      uploaded = await UploadCloud.upload(ninFile.path, `rublist/${roleFolder}/ninSlip`);

      profile.nin = nin;
      profile.ninSlipUrl = {
        url: uploaded.url,
        public_id: uploaded.public_id,
      };
      profile.kycStatus.ninVerified = true;
      // profile.verificationData.nin = verifyResult.data;
      // profile.status = 'approved';
      profile.status = 'under_review';

      await profile.save();
    } catch (error) {
      if (uploaded?.public_id) {
        await UploadCloud.delete(uploaded.public_id, uploaded.resource_type);
      }

      throw error;
    } finally {
      await cleanupFiles([ninFile]);
    }

    if (roleFolder === 'homeseeker') homeSeeker = profile;
    if (roleFolder === 'agents') agent = profile;

    return res.status(200).json({
      success: true,
      message: 'NIN submitted successfully',
      data: {
        homeSeeker,
        agent,
      },
    });
  });
}

module.exports = PropertyController;


