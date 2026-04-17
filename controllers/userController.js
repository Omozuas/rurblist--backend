const asynchandler = require('express-async-handler');
const fs = require('fs');
const User = require('../models/User');
const Property = require('../models/Property');
const HomeSeeker = require('../models/HomeSeeker');
const Agent = require('../models/Agent');
const UploadCloud = require('../config/cloudnary');
const validateId = require('../helper/validatemongodb');
const ApiFeatures = require('../helper/userQueryDB');
const SendEmails = require('../helper/email_sender');

class UserController {
  static updateUserbyId = asynchandler(async (req, res) => {
    const { id } = req.user;

    validateId.validateMongodbId(id);

    const user = await User.findById(id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    let imageUrl = user.profileImage?.url;
    let publicId = user.profileImage?.public_id;

    try {
      // ===============================
      // 🖼 PROFILE IMAGE UPDATE
      // ===============================
      if (req.files?.image) {
        const file = req.files.image[0];

        if (publicId) {
          await UploadCloud.delete(publicId);
        }

        const uploaded = await UploadCloud.upload(file.path, 'rublist/profileImage');

        imageUrl = uploaded.url;
        publicId = uploaded.public_id;

        await fs.promises.unlink(file.path);
      }

      // ===============================
      // 👤 UPDATE USER
      // ===============================
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          username: req.body?.username ?? user.username,
          fullName: req.body?.fullName ?? user.fullName,
          phoneNumber: req.body?.mobile ?? user.phoneNumber,
          email: req.body?.email ?? user.email,
          profileImage: {
            url: imageUrl,
            public_id: publicId,
          },
        },
        { returnDocument: 'after' },
      );

      // ===============================
      // 🧠 HANDLE HOMESEEKER KYC
      // ===============================
      const homeSeeker = await HomeSeeker.findOne({ user: id });

      if (homeSeeker) {
        let shouldUpdateStatus = false;
        if (req.body.nin && req.body.nin.length !== 11) {
          res.status(400);
          throw new Error('Invalid NIN');
        }
        if (homeSeeker.status === 'under_review') {
          res.status(400);
          throw new Error('Verification already in progress');
        }
        // 🪪 NIN provided
        if (req.body?.nin) {
          homeSeeker.nin = req.body.nin;
          shouldUpdateStatus = true;
        }

        // 📄 NIN Slip upload
        if (req.files?.ninSlip) {
          const file = req.files.ninSlip[0];

          const uploaded = await UploadCloud.upload(file.path, 'rublist/homeseeker/ninSlip');

          homeSeeker.ninSlipUrl = {
            url: uploaded.url,
            public_id: uploaded.public_id,
          };

          await fs.promises.unlink(file.path);
          shouldUpdateStatus = true;
        }

        // 🤳 Selfie upload
        if (req.files?.selfie) {
          const file = req.files.selfie[0];

          const uploaded = await UploadCloud.upload(file.path, 'rublist/homeseeker/selfie');

          homeSeeker.selfieUrl = {
            url: uploaded.url,
            public_id: uploaded.public_id,
          };

          await fs.promises.unlink(file.path);
          shouldUpdateStatus = true;
        }

        // 🔥 UPDATE STATUS
        if (shouldUpdateStatus) {
          homeSeeker.status = 'under_review';
        }

        await homeSeeker.save();
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      res.status(500);
      throw new Error(error.message);
    }
  });

