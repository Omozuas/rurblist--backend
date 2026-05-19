const AppError = require('../../../utils/AppError');

const buildCursorResult = (items, pagination) => {
  const hasNextPage = items.length > pagination.limit;
  const data = hasNextPage ? items.slice(0, pagination.limit) : items;
  const lastItem = data[data.length - 1];

  return {
    data,
    hasNextPage,
    nextCursor:
      hasNextPage && lastItem
        ? {
            value: lastItem[pagination.sortField],
            id: lastItem._id,
          }
        : null,
  };
};

const cleanupFiles = async (fs, files = []) => {
  const fileList = Array.isArray(files) ? files : Object.values(files || {}).flat();

  await Promise.all(
    fileList.map((file) =>
      file?.path ? fs.promises.unlink(file.path).catch(() => {}) : Promise.resolve(),
    ),
  );
};

const createHttpError = (message, statusCode = 400) => {
  return new AppError(message, statusCode);
};

const verifyBuyerNIN = async (DojahService, { nin }) => {
  const verifyResult = await DojahService.verifyNIN(nin);

  if (!verifyResult.success || !verifyResult.isValid) {
    throw createHttpError(
      verifyResult.error || 'NIN verification failed',
      verifyResult.statusCode || 400,
    );
  }

  const ninEntity = verifyResult.data?.entity;

  if (!ninEntity) {
    throw createHttpError('NIN verification returned no record');
  }

  return ninEntity;
};

const searchProperties = async (deps, input) => {
  const { Property, PropertySearch } = deps;
  const { query } = input;
  const baseQuery = {
    isAvailable: true,
  };

  const features = new PropertySearch(Property.find(baseQuery), query)
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
    ]);

  const fetchedProperties = await features.query.lean();
  const { data, hasNextPage, nextCursor } = buildCursorResult(
    fetchedProperties,
    features.pagination,
  );

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getMyProperties = async (deps, input) => {
  const { Agent, Property, PropertySearch } = deps;
  const { user, query } = input;

  const agent = await Agent.findOne({ user: user._id });

  if (!agent) {
    throw new AppError('You are not an agent', 403);
  }

  const baseQuery = {
    isAvailable: true,
    owner: agent._id,
  };

  const features = new PropertySearch(Property.find(baseQuery), query)
    .search()
    .filter()
    .sort()
    .limitFields()
    .cursorPaginate();

  const fetchedProperties = await features.query.lean();
  const { data, hasNextPage, nextCursor } = buildCursorResult(
    fetchedProperties,
    features.pagination,
  );

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getSingleProperty = async (deps, input) => {
  const { Property, Comment, mongoose, validateId } = deps;
  const { id, user, query } = input;
  const currentUserId = user ? user._id : null;
  const commentsLimit = Math.min(parseInt(query.commentsLimit) || 10, 50);
  const repliesLimit = Math.min(parseInt(query.repliesLimit) || 3, 20);

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
    throw new AppError('Property not available', 404);
  }

  const ownerAgentId = property.owner._id;

  const comments = await Comment.aggregate([
    {
      $match: {
        property: new mongoose.Types.ObjectId(id),
        parentComment: null,
      },
    },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: commentsLimit + 1 },
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
          { $limit: repliesLimit },
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
    { $sort: { createdAt: -1, _id: -1 } },
  ]);

  let hasMoreComments = false;

  if (comments.length > commentsLimit) {
    comments.pop();
    hasMoreComments = true;
  }

  property.comments = comments;
  property.hasMoreComments = hasMoreComments;
  property.commentsLimit = commentsLimit;
  property.repliesLimit = repliesLimit;

  return {
    success: true,
    data: property,
  };
};

const getPropertyBySlug = async (deps, input) => {
  const { Property } = deps;
  const { slug } = input;

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
    throw new AppError('Property not found', 404);
  }

  return {
    success: true,
    data: property,
  };
};

