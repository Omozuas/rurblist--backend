const asyncHandler = require('express-async-handler');
const axios = require('axios');
const crypto = require('crypto');

const Payment = require('../../../models/Payment');
const Tour = require('../../../models/Tour');
const Plan = require('../../../models/PlanPricing');
const HomeSeeker = require('../../../models/HomeSeeker');
const Property = require('../../../models/Property');
const Verification = require('../../../models/Verfication');
const { generateReceipt, generateReceiptBuffer } = require('../../../utils/receipt/generateReceipt');
const logger = require('../../../utils/logger');
const SendEmails = require('../../email/emailService');
const PaymentContract = require('../contracts/paymentContract');

module.exports = {
  payForTour: asyncHandler(async (req, res) => {
    const result = await PaymentContract.payForTour(
      {
        Payment,
        Tour,
        axios,
        crypto,
        paystackBaseUrl: process.env.PAYSTACK_BASE_URL,
      },
      {
        tourId: req.params.tourId,
        body: req.body,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  payForProperty: asyncHandler(async (req, res) => {
    const result = await PaymentContract.payForProperty(
      {
        Payment,
        Property,
        Plan,
        Verification,
        axios,
        crypto,
        paystackBaseUrl: process.env.PAYSTACK_BASE_URL,
      },
      {
        propertyId: req.params.propertyId,
        body: req.body,
        user: req.user,
      },
    );

    return res.status(200).json(result);
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    const result = await PaymentContract.verifyPayment(
      {
        Payment,
        Property,
        Tour,
        HomeSeeker,
        Verification,
        SendEmails,
        generateReceiptBuffer,
        axios,
        paystackBaseUrl: process.env.PAYSTACK_BASE_URL,
      },
      { reference: req.query.reference },
    );

    return res.status(200).json(result);
  }),

  webhook: asyncHandler(async (req, res) => {
    const result = await PaymentContract.webhook(
      {
        Payment,
        crypto,
        secret: process.env.PAYSTACK_SECRET_KEY,
      },
      {
        body: req.body,
        signature: req.headers['x-paystack-signature'],
      },
    );

    if (result.statusCode !== 200) {
      return res.status(result.statusCode).send(result.body);
    }

    res.sendStatus(200);

    if (result.event && result.paymentId) {
      PaymentContract.processWebhook(
        {
          Payment,
          Property,
          Tour,
          HomeSeeker,
          Verification,
          SendEmails,
          generateReceiptBuffer,
        },
        {
          event: result.event,
          paymentId: result.paymentId,
        },
      ).catch((error) => {
        logger.error('Webhook background processing failed', {
          error,
          reference: result.reference,
          event: result.event.event,
        });
      });
    }
  }),

  downloadReceipt: asyncHandler(async (req, res) => {
    await PaymentContract.downloadReceipt(
      {
        Payment,
        generateReceipt,
      },
      {
        paymentId: req.params.paymentId,
        user: req.user,
        res,
      },
    );
  }),

  getPaymentByReference: asyncHandler(async (req, res) => {
    const result = await PaymentContract.getPaymentByReference(
      { Payment },
      {
        reference: req.params.reference,
        trxref: req.params.trxref,
      },
    );

    return res.status(200).json(result);
  }),
};
