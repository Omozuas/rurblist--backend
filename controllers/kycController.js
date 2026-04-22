const asyncHandler = require('express-async-handler');
const DojahService = require('../config/dojahService');

class KycController {
  static verifyNIN = asyncHandler(async (req, res) => {
    const { nin } = req.query;

    const result = await DojahService.verifyNIN(nin);

    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    return res.status(200).json(result);
  });

  static verifyBVN = asyncHandler(async (req, res) => {
    const { bvn } = req.query;

    const result = await DojahService.verifyBVN(bvn);

    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    return res.status(200).json(result);
  });

  static verifyCAC = asyncHandler(async (req, res) => {
    const { cacNumber } = req.query;

    const result = await DojahService.verifyCAC(cacNumber);

    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    return res.status(200).json(result);
  });
}

module.exports = KycController;
