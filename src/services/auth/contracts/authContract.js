// Controller-contract layer for auth use-cases.
// This file defines the exported functions that controllers call.

const authService = require('../authService');

module.exports = {
  createUser: async (deps, input) => authService.createUser(deps, input),
  loginUser: async (deps, input) => authService.loginUser(deps, input),
  verifyOtp: async (deps, input) => authService.verifyOtp(deps, input),
  resendOtp: async (deps, input) => authService.resendOtp(deps, input),
  forgotPassword: async (deps, input) => authService.forgotPassword(deps, input),
  resetPassword: async (deps, input) => authService.resetPassword(deps, input),
  refreshAccessToken: async (deps, input) => authService.refreshAccessToken(deps, input),
  verifyGoogleOtp: async (deps, input) => authService.verifyGoogleOtp(deps, input),
  completeGoogleCallback: async (deps, input) => authService.completeGoogleCallback(deps, input),
  logout: async (deps, input) => authService.logout(deps, input),
};