const getAgentsPropertiesById = async (deps, input) => {
  const { Agent, Property, PropertySearch, validateId } = deps;
  const { userId, query } = input;

  validateId.validateMongodbId(userId);

  const agent = await Agent.findOne({ user: userId });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  const features = new PropertySearch(
    Property.find({
      owner: agent._id,
      isAvailable: true,
    }),
    query,
  )
    .filter()
    .sort()
    .limitFields()
    .cursorPaginate();

  const fetchedProperties = await features.query.lean();
  const { data, hasNextPage, nextCursor } = buildCursorResult(
    fetchedProperties,
    features.pagination,
  );

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const likeProperty = async (deps, input) => {
  const { Property, validateId } = deps;
  const { id, user } = input;
  const userId = user._id;

  validateId.validateMongodbId(id);
  const property = await Property.exists({ _id: id });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const removedLike = await Property.updateOne(
    { _id: id, likes: userId },
    {
      $pull: { likes: userId },
      $inc: { likesCount: -1 },
    },
  );

  if (removedLike.modifiedCount > 0) {
    return {
      success: true,
      message: 'Like removed',
    };
  }

  await Property.updateOne(
    { _id: id, unlikes: userId },
    {
      $pull: { unlikes: userId },
      $inc: { unlikesCount: -1 },
    },
  );

  await Property.updateOne(
    { _id: id, likes: { $ne: userId } },
    {
      $addToSet: { likes: userId },
      $inc: { likesCount: 1 },
    },
  );

  return {
    success: true,
    message: 'Property liked',
  };
};

const unlikeProperty = async (deps, input) => {
  const { Property, validateId } = deps;
  const { id, user } = input;
  const userId = user._id;

  validateId.validateMongodbId(id);
  const property = await Property.exists({ _id: id });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const removedUnlike = await Property.updateOne(
    { _id: id, unlikes: userId },
    {
      $pull: { unlikes: userId },
      $inc: { unlikesCount: -1 },
    },
  );

  if (removedUnlike.modifiedCount > 0) {
    return {
      success: true,
      message: 'Unlike removed',
    };
  }

  await Property.updateOne(
    { _id: id, likes: userId },
    {
      $pull: { likes: userId },
      $inc: { likesCount: -1 },
    },
  );

  await Property.updateOne(
    { _id: id, unlikes: { $ne: userId } },
    {
      $addToSet: { unlikes: userId },
      $inc: { unlikesCount: 1 },
    },
  );

  return {
    success: true,
    message: 'Property unliked',
  };
};

const addComment = async (deps, input) => {
  const { Property, Comment, validateId } = deps;
  const { id, user, body } = input;
  const text = body.text?.trim();

  validateId.validateMongodbId(id);

  if (!text || text.length < 2) {
    throw new AppError('Comment must be at least 2 characters', 400);
  }

  const property = await Property.exists({
    _id: id,
    isAvailable: true,
  });

  if (!property) {
    throw new AppError('Property not available for comments', 404);
  }

  const comment = await Comment.create({
    property: id,
    user: user._id,
    text,
    parentComment: null,
  });

  await Promise.all([
    comment.populate('user', 'fullName profileImage'),
    Property.updateOne({ _id: id }, { $inc: { commentsCount: 1 } }),
  ]);

  return {
    success: true,
    data: comment,
  };
};

const addReply = async (deps, input) => {
  const { Property, Comment, validateId } = deps;
  const { commentId, user, body } = input;
  const text = body.text?.trim();

  validateId.validateMongodbId(commentId);

  if (!text || text.length < 2) {
    throw new AppError('Reply must be at least 2 characters', 400);
  }

  const parent = await Comment.findById(commentId).select('property');

  if (!parent) {
    throw new AppError('Parent comment not found', 404);
  }

  const reply = await Comment.create({
    property: parent.property,
    user: user._id,
    text,
    parentComment: parent._id,
  });

  await Promise.all([
    reply.populate('user', 'fullName profileImage'),
    Property.updateOne({ _id: parent.property }, { $inc: { commentsCount: 1 } }),
  ]);

  return {
    success: true,
    data: reply,
  };
};

const getCommentsByProperty = async (deps, input) => {
  const { Property, Comment, mongoose, validateId } = deps;
  const { propertyId, user, query } = input;
  const { cursor, limit = 10, replyLimit = 10 } = query;

  validateId.validateMongodbId(propertyId);

  const currentUserId = user ? user.id : null;
  let parsedCursor = null;

  try {
    parsedCursor = cursor ? JSON.parse(cursor) : null;
  } catch {
    throw new AppError('Invalid cursor format', 400);
  }

  const limitNum = Math.min(parseInt(limit) || 10, 50);
  const replyLimitNum = Math.min(parseInt(replyLimit) || 10, 50);

  const property = await Property.findById(propertyId).select('owner isAvailable');

  if (!property || !property.isAvailable) {
    throw new AppError('Property not available', 404);
  }

  const ownerAgentId = property.owner;

  const matchStage = {
    property: new mongoose.Types.ObjectId(propertyId),
    parentComment: null,
  };

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
    {
      $lookup: {
        from: 'users',
        localField: 'replies.user',
        foreignField: '_id',
        as: 'replies.user',
      },
    },
    { $unwind: { path: '$replies.user', preserveNullAndEmptyArrays: true } },
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
    {
      $addFields: {
        replies: { $slice: ['$replies', replyLimitNum] },
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
  ]);

  let nextCursor = null;

  if (comments.length > limitNum) {
    const nextItem = comments.pop();
    nextCursor = {
      value: nextItem.createdAt,
      id: nextItem._id,
    };
  }

  return {
    success: true,
    count: comments.length,
    hasMore: !!nextCursor,
    nextCursor,
    data: comments,
  };
};

const deleteProperty = async (deps, input) => {
  const { Agent, Property, Comment, UploadCloud, validateId } = deps;
  const { id, user } = input;

  validateId.validateMongodbId(id);

  const property = await Property.findById(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const agent = await Agent.findOne({ user: user._id });
  const isAdmin = user.roles.includes('Admin');

  if (!agent && !isAdmin) {
    throw new AppError('Not authorized', 403);
  }

  if (!isAdmin && property.owner.toString() !== agent._id.toString()) {
    throw new AppError('Not authorized to delete this property', 403);
  }

  if (property.images && property.images.length > 0) {
    await Promise.all(
      property.images.map(async (image) => {
        if (image.public_id) {
          await UploadCloud.delete(image.public_id);
        }
      }),
    );
  }

  await Comment.deleteMany({ property: id });
  await property.deleteOne();

  return {
    success: true,
    message: 'Property and related images deleted successfully',
  };
};

const createProperty = async (deps, input) => {
  const { Agent, Property, UploadCloud, fs, slugify } = deps;
  const { user, body, files } = input;
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
  } = body;
  const imageFiles = files?.images || [];
  let uploadedImages = [];

  const agent = await Agent.findOne({ user: user._id });

  if (!agent) {
    throw createHttpError('You are not an agent', 403);
  }

  if (!title || !description || !type || !status || !price) {
    throw createHttpError('Missing required property fields', 400);
  }

  const parsedPrice = Number(price);
  const parsedInspectionFee = Number(inspectionFee);
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (isNaN(parsedPrice) || isNaN(parsedInspectionFee)) {
    throw createHttpError('Invalid price or inspection fee', 400);
  }

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    throw createHttpError('Invalid coordinates', 400);
  }

  if (imageFiles.length < 3) {
    throw createHttpError('Minimum 3 property images required', 400);
  }

  if (imageFiles.length > 6) {
    throw createHttpError('Maximum 6 images allowed', 400);
  }

  const count = await Property.countDocuments({ owner: agent._id });

  if (count >= 50) {
    throw createHttpError('Property limit reached', 400);
  }

  try {
    uploadedImages = await Promise.all(
      imageFiles.map(async (file) => {
        const result = await UploadCloud.upload(file.path, 'rublist/properties');

        return {
          url: result.url,
          public_id: result.public_id,
        };
      }),
    );

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

    return {
      success: true,
      message: 'Property created successfully',
      property,
    };
  } catch (error) {
    await Promise.all(uploadedImages.map((img) => UploadCloud.delete(img.public_id)));
    throw error;
  } finally {
    await cleanupFiles(fs, files);
  }
};

