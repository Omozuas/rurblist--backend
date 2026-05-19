const bcrypt = require('bcrypt');
const AppError = require('../../../utils/AppError');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const generateOtp = require('../../../utils/generateOtp');
const SendEmails = require('../../email/emailService');
const jwtToken = require('../../../config/jwtToken');
const {
  emailRegex,
  phoneRegex,
  strongPasswordRegex,
  minPasswordLength,
  allowedSignupRoles,
} = require('../../../constants/authRules');

const hashToken = (token) => crypto.createHmac('sha256', process.env.SH_KEY).update(token).digest('hex');

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const storeRefreshToken = (user, refreshToken) => {
  user.refreshToken = hashToken(refreshToken);
};

const refreshTokenMatches = (user, refreshToken) => user.refreshToken === hashToken(refreshToken);

const getPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPasswordResetOtpMs = () =>
  getPositiveNumber(process.env.PASSWORD_RESET_OTP_EXPIRES_MS, 30 * 60 * 1000);

const getEmailOtpMs = () => getPositiveNumber(process.env.EMAIL_OTP_EXPIRES_MS, 10 * 60 * 1000);

const getGoogleTicketMs = () =>
  getPositiveNumber(process.env.GOOGLE_LOGIN_TICKET_EXPIRES_MS, 3 * 60 * 1000);

const passwordResetResponse = {
  message: 'If an account exists for this email, a password reset OTP has been sent.',
  success: true,
};

const createUser = async (deps, input) => {
  const { User, HomeSeeker, Agent } = deps;

  const email = input.email?.toLowerCase().trim();
  const { password, role, fullName, phoneNumber } = input;

  if (!email || !password || !role || !fullName || !phoneNumber) {
    throw new AppError('All fields are required', 400);
  }

  if (!emailRegex.test(email)) {
    throw new AppError('Email is not valid', 401);
  }

  if (!phoneRegex.test(phoneNumber)) {
    throw new AppError('Invalid phone number', 400);
  }

  if (password.length < minPasswordLength) {
    throw new AppError(
      'Password should be at least ' + minPasswordLength + ' characters long',
      401,
    );
  }

  if (!strongPasswordRegex.test(password)) {
    throw new AppError(
      'Password must contain uppercase, lowercase, number, special character and be at least 8 characters',
      400,
    );
  }

  // Block admin signup
  if (role === 'Admin') {
    throw new AppError('You cannot register as admin', 403);
  }

  // Validate allowed roles
  if (!allowedSignupRoles.includes(role)) {
    throw new AppError('Invalid role selected', 400);
  }

  const isExisting = await User.findOne({ email });
  if (isExisting) {
    throw new AppError('Email already exists', 400);
  }

  const isPhoneExisting = await User.findOne({ phoneNumber });
  if (isPhoneExisting) {
    throw new AppError('Phone number already exists', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // GENERATE OTP
  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + getEmailOtpMs());
  const username = `${fullName}_${nanoid(5)}`;

  const hashedOtp = crypto.createHmac('sha256', process.env.SH_KEY).update(otp).digest('hex');

  const newUser = new User({
    fullName: fullName,
    phoneNumber: phoneNumber,
    email: email,
    password: hashedPassword,
    otp: hashedOtp,
    otpExpires: otpExpires,
    username: username,
    roles: [role],
  });

  await newUser.save();

  // Create profile based on role
  if (role === 'Home_Seeker') {
    await HomeSeeker.create({ user: newUser._id });
  }

  if (role === 'Agent') {
    await Agent.create({
      user: newUser._id,
      firstName: fullName.split(' ')[0],
      lastName: fullName.split(' ')[1] || 'User',
    });
  }

  await SendEmails.sendOtpMail(newUser.email, newUser.fullName, otp);

  return { success: true, message: 'Account successfully created.' };
};

const loginUser = async (deps, input) => {
  const { User } = deps;

  // Preserve existing login behavior: return tokens and let controller adapter set cookies.

  const email = input.email?.toLowerCase().trim();
  const { password } = input;

  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  const isExisting = await User.findOne({ email }).select('+password');

  if (!isExisting) {
    throw new AppError('Invalid credentials', 400);
  }

  if (!isExisting.isEmailVerified) {
    throw new AppError('Please verify your email first', 400);
  }

  if (isExisting.isBlocked) {
    throw new AppError('Your account has been blocked', 403);
  }

  const comparePass = await bcrypt.compare(password, isExisting.password);

  if (!comparePass) {
    throw new AppError('Invalid credentials', 400);
  }

  const refreshToken = jwtToken.generateRefreshToken(isExisting);
  const accessToken = jwtToken.generateToken(isExisting);

  await User.findByIdAndUpdate(isExisting._id, {
    refreshToken: hashToken(refreshToken),
    isLogin: true,
  });

  return { accessToken, refreshToken };
};

const verifyOtp = async (deps, input) => {
  const { User, SendEmails } = deps;

  const email = input.email?.toLowerCase().trim();
  const { otp } = input;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const user = await User.findOne({ email }).select('+otp');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email already verified', 400);
  }

  if (!user.otp) {
    throw new AppError('No OTP found. Please request a new one.', 400);
  }

  const hashedOtp = crypto.createHmac('sha256', process.env.SH_KEY).update(otp).digest('hex');

  if (user.otp !== hashedOtp) {
    throw new AppError('Invalid OTP', 400);
  }

  // OTP expiry
  if (user.otpExpires && user.otpExpires < Date.now()) {
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  user.isEmailVerified = true;
  user.otp = null;
  user.otpExpires = null;

  await SendEmails.sendWelcomeEmail(user.email, user.fullName);
  await user.save();

  return { success: true, message: 'Email verified successfully' };
};

const resendOtp = async (deps, input) => {
  const { User, SendEmails } = deps;

  const email = input.email?.toLowerCase().trim();

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isBlocked) {
    throw new AppError('Your account has been blocked', 403);
  }

  if (user.isEmailVerified) {
    throw new AppError('Email already verified', 400);
  }

  const newOtp = generateOtp();
  const hashedOtp = crypto.createHmac('sha256', process.env.SH_KEY).update(newOtp).digest('hex');
  user.otp = hashedOtp;
  user.otpExpires = new Date(Date.now() + getEmailOtpMs());
  await user.save();

  await SendEmails.sendOtpMail(user.email, user.fullName, newOtp);

  return { success: true, message: 'New OTP sent to your email' };
};

