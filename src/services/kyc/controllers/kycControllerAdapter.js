const asyncHandler = require('express-async-handler');

const DojahService = require('../../../config/dojahService');
const AppError = require('../../../utils/AppError');
const KycContract = require('../contracts/kycContract');

const sendDojahResult = (result) => {
  if (!result.success) {
    throw new AppError(
      result.error || 'KYC verification failed',
      result.statusCode || result.status || 400,
      result,
    );
  }

  return result;
};

module.exports = {
  verifyNIN: asyncHandler(async (req, res) => {
    const result = await KycContract.verifyNIN({ DojahService }, { nin: req.query.nin });
    return res.status(200).json(sendDojahResult(result));
  }),

  verifyBVN: asyncHandler(async (req, res) => {
    const result = await KycContract.verifyBVN({ DojahService }, { bvn: req.query.bvn });
    return res.status(200).json(sendDojahResult(result));
  }),

  verifyCAC: asyncHandler(async (req, res) => {
    const result = await KycContract.verifyCAC(
      { DojahService },
      { cacNumber: req.query.cacNumber },
    );
    return res.status(200).json(sendDojahResult(result));
  }),
};