const verifyBuyer = async (deps, input) => {
  const { Agent, HomeSeeker, Property, UploadCloud, DojahService, validateId, fs } = deps;
  const { id, user, body, files } = input;
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
    throw createHttpError('Unauthorized role or profile not found', 403);
  }

  if (profile.status === 'approved' && profile.kycStatus?.ninVerified === true) {
    return {
      success: true,
      message: 'Buyer already verified',
      data: profile,
    };
  }

  const nin = body?.nin?.trim();
  const ninFile = files?.nin?.[0] || files?.ninSlip?.[0];

  if (!nin) {
    throw createHttpError('NIN is required', 400);
  }

  if (nin.length !== 11) {
    throw createHttpError('Invalid NIN', 400);
  }

  if (!ninFile) {
    throw createHttpError('NIN image is required', 400);
  }

  validateId.validateMongodbId(id);

  const property = await Property.findById(id);

  if (!property) {
    throw createHttpError('Property not found', 404);
  }

  let uploaded = null;

  try {
    const ninVerificationData = await verifyBuyerNIN(DojahService, { nin });

    uploaded = await UploadCloud.upload(ninFile.path, `rublist/${roleFolder}/ninSlip`);

    profile.nin = nin;
    profile.ninSlipUrl = {
      url: uploaded.url,
      download_url: UploadCloud.getDownloadUrl(uploaded.public_id, uploaded.resource_type),
      public_id: uploaded.public_id,
      resource_type: uploaded.resource_type,
    };
    profile.kycStatus.ninVerified = true;
    profile.verificationData.nin = ninVerificationData;
    profile.status = 'approved';

    await profile.save();
  } catch (error) {
    if (uploaded?.public_id) {
      await UploadCloud.delete(uploaded.public_id, uploaded.resource_type);
    }

    throw error;
  } finally {
    await cleanupFiles(fs, [ninFile]);
  }

  if (roleFolder === 'homeseeker') {
    homeSeeker = profile;
  }

  if (roleFolder === 'agents') {
    agent = profile;
  }

  return {
    success: true,
    message: 'NIN submitted successfully',
    data: {
      homeSeeker,
      agent,
    },
  };
};

