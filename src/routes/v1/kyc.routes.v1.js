const express = require('express');

const KycController = require('../../services/kyc/controllers/kycControllerAdapter');

const router = express.Router();

router.get('/verify-nin', KycController.verifyNIN);
router.get('/verify-bvn', KycController.verifyBVN);
router.get('/verify-cac', KycController.verifyCAC);

module.exports = router;
