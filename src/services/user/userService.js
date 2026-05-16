const UserUseCases = require('./useCases/UserUseCases');

module.exports = {
  getCurrentUser: UserUseCases.getCurrentUser,
  getUsers: UserUseCases.getUsers,
  getUserById: UserUseCases.getUserById,
  updateUserById: UserUseCases.updateUserById,
  getSavedProperties: UserUseCases.getSavedProperties,
  toggleSaveProperty: UserUseCases.toggleSaveProperty,
  blockUserById: UserUseCases.blockUserById,
  unblockUserById: UserUseCases.unblockUserById,
  deleteUserById: UserUseCases.deleteUserById,
  deleteMyAccount: UserUseCases.deleteMyAccount,
  updateUserPassword: UserUseCases.updateUserPassword,
};
