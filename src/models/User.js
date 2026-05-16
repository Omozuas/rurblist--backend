const mongoose = require('mongoose');

// Declare the userSchema of the Mongo model

var userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      required: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    profileImage: {
      url: {
        type: String,
        default: null,
      },
      public_id: {
        type: String,
        default: null,
      },
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    roles: {
      type: [String],
      enum: ['Home_Seeker', 'Agent', 'Landlord', 'Developer', 'Admin'],
      default: ['Home_Seeker'],
      index: true,
    },
    otp: {
      type: String,
      default: null,
      select: false,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isLogin: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
    passwordChangedDate: Date,
    passwordResetExpires: Date,
    passwordResetToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
);

//Export the model
const User = mongoose.model('User', userSchema);
module.exports = User;