const updateProperty = async (deps, input) => {
  const { Agent, Property, UploadCloud, validateId, fs } = deps;
  const { id, user, body, files } = input;
  const { removedImagePublicIds } = body;
  const { address, city, state, country, lat, lng } = body;
  const uploadedImages = [];

  validateId.validateMongodbId(id);

  const property = await Property.findById(id);

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const agent = await Agent.findOne({ user: user._id });

  if (!agent) {
    throw new AppError('You are not an agent', 403);
  }

  if (agent.status !== 'approved') {
    throw new AppError('Agent not approved', 403);
  }

  if (property.owner.toString() !== agent._id.toString() && !user.roles.includes('Admin')) {
    throw new AppError('Not authorized', 403);
  }

  try {
    if (removedImagePublicIds && Array.isArray(removedImagePublicIds)) {
      const existingPublicIds = property.images.map((img) => img.public_id);

      for (const publicId of removedImagePublicIds) {
        if (existingPublicIds.includes(publicId)) {
          await UploadCloud.delete(publicId);
          property.images = property.images.filter((img) => img.public_id !== publicId);
        }
      }
    }

    const imageFiles = files?.images || [];

    if (imageFiles.length > 0) {
      const newImages = await Promise.all(
        imageFiles.map(async (file) => {
          const result = await UploadCloud.upload(file.path, 'rublist/properties');

          return {
            url: result.url,
            public_id: result.public_id,
          };
        }),
      );

      uploadedImages.push(...newImages);
      property.images.push(...newImages);
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
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        property[field] = body[field];
      }
    });

    const hasLocationUpdate =
      address !== undefined ||
      city !== undefined ||
      state !== undefined ||
      country !== undefined ||
      lat !== undefined ||
      lng !== undefined;

    if (hasLocationUpdate) {
      const currentLocation = property.location?.toObject?.() || property.location || {};

      property.location = {
        ...currentLocation,
        address: address ?? currentLocation.address,
        city: city ?? currentLocation.city,
        state: state ?? currentLocation.state,
        country: country ?? currentLocation.country,
      };

      if (lat !== undefined || lng !== undefined) {
        const parsedLat = Number(lat ?? currentLocation.coordinates?.coordinates?.[1]);
        const parsedLng = Number(lng ?? currentLocation.coordinates?.coordinates?.[0]);

        if (isNaN(parsedLat) || isNaN(parsedLng)) {
          throw new AppError('Invalid coordinates', 400);
        }

        property.location.coordinates = {
          type: 'Point',
          coordinates: [parsedLng, parsedLat],
        };
      } else if (currentLocation.coordinates?.coordinates) {
        property.location.coordinates = currentLocation.coordinates;
      }
    }

    await property.save();
  } catch (error) {
    await Promise.all(uploadedImages.map((img) => UploadCloud.delete(img.public_id)));
    throw error;
  } finally {
    await cleanupFiles(fs, files);
  }

  return {
    success: true,
    message: 'Property updated successfully',
    data: property,
  };
};

module.exports = {
  searchProperties,
  getMyProperties,
  getSingleProperty,
  getPropertyBySlug,
  getAgentsPropertiesById,
  likeProperty,
  unlikeProperty,
  addComment,
  addReply,
  getCommentsByProperty,
  deleteProperty,
  createProperty,
  verifyBuyer,
  updateProperty,
};
