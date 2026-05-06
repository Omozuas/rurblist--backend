const asynchandler = require('express-async-handler');
const User = require('../models/User');
const HomeSeeker = require('../models/HomeSeeker');
const Agent = require('../models/Agent');
const bcrypt = require('bcrypt');
const generateOtp = require('../helper/otp_generator');
const SendEmails = require('../helper/email_sender');
const jwtToken = require('../config/jwtToken');
const crypto = require('crypto');
const passport = require('passport');
const { nanoid } = require('nanoid');

class AuthController {
  static createUser = asynchandler(async (req, res) => {
    const email = req.body.email?.toLowerCase().trim();
    const { password, role, fullName, phoneNumber } = req.body;

    if (!email || !password || !role || !fullName || !phoneNumber) {
      res.status(400);
      throw new Error('All fields are required');
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    const phoneRegex = /^(?:\+234|0)[789][01]\d{8}$/;

    if (!emailRegex.test(email)) {
      res.status(401);
      throw new Error('Email is not valid');
    }

    if (!phoneRegex.test(phoneNumber)) {
      res.status(400);
      throw new Error('Invalid phone number');
    }
    const minPasswordLength = 8;

    if (password.length < minPasswordLength) {
      res.status(401);
      throw new Error('Password should be at least ' + minPasswordLength + ' characters long');
    }
    if (!strongPassword.test(password)) {
      res.status(400);
      throw new Error(
        'Password must contain uppercase, lowercase, number, special character and be at least 8 characters',
      );
    }
    // ❗ Block admin signup
    if (role === 'Admin') {
      res.status(403);
      throw new Error('You cannot register as admin');
    }
    // ✅ Validate allowed roles
    const allowedRoles = ['Home_Seeker', 'Agent'];

    if (!allowedRoles.includes(role)) {
      res.status(400);
      throw new Error('Invalid role selected');
    }
    try {
      const isExisting = await User.findOne({ email: email });
      if (isExisting) {
        res.status(400);
        throw new Error('Email Already Exists');
      }
      const isPhoneExisting = await User.findOne({ phoneNumber });

      if (isPhoneExisting) {
        res.status(400);
        throw new Error('Phone number already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      // GENERATE OTP
      const otp = generateOtp();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const username = `${fullName}_${nanoid(5)}`;
      const newUser = new User({
        fullName: fullName,
        phoneNumber: phoneNumber,
        email: email,
        password: hashedPassword,
        otp: otp,
        otpExpires: otpExpires,
        username: username,
        roles: [role], // 🔥 ONLY selected role
      });
      await newUser.save();
      // =========================
      // 🔥 CREATE PROFILE BASED ON ROLE
      // =========================

      if (role === 'Home_Seeker') {
        await HomeSeeker.create({
          user: newUser._id,
        });
      }

      if (role === 'Agent') {
        await Agent.create({
          user: newUser._id,
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ')[1] || 'User',
        });
      }
      //send email otp
      await SendEmails.sendOtpMail(newUser.email, newUser.fullName, otp);

      res.status(201).json({ success: true, message: 'Account successfully created.' });
    } catch (error) {
      throw new Error(`${error.message}`);
    }
  });

  static verifyOtp = asynchandler(async (req, res, next) => {
    const email = req.body.email?.toLowerCase().trim();
    const { otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email }).select('+otp');

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.isEmailVerified) {
      res.status(400);
      throw new Error('Email already verified');
    }
    if (!user.otp) {
      res.status(400);
      throw new Error('No OTP found. Please request a new one.');
    }
    if (user.otp !== otp) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    // Check if OTP has expired
    if (user.otpExpires && user.otpExpires < Date.now()) {
      res.status(400);
      throw new Error('OTP has expired. Please request a new one.');
    }

    // OTP is valid - verify email
    user.isEmailVerified = true;
    user.otp = null; // Clear the OTP
    user.otpExpires = null; // Clear OTP expiration
    await SendEmails.sendWelcomeEmail(user.email, user.fullName);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  });

  static resendOtp = asynchandler(async (req, res, next) => {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    if (user.isBlocked) {
      res.status(403);
      throw new Error('Account is blocked');
    }
    if (user.isEmailVerified) {
      res.status(400);
      throw new Error('Email already verified');
    }

    // Generate new OTP
    const newOtp = generateOtp();
    user.otp = newOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send new OTP email
    await SendEmails.sendOtpMail(user.email, user.fullName, newOtp);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
    });
  });

  static loginUser = asynchandler(async (req, res) => {
    const email = req.body.email?.toLowerCase().trim();
    const { password } = req.body;
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    if (!emailRegex.test(email)) {
      res.status(400);
      throw new Error('Invalid email format');
    }

    const isExisting = await User.findOne({ email }).select('+password');

    if (!isExisting) {
      res.status(400);
      throw new Error('Invalid credentials');
    }

    if (!isExisting.isEmailVerified) {
      res.status(400);
      throw new Error('Please verify your email first');
    }

    if (isExisting.isBlocked) {
      res.status(403);
      throw new Error('Your account has been blocked');
    }

    const comparePass = await bcrypt.compare(password, isExisting.password);

    if (!comparePass) {
      res.status(400);
      throw new Error('Invalid credentials');
    }

    const refreshToken = jwtToken.generateRefreshToken(isExisting);
    const accessToken = jwtToken.generateToken(isExisting);

    await User.findByIdAndUpdate(isExisting._id, {
      refreshToken: refreshToken,
      isLogin: true,
    });

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('rublist_auth', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      data: {
        token: accessToken,
        refreshToken: refreshToken,
      },
      message: 'Login successful',
      success: true,
    });
  });

  static forgotPassword = asynchandler(async (req, res) => {
    const email = req.body.email?.toLowerCase().trim();

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Check if user is blocked
    if (user.isBlocked) {
      res.status(403);
      throw new Error('Account is blocked');
    }
    // GENERATE OTP
    const otp = generateOtp();

    try {
      user.passwordResetToken = crypto
        .createHmac('sha256', process.env.SH_KEY)
        .update(otp)
        .digest('hex');
      user.passwordResetExpires = Date.now() + 30 * 60 * 1000; //10 mins
      await user.save();
      //send email otp
      await SendEmails.sendPasswordResetMail(user.email, user.fullName, otp);
      res.status(200).json({
        message: 'you will recive an OTP mail',
        success: true,
      });
    } catch (error) {
      res.status(500);
      throw new Error(`${error.message}`);
    }
  });

  static resetPassword = asynchandler(async (req, res) => {
    const email = req.body.email?.toLowerCase().trim();
    const { otp, password } = req.body;

    if (!otp) {
      res.status(400);
      throw new Error('OTP is required');
    }

    // Validate password length
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Hash the OTP using your method
    const ResetToken = crypto.createHmac('sha256', process.env.SH_KEY).update(otp).digest('hex');

    try {
      const user = await User.findOne({
        email,
        passwordResetToken: ResetToken,
        passwordResetExpires: { $gt: Date.now() },
      }).select('+password +passwordResetToken');

      if (!user) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
      }
      if (user.isBlocked) {
        res.status(403);
        throw new Error('Account is blocked');
      }
      /**
       * 🚨 Prevent using same old password
       */
      const isSamePassword = await bcrypt.compare(password, user.password);

      if (isSamePassword) {
        res.status(400);
        throw new Error('New password cannot be the same as your previous password');
      }

      /**
       * Hash new password
       */
      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.refreshToken = null; // Logout all other sessions
      user.passwordChangedDate = new Date();

      await user.save();

      res.status(200).json({
        message: 'password changed successful',
        success: true,
      });
    } catch (error) {
      res.status(500);
      throw new Error(`${error.message}`);
    }
  });

  static logout = asynchandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Clear refresh token in database
      await User.findByIdAndUpdate(user._id, {
        refreshToken: null,
        isLogin: false,
      });
      const isProduction = process.env.NODE_ENV === 'production';
      // Clear cookie with matching options
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: isProduction ? 'none' : 'lax',
      });
      res.clearCookie('rublist_auth', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: isProduction ? 'none' : 'lax',
      });

      res.status(200).json({
        message: 'Logout successful',
        success: true,
      });
    } catch (error) {
      throw new Error('Logout failed');
    }
  });

  static googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email'],
  });

  static googleCallback = [
    passport.authenticate('google', { failureRedirect: '/login', session: false }),

    asynchandler(async (req, res) => {
      try {
        const user = req.user;

        const otp = generateOtp();
        const hashedOtp = crypto.createHmac('sha256', process.env.SH_KEY).update(otp).digest('hex');
        await User.findByIdAndUpdate(user.id, {
          otp: hashedOtp,
          otpExpires: Date.now() + 3 * 60 * 1000, // 3 minutes,
        });

        return res.redirect(`${process.env.FRONTEND_URL}/oAuth-success-page?otp=${otp}`);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Authentication failed',
        });
      }
    }),
  ];

  static refreshAccessToken = asynchandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      res.status(400);
      throw new Error('No refresh token provided');
    }

    let decoded;

    try {
      decoded = jwtToken.verifyRefreshToken(refreshToken);
    } catch (err) {
      res.status(401);
      throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error('Refresh token does not match');
    }

    if (user.isBlocked) {
      res.status(403);
      throw new Error('Account is blocked');
    }

    /**
     * Optional: Check if password was changed after token was issued
     */
    if (user.passwordChangedDate) {
      const tokenIssuedAt = decoded.iat * 1000;
      if (tokenIssuedAt < user.passwordChangedDate.getTime()) {
        res.status(401);
        throw new Error('Password changed. Please login again.');
      }
    }

    /**
     * Generate new tokens (rotation)
     */
    const newAccessToken = jwtToken.generateToken(user);

    const newRefreshToken = jwtToken.generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('rublist_auth', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'success',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  });

  static verifyGoogleOtp = asynchandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
      res.status(400);
      throw new Error('OTP required');
    }

    const hashedOtp = crypto.createHmac('sha256', process.env.SH_KEY).update(otp).digest('hex');

    const user = await User.findOne({
      otp: hashedOtp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;

    const refreshToken = jwtToken.generateRefreshToken(user);
    const accessToken = jwtToken.generateToken(user);

    user.refreshToken = refreshToken;
    user.isLogin = true;

    await user.save();

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('rublist_auth', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    });
  });
}

module.exports = AuthController;