const forgotPassword = async (deps, input) => {
  const { User, SendEmails, crypto } = deps;

  const email = input.email?.toLowerCase().trim();

  const user = await User.findOne({ email });

  if (!user) {
    return passwordResetResponse;
  }

  if (user.isBlocked) {
    return passwordResetResponse;
  }

  const otp = generateOtp();

  user.passwordResetToken = crypto
    .createHmac('sha256', process.env.SH_KEY)
    .update(otp)
    .digest('hex');

  user.passwordResetExpires = Date.now() + getPasswordResetOtpMs();

  await user.save();
  await SendEmails.sendPasswordResetMail(user.email, user.fullName, otp);

  return passwordResetResponse;
};

const resetPassword = async (deps, input) => {
  const { User, crypto, bcrypt } = deps;

  const email = input.email?.toLowerCase().trim();
  const { otp, password } = input;

  if (!otp) {
    throw new AppError('OTP is required', 400);
  }

  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const ResetToken = crypto.createHmac('sha256', process.env.SH_KEY).update(otp).digest('hex');

  const user = await User.findOne({
    email,
    passwordResetToken: ResetToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password +passwordResetToken');

  if (!user) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  if (user.isBlocked) {
    throw new AppError('Account is blocked', 403);
  }

  const isSamePassword = await bcrypt.compare(password, user.password);
  if (isSamePassword) {
    throw new AppError('New password cannot be the same as your previous password', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  user.password = hashedPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.refreshToken = null;
  user.passwordChangedDate = new Date();

  await user.save();

  return { message: 'password changed successful', success: true };
};

const refreshAccessToken = async (deps, input) => {
  const { User, jwtToken } = deps;

  const refreshToken = input.refreshToken;

  if (!refreshToken) {
    throw new AppError('No refresh token provided', 400);
  }

  let decoded;
  try {
    decoded = jwtToken.verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');

  if (!user || !refreshTokenMatches(user, refreshToken)) {
    throw new AppError('Refresh token does not match', 401);
  }

  if (user.isBlocked) {
    throw new AppError('Account is blocked', 403);
  }

  if (user.passwordChangedDate) {
    const tokenIssuedAt = decoded.iat * 1000;
    if (tokenIssuedAt < user.passwordChangedDate.getTime()) {
      throw new AppError('Password changed. Please login again.', 401);
    }
  }

  const newAccessToken = jwtToken.generateToken(user);
  const newRefreshToken = jwtToken.generateRefreshToken(user);

  storeRefreshToken(user, newRefreshToken);
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const verifyGoogleOtp = async (deps, input) => {
  const { User, jwtToken, crypto } = deps;

  const otpOrTicket = input.otp || input.ticket;

  if (!otpOrTicket) {
    throw new AppError('OTP or ticket is required', 400);
  }

  const hashedOtp = crypto.createHmac('sha256', process.env.SH_KEY).update(otpOrTicket).digest('hex');

  const user = await User.findOne({
    otp: hashedOtp,
    otpExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  user.otp = undefined;
  user.otpExpires = undefined;

  const refreshToken = jwtToken.generateRefreshToken(user);
  const accessToken = jwtToken.generateToken(user);

  storeRefreshToken(user, refreshToken);
  user.isLogin = true;

  await user.save();

  return { accessToken, refreshToken };
};

const completeGoogleCallback = async (deps, input) => {
  const { User } = deps;
  const { user } = input;

  if (!user?._id) {
    throw new AppError('User data missing from Google callback', 400);
  }

  const ticket = generateSecureToken();

  await User.findByIdAndUpdate(user._id, {
    otp: hashToken(ticket),
    otpExpires: Date.now() + getGoogleTicketMs(),
  });

  return { ticket };
};

const logout = async (deps, input) => {
  const { User } = deps;
  const { user } = input;

  if (!user) {
    throw new AppError('User not authenticated', 401);
  }

  await User.findByIdAndUpdate(user._id, {
    refreshToken: null,
    isLogin: false,
  });

  return { message: 'Logout successful', success: true };
};

module.exports = {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  verifyGoogleOtp,
  completeGoogleCallback,
  logout,
};
