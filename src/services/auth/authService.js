const AuthUseCases = require('./useCases/AuthUseCases');

// Central service entry for auth use-cases.
// Controllers should call controller-contract functions, which delegate here.

module.exports = {
  createUser: AuthUseCases.createUser,
  loginUser: AuthUseCases.loginUser,
  verifyOtp: AuthUseCases.verifyOtp,
  resendOtp: AuthUseCases.resendOtp,
  forgotPassword: AuthUseCases.forgotPassword,
  resetPassword: AuthUseCases.resetPassword,
  refreshAccessToken: AuthUseCases.refreshAccessToken,
  verifyGoogleOtp: AuthUseCases.verifyGoogleOtp,
  completeGoogleCallback: AuthUseCases.completeGoogleCallback,
  logout: AuthUseCases.logout,
};
