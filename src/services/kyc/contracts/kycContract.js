const kycService = require('../kycService');

module.exports = {
  verifyNIN: async (deps, input) => kycService.verifyNIN(deps, input),
  verifyBVN: async (deps, input) => kycService.verifyBVN(deps, input),
  verifyCAC: async (deps, input) => kycService.verifyCAC(deps, input),
};
