const asynchandler = require('express-async-handler');
const fs = require('fs');
const User = require('../models/User');
const Property = require('../models/Property');
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
      if (req.file) {
        // delete previous image
        if (publicId) {
          await UploadCloud.delete(publicId);
        }

        const uploaded = await UploadCloud.upload(req.file.path, 'rublist/profileImage');

        imageUrl = uploaded.url;
        publicId = uploaded.public_id;

        // remove temp file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }

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

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
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

    const user = await User.findById(id).select('-password -otp -passwordResetToken -__v');
    // .populate("address")
    // .populate("savedProperties");

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      user,
    });
  });

  static getCurrentUser = asynchandler(async (req, res) => {
    const { id } = req.user;

    validateId.validateMongodbId(id);

    const user = await User.findById(id).select(
      '-password -otp -passwordResetToken -__v -refreshToken -passwordChangedDate -passwordChangedDate -createdAt -updatedAt -otpExpires',
    );
    // .populate("address")
    // .populate("savedProperties");

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      data: user,
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

    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    const user = await User.findById(userId);

    const isSaved = user.savedProperties.includes(propertyId);

    if (isSaved) {
      await User.findByIdAndUpdate(userId, {
        $pull: { savedProperties: propertyId },
      });

      return res.status(200).json({
        success: true,
        message: 'Property removed from saved',
      });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { savedProperties: propertyId },
    });

    res.status(200).json({
      success: true,
      message: 'Property saved',
    });
  });

  static getSavedProperties = asynchandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate({
      path: 'savedProperties',
      populate: {
        path: 'owner',
        select: 'fullName profileImage role phoneNumber',
      },
    });

    res.status(200).json({
      success: true,
      count: user.savedProperties.length,
      data: user.savedProperties,
    });
  });
}

module.exports = UserController;