  // admin access
  //usage
  ///  GET /api/users?search=john  GET /api/users?createdAt[gte]=2024-01-01  GET /api/users?role=Agent&createdAt[gte]=2024-01-01
  /* 
    gte → greater than or equal
    lte → less than or equal
    gt → greater than
    lt → less than 

    GET /api/users?cursor=65f2acb8c1&limit=10
    GET /api/users?search=john&role=Agent&sort=-createdAt&limit=5
    search users named john

    filter Agents

    sort by latest created

    return 5 users

    populate address & saved properties

*/
  static getUsers = asynchandler(async (req, res) => {
    const features = new ApiFeatures(User.find(), req.query)
      .search(['fullName', 'username', 'email', 'phoneNumber'])
      .filter()
      .sort()
      .limitFields()
      .cursorPaginate()
      .populate(['address', 'savedProperties']);

    const users = await features.query;

    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      totalUsers: total,
      page: features.pagination.page,
      limit: features.pagination.limit,
      count: users.length,
      users,
    });
  });

  static getUserbyId = asynchandler(async (req, res) => {
    const id = req.params.id;

    validateId.validateMongodbId(id);

    const user = await User.findById(id).select(
      'fullName username profileImage roles phoneNumber email isLogin username',
    );

    if (!user) {
      res.status(404);
      throw new Error('User not found');
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
    res.status(200).json({
      success: true,
      data: { user, profiles },
    });
  });

  static getCurrentUser = asynchandler(async (req, res) => {
    const { id } = req.user;

    validateId.validateMongodbId(id);

    const user = await User.findById(id).select(
      'fullName username profileImage roles phoneNumber email isLogin username',
    );

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    let agent = null;
    let homeSeeker = null;

    // 🔥 Attach correct profile
    if (user.roles.includes('Home_Seeker')) {
      homeSeeker = await HomeSeeker.findOne({ user: id }).populate('savedProperties');
    }

    if (user.roles.includes('Agent')) {
      agent = await Agent.findOne({ user: id }).populate('savedProperties');
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        homeSeeker,
        agent,
      },
    });
  });

  static blockUserbyId = asynchandler(async (req, res) => {
    const { id } = req.params;

    validateId.validateMongodbId(id);

    const user = await User.findById(id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.isBlocked) {
      res.status(400);
      throw new Error('User is already blocked');
    }

    user.isBlocked = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      user,
    });
  });

  static unblockUserbyId = asynchandler(async (req, res) => {
    const { id } = req.params;

    validateId.validateMongodbId(id);

    const user = await User.findById(id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!user.isBlocked) {
      res.status(400);
      throw new Error('User is not blocked');
    }

    user.isBlocked = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      user,
    });
  });

  static deleteUserbyId = asynchandler(async (req, res) => {
    const { id } = req.params;

    validateId.validateMongodbId(id);

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    let publicId = user.profileImage?.public_id;

    // delete previous image
    if (publicId) {
      await UploadCloud.delete(publicId);
    }
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  });

  static deleteMyAccount = asynchandler(async (req, res) => {
    const { id } = req.user;

    validateId.validateMongodbId(id);

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    let publicId = user.profileImage?.public_id;
    // delete previous image
    if (publicId) {
      await UploadCloud.delete(publicId);
    }
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  });

  static updateUserPasswordbyId = asynchandler(async (req, res) => {
    const { id } = req.user;
    const { oldPassword, password } = req.body;
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    validateMongodbId(id);

    const user = await User.findById(id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!oldPassword || !password) {
      res.status(400);
      throw new Error('Old password and new password are required');
    }

    if (password.length < 8) {
      res.status(400);
      throw new Error('Password must be at least 8 characters');
    }

    /**
     * Check old password
     */
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      res.status(401);
      throw new Error('Old password is incorrect');
    }

    /**
     * Prevent using same password
     */
    const samePassword = await bcrypt.compare(password, user.password);

    if (samePassword) {
      res.status(400);
      throw new Error('New password cannot be the same as old password');
    }
    if (!strongPassword.test(password)) {
      res.status(400);
      throw new Error(
        'Password must contain uppercase, lowercase, number, special character and be at least 8 characters',
      );
    }
    /**
     * Hash new password
     */
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.passwordChangedDate = Date.now();

    await user.save();
    await SendEmails.sendPasswordChangeAlertEmail(user.email, user.fullName);
    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  });

  static toggleSaveProperty = asynchandler(async (req, res) => {
    const { propertyId } = req.params;
    const userId = req.user.id;
    validateId.validateMongodbId(propertyId);
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    const user = await User.findById(userId);

    let Model;

    if (user.roles.includes('Home_Seeker')) {
      Model = HomeSeeker;
    } else if (user.roles.includes('Agent')) {
      Model = Agent;
    } else {
      res.status(403);
      throw new Error('Not allowed');
    }

    const profile = await Model.findOne({ user: userId });

    const isSaved = profile.savedProperties.includes(propertyId);

    if (isSaved) {
      await Model.findOneAndUpdate({ user: userId }, { $pull: { savedProperties: propertyId } });

      return res.status(200).json({
        success: true,
        message: 'Property removed from saved',
      });
    }

    await Model.findOneAndUpdate(
      { user: userId },
      { $addToSet: { savedProperties: propertyId } }, // 🔥 prevents duplicates
    );

    res.status(200).json({
      success: true,
      message: 'Property saved',
    });
  });

  static getSavedProperties = asynchandler(async (req, res) => {
    const userId = req.user.id;

    const user = await User.findById(userId);

    let profile;

    if (user.roles.includes('Home_Seeker')) {
      profile = await HomeSeeker.findOne({ user: userId }).populate({
        path: 'savedProperties',
        populate: {
          path: 'owner',
          select: 'fullName profileImage roles phoneNumber',
        },
      });
    } else if (user.roles.includes('Agent')) {
      profile = await Agent.findOne({ user: userId }).populate({
        path: 'savedProperties',
        populate: {
          path: 'owner',
          select: 'fullName profileImage roles phoneNumber',
        },
      });
    } else {
      res.status(403);
      throw new Error('This role cannot have saved properties');
    }

    if (!profile) {
      res.status(404);
      throw new Error('Profile not found');
    }

    res.status(200).json({
      success: true,
      count: profile.savedProperties?.length || 0,
      data: profile.savedProperties,
    });
  });
}

module.exports = UserController;
