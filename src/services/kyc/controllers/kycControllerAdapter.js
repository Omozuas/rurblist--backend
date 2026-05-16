const asyncHandler = require('express-async-handler');

const DojahService = require('../../../config/dojahService');
const KycContract = require('../contracts/kycContract');

const sendDojahResult = (res, result) => {
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }

  return res.status(200).json(result);
};

module.exports = {
  verifyNIN: asyncHandler(async (req, res) => {
    const result = await KycContract.verifyNIN({ DojahService }, { nin: req.query.nin });
    return sendDojahResult(res, result);
  }),

  verifyBVN: asyncHandler(async (req, res) => {
    const result = await KycContract.verifyBVN({ DojahService }, { bvn: req.query.bvn });
    return sendDojahResult(res, result);
  }),

  verifyCAC: asyncHandler(async (req, res) => {
    const result = await KycContract.verifyCAC(
      { DojahService },
      { cacNumber: req.query.cacNumber },
    );
    return sendDojahResult(res, result);
  }),
};
