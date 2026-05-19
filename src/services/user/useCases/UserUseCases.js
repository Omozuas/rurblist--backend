const AppError = require('../../../utils/AppError');

const getProfileModelFromRoles = (deps, roles = []) => {
  const { HomeSeeker, Agent } = deps;

  if (roles.includes('Home_Seeker')) return HomeSeeker;
  if (roles.includes('Agent')) return Agent;
  return null;
};

const buildSavedPropertyCursorFilter = (cursor) => {
  if (!cursor) return {};

  try {
    const parsed = JSON.parse(cursor);

    return {
      $or: [
        { createdAt: { $lt: new Date(parsed.value) } },
        {
          createdAt: new Date(parsed.value),
          _id: { $lt: parsed.id },
        },
      ],
    };
  } catch {
    throw new AppError('Invalid cursor format', 400);
  }
};

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

const getCurrentUser = async (deps, input) => {
  const { User, HomeSeeker, Agent, validateId } = deps;
  const { user: authUser } = input;

  if (!authUser?._id) {
    throw new AppError('User not authenticated', 401);
  }

  validateId.validateMongodbId(authUser._id);

  const user = await User.findById(authUser._id).select(
    'fullName username profileImage roles phoneNumber email isLogin username',
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  let agent = null;
  let homeSeeker = null;

  if (user.roles.includes('Home_Seeker')) {
    homeSeeker = await HomeSeeker.findOne({ user: authUser._id }).populate('savedProperties');
  }

  if (user.roles.includes('Agent')) {
    agent = await Agent.findOne({ user: authUser._id }).populate('savedProperties');
  }

  return {
    success: true,
    data: {
      user,
      homeSeeker,
      agent,
    },
  };
};

const getUsers = async (deps, input) => {
  const { User, ApiFeatures } = deps;
  const { query } = input;

  const features = new ApiFeatures(User.find(), query)
    .search(['fullName', 'username', 'email', 'phoneNumber'])
    .filter()
    .sort()
    .limitFields()
    .cursorPaginate()
    .populate(['address', 'savedProperties']);

  const fetchedUsers = await features.query.lean();
  const { data, hasNextPage, nextCursor } = buildCursorResult(
    fetchedUsers,
    features.pagination,
  );

  return {
    success: true,
    count: data.length,
    users: data,
    hasNextPage,
    nextCursor,
  };
};

const getUserById = async (deps, input) => {
  const { User, HomeSeeker, Agent, validateId } = deps;
  const { id } = input;

  validateId.validateMongodbId(id);

  const user = await User.findById(id).select(
    'fullName username profileImage roles phoneNumber email isLogin username',
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const profiles = {};

  if (user.roles.includes('Home_Seeker')) {
    profiles.homeSeeker = await HomeSeeker.findOne({ user: id }).select(
      'preferredLocations budget status kycStatus address',
    );
  }

  if (user.roles.includes('Agent')) {
    profiles.agent = await Agent.findOne({ user: id }).select(
      'firstName lastName status description address kycStatus',
    );
  }

  return {
    success: true,
    data: { user, profiles },
  };
};

const unlinkIfExists = async (fs, filePath) => {
  if (filePath) {
    await fs.promises.unlink(filePath);
  }
};

const updateUserById = async (deps, input) => {
  const { User, HomeSeeker, UploadCloud, validateId, fs } = deps;
  const { user: authUser, body, files } = input;

  if (!authUser?._id) {
    throw new AppError('User not authenticated', 401);
  }

  validateId.validateMongodbId(authUser._id);

  const user = await User.findById(authUser._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  let imageUrl = user.profileImage?.url;
  let publicId = user.profileImage?.public_id;

  try {
    if (files?.image) {
      const file = files.image[0];

      if (publicId) {
        await UploadCloud.delete(publicId);
      }

      const uploaded = await UploadCloud.upload(file.path, 'rublist/profileImage');

      imageUrl = uploaded.url;
      publicId = uploaded.public_id;

      await unlinkIfExists(fs, file.path);
    }

    const updatedUser = await User.findByIdAndUpdate(
      authUser._id,
      {
        username: body?.username ?? user.username,
        fullName: body?.fullName ?? user.fullName,
        phoneNumber: body?.mobile ?? user.phoneNumber,
        email: body?.email ?? user.email,
        profileImage: {
          url: imageUrl,
          public_id: publicId,
        },
      },
      { returnDocument: 'after' },
    );

    const homeSeeker = await HomeSeeker.findOne({ user: authUser._id });

    if (homeSeeker) {
      let shouldUpdateStatus = false;

      if (body.nin && body.nin.length !== 11) {
        throw new AppError('Invalid NIN', 400);
      }

      if (homeSeeker.status === 'under_review') {
        throw new AppError('Verification already in progress', 400);
      }

      if (body?.nin) {
        homeSeeker.nin = body.nin;
        shouldUpdateStatus = true;
      }

      if (files?.ninSlip) {
        const file = files.ninSlip[0];
        const uploaded = await UploadCloud.upload(file.path, 'rublist/homeseeker/ninSlip');

        homeSeeker.ninSlipUrl = {
          url: uploaded.url,
          public_id: uploaded.public_id,
        };

        await unlinkIfExists(fs, file.path);
        shouldUpdateStatus = true;
      }

      if (files?.selfie) {
        const file = files.selfie[0];
        const uploaded = await UploadCloud.upload(file.path, 'rublist/homeseeker/selfie');

        homeSeeker.selfieUrl = {
          url: uploaded.url,
          public_id: uploaded.public_id,
        };

        await unlinkIfExists(fs, file.path);
        shouldUpdateStatus = true;
      }

      if (shouldUpdateStatus) {
        homeSeeker.status = 'under_review';
      }

      await homeSeeker.save();
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(error.message || 'Failed to update user profile', 500);
  }
};

const getSavedProperties = async (deps, input) => {
  const { Property } = deps;
  const { user: authUser, query } = input;

  if (!authUser?._id) {
    throw new AppError('User not authenticated', 401);
  }

  const limit = Math.min(parseInt(query.limit) || 12, 50);
  const Model = getProfileModelFromRoles(deps, authUser.roles);

  if (!Model) {
    throw new AppError('This role cannot have saved properties', 403);
  }

  const profile = await Model.findOne({ user: authUser._id }).select('savedProperties').lean();

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  const savedIds = profile.savedProperties || [];
  const filter = buildSavedPropertyCursorFilter(query.cursor);

  const fetchedProperties = await Property.find({
    _id: { $in: savedIds },
    ...filter,
  })
    .populate({
      path: 'owner',
      populate: {
        path: 'user',
        select: 'fullName profileImage roles phoneNumber',
      },
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = fetchedProperties.length > limit;
  const data = hasNextPage ? fetchedProperties.slice(0, limit) : fetchedProperties;
  const lastItem = data[data.length - 1];

  return {
    success: true,
    count: data.length,
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

const toggleSaveProperty = async (deps, input) => {
  const { Property, validateId } = deps;
  const { user: authUser, propertyId } = input;

  if (!authUser?._id) {
    throw new AppError('User not authenticated', 401);
  }

  validateId.validateMongodbId(propertyId);

  const property = await Property.exists({
    _id: propertyId,
    isAvailable: true,
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const Model = getProfileModelFromRoles(deps, authUser.roles);

  if (!Model) {
    throw new AppError('Not allowed', 403);
  }

  const profile = await Model.findOne({ user: authUser._id }).select('savedProperties');

  if (!profile) {
    throw new AppError('Profile not found', 404);
  }

  const isSaved = profile.savedProperties.some((id) => id.toString() === propertyId);

  if (isSaved) {
    await Model.updateOne({ user: authUser._id }, { $pull: { savedProperties: propertyId } });

    return {
      success: true,
      message: 'Property removed from saved',
      saved: false,
    };
  }

  await Model.updateOne({ user: authUser._id }, { $addToSet: { savedProperties: propertyId } });

  return {
    success: true,
    message: 'Property saved',
    saved: true,
  };
};

const blockUserById = async (deps, input) => {
  const { User, validateId } = deps;
  const { id } = input;

  validateId.validateMongodbId(id);

  const user = await User.findById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isBlocked) {
    throw new AppError('User is already blocked', 400);
  }

  user.isBlocked = true;
  await user.save();

  return {
    success: true,
    message: 'User blocked successfully',
    user,
  };
};

const unblockUserById = async (deps, input) => {
  const { User, validateId } = deps;
  const { id } = input;

  validateId.validateMongodbId(id);

  const user = await User.findById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.isBlocked) {
    throw new AppError('User is not blocked', 400);
  }

  user.isBlocked = false;
  await user.save();

  return {
    success: true,
    message: 'User unblocked successfully',
    user,
  };
};

const deleteUserById = async (deps, input) => {
  const { User, UploadCloud, validateId } = deps;
  const { id } = input;

  validateId.validateMongodbId(id);

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const publicId = user.profileImage?.public_id;
  if (publicId) {
    await UploadCloud.delete(publicId);
  }

  return {
    success: true,
    message: 'User deleted successfully',
  };
};

const deleteMyAccount = async (deps, input) => {
  const { User, UploadCloud, validateId } = deps;
  const { user: authUser } = input;

  if (!authUser?._id) {
    throw new AppError('User not authenticated', 401);
  }

  validateId.validateMongodbId(authUser._id);

  const user = await User.findByIdAndDelete(authUser._id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const publicId = user.profileImage?.public_id;
  if (publicId) {
    await UploadCloud.delete(publicId);
  }

  return {
    success: true,
    message: 'Account deleted successfully',
  };
};

const updateUserPassword = async (deps, input) => {
  const { User, SendEmails, bcrypt, validateId } = deps;
  const { user: authUser, body } = input;
  const { oldPassword, password } = body;

  if (!authUser?._id) {
    throw new AppError('User not authenticated', 401);
  }

  validateId.validateMongodbId(authUser._id);

  const user = await User.findById(authUser._id).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!oldPassword || !password) {
    throw new AppError('Old password and new password are required', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    throw new AppError('Old password is incorrect', 401);
  }

  const samePassword = await bcrypt.compare(password, user.password);

  if (samePassword) {
    throw new AppError('New password cannot be the same as old password', 400);
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  if (!strongPassword.test(password)) {
    throw new AppError(
      'Password must contain uppercase, lowercase, number, special character and be at least 8 characters',
      400,
    );
  }

  user.password = await bcrypt.hash(password, 10);
  user.passwordChangedDate = Date.now();

  await user.save();
  await SendEmails.sendPasswordChangeAlertEmail(user.email, user.fullName);

  return {
    success: true,
    message: 'Password updated successfully',
  };
};

module.exports = {
  getCurrentUser,
  getUsers,
  getUserById,
  updateUserById,
  getSavedProperties,
  toggleSaveProperty,
  blockUserById,
  unblockUserById,
  deleteUserById,
  deleteMyAccount,
  updateUserPassword,
};
