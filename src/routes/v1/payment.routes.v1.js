const express = require('express');

const Checker = require('../../middleware/checker');
const PaymentController = require('../../services/payment/controllers/paymentControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const { validateBody, validateQuery } = require('../../middleware/validate');
const { createMutationLimiter } = require('../../middleware/rateLimiter');
const {
  validate,
  verifyPaymentSchema,
  payForTourSchema,
  payForPropertySchema,
} = require('../../validators/paymentSchemas');

const router = express.Router();

const paymentMutationLimiter = createMutationLimiter({
  windowEnv: 'PAYMENT_MUTATION_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'PAYMENT_MUTATION_RATE_LIMIT_MAX',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many payment attempts. Please try again later.',
  code: 'PAYMENT_MUTATION_RATE_LIMITED',
});

router.post('/webhook', PaymentController.webhook);
router.post(
  '/tour/:tourId',
  Checker.authmiddleware,
  validateMongoIdParams(['tourId']),
  paymentMutationLimiter,
  validateBody({ schema: payForTourSchema, validator: validate }),
  PaymentController.payForTour,
);
router.post(
  '/property/:propertyId',
  Checker.authmiddleware,
  validateMongoIdParams(['propertyId']),
  paymentMutationLimiter,
  validateBody({ schema: payForPropertySchema, validator: validate }),
  PaymentController.payForProperty,
);
router.get(
  '/verify',
  Checker.authmiddleware,
  validateQuery({ schema: verifyPaymentSchema, validator: validate }),
  PaymentController.verifyPayment,
);
router.get('/reference/:reference', Checker.authmiddleware, PaymentController.getPaymentByReference);
router.get(
  '/:paymentId/receipt',
  Checker.authmiddleware,
  validateMongoIdParams(['paymentId']),
  PaymentController.downloadReceipt,
);

module.exports = router;
