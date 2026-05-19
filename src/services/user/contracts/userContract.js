const userService = require('../userService');

module.exports = {
  getCurrentUser: async (deps, input) => userService.getCurrentUser(deps, input),
  getUsers: async (deps, input) => userService.getUsers(deps, input),
  getUserById: async (deps, input) => userService.getUserById(deps, input),
  updateUserById: async (deps, input) => userService.updateUserById(deps, input),
  getSavedProperties: async (deps, input) => userService.getSavedProperties(deps, input),
  toggleSaveProperty: async (deps, input) => userService.toggleSaveProperty(deps, input),
  blockUserById: async (deps, input) => userService.blockUserById(deps, input),
  unblockUserById: async (deps, input) => userService.unblockUserById(deps, input),
  deleteUserById: async (deps, input) => userService.deleteUserById(deps, input),
  deleteMyAccount: async (deps, input) => userService.deleteMyAccount(deps, input),
  updateUserPassword: async (deps, input) => userService.updateUserPassword(deps, input),
};
