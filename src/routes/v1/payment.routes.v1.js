const express = require('express');

const Checker = require('../../middleware/checker');
const PaymentController = require('../../services/payment/controllers/paymentControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

router.post('/webhook', PaymentController.webhook);
router.post(
  '/tour/:tourId',
  Checker.authmiddleware,
  validateMongoIdParams(['tourId']),
  PaymentController.payForTour,
);
router.post(
  '/property/:propertyId',
  Checker.authmiddleware,
  validateMongoIdParams(['propertyId']),
  PaymentController.payForProperty,
);
router.get('/verify', Checker.authmiddleware, PaymentController.verifyPayment);
router.get('/reference/:reference', Checker.authmiddleware, PaymentController.getPaymentByReference);
router.get(
  '/:paymentId/receipt',
  Checker.authmiddleware,
  validateMongoIdParams(['paymentId']),
  PaymentController.downloadReceipt,
);

module.exports = router;
