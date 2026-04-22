const asyncHandler = require('express-async-handler');
const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Tour = require('../models/Tour');
const Plan = require('../models/PlanPricing');
const HomeSeeker = require('../models/HomeSeeker');
const Property = require('../models/Property');
const { generateReceipt, generateReceiptBuffer } = require('../helper/generate_receipt');
// const generateReceiptBuffer = require('../helper/generateReceiptBuffer');
const SendEmails = require('../helper/email_sender');
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL;

// 💡 helper
const convertToSmallestUnit = (amount, currency) => {
  const zeroDecimalCurrencies = [];
  if (zeroDecimalCurrencies.includes(currency)) return amount;
  return amount * 100;
};

class PaymentController {
  /**
   * 💰 INITIATE TOUR PAYMENT
   */
  static payForTour = asyncHandler(async (req, res) => {
    const { tourId } = req.params;
    const { currency = 'NGN', paymentMethod } = req.body;
    const user = req.user;

    const tour = await Tour.findById(tourId).populate('property').populate('agent');

    if (!tour) {
      res.status(404);
      throw new Error('Tour not found');
    }

    if (tour.paid) {
      res.status(400);
      throw new Error('Tour already paid');
    }

    if (tour.user.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized');
    }

    const reference = crypto.randomBytes(20).toString('hex');

    // ✅ Create payment record
    const payment = await Payment.create({
      user: user._id,
      agent: tour.agent,
      property: tour.property,
      tour: tour._id,
      paymentFor: 'tour',
      amount: tour.price,
      currency,
      reference,
      status: 'pending',
    });

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: user.email,
        amount: convertToSmallestUnit(tour.price, currency),
        currency,
        reference,
        channels: [paymentMethod],
        metadata: {
          paymentId: payment._id,
          type: 'tour',
          // ✅ EXTRA METADATA (VERY USEFUL)
          userName: user.fullName,
          userPhone: user.phoneNumber,
        },
        callback_url: `${process.env.CLIENT_URL}/payment-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    res.status(200).json({
      message: 'Payment initialized',
      data: response.data.data,
    });
  });

  /**
   * 💰 INITIATE PROPERTY PAYMENT
   */
  static payForProperty = asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const { currency = 'NGN', planId, enscrowFee, paymentMethod } = req.body;
    const user = req.user;
    // console.log(req.body);
    const property = await Property.findById(propertyId).populate('owner');
    // console.log(property);
    if (!property) {
      res.status(400);
      throw new Error('Property not found');
    }
    const parsedEscrowFee = Number(enscrowFee || 0);
    if (Number.isNaN(parsedEscrowFee) || parsedEscrowFee < 0) {
      res.status(400);
      throw new Error('Invalid enscrowFee');
    }

    let totalAmount =
      Number(property.price || 0) + Number(property.agentFee || 0) + parsedEscrowFee;
    let selectedPlan = null;

    // ===============================
    // 🧠 PLAN ATTACHMENT
    // ===============================
    if (planId) {
      const plan = await Plan.findById(planId);
      // console.log(plan);
      if (!plan || !plan.isActive) {
        res.status(400);
        throw new Error('Invalid plan');
      }

      totalAmount += plan.amount;
      selectedPlan = plan;
    }

    const reference = crypto.randomBytes(20).toString('hex');

    const payment = await Payment.create({
      user: user._id,
      agent: property.owner,
      property: property._id,
      paymentFor: 'property',
      amount: totalAmount,
      currency,
      reference,
      enscrowFee: parsedEscrowFee,
      plan: selectedPlan ? selectedPlan._id : null, // 🔥 IMPORTANT
    });

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: user.email,
        amount: convertToSmallestUnit(totalAmount, currency),
        currency,
        reference,
        channels: [paymentMethod],
        metadata: {
          paymentId: payment._id,
          type: 'property',
          planId: selectedPlan ? selectedPlan._id : null, // 🔥 IMPORTANT
          totalAmount,
          propertyPrice: property.price,
          agentFee: property.agentFee || 0,
          enscrowFee: parsedEscrowFee,
          // ✅ EXTRA METADATA (VERY USEFUL)
          userName: user.fullName,
          userPhone: user.phoneNumber,
        },
        callback_url: `${process.env.CLIENT_URL}/payment-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );
    console.log(response);
    res.json({
      message: 'Payment initialized',
      data: response.data.data,
    });
  });

  /**
   * 🔔 PAYSTACK WEBHOOK (AUTO CONFIRM)
   */
  static webhook = async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());

    const data = event.data;

    const payment = await Payment.findOne({
      reference: data.reference,
    })
      .populate('user', 'fullName email phoneNumber _id')
      .populate({
        path: 'agent',
        populate: {
          path: 'user',
          select: 'fullName email phoneNumber _id',
        },
      })
      .populate('property')
      .populate('plan')
      .populate('tour');

    if (!payment) return res.sendStatus(200);

    // 🔥 IDEMPOTENCY CHECK
    if (payment.status === 'success') {
      return res.sendStatus(200);
    }

    try {
      // ===============================
      // ✅ SUCCESS
      // ===============================
      if (event.event === 'charge.success') {
        payment.status = 'success';
        payment.transactionId = data.id;
        payment.paidAt = new Date();
        payment.receiptSent = true;
        payment.paymentMethod = data.channel;
        await payment.save();

        // ===============================
        // 🔥 PLAN ACTIVATION (VERY IMPORTANT)
        // ===============================
        if (payment.plan) {
          const homeSeeker = await HomeSeeker.findOne({
            user: payment.user._id,
          });

          if (homeSeeker) {
            homeSeeker.plan = payment.plan;
            homeSeeker.isPlanActive = true;
            homeSeeker.planActivatedAt = new Date();

            await homeSeeker.save();

            // 🔥 SEND EMAIL
            const plan = await Plan.findById(payment.plan);

            await SendEmails.sendPlanActivationEmail(
              payment.user.email,
              payment.user.fullName,
              plan,
            );
          }
        }

        // ===============================
        // 🏠 PROPERTY PAYMENT
        // ===============================
        if (payment.paymentFor === 'property') {
          const property = Property.findById(payment.property);

          if (property) {
            property.isSold = true; // optional business logic
            await property.save();
          }
        }

        // 🎯 BUSINESS LOGIC
        if (payment.paymentFor === 'tour') {
          const tour = await Tour.findById(payment.tour);

          if (tour && !tour.paid) {
            tour.paid = true;
            tour.status = 'paid';
            tour.expiresAt = null;
            await tour.save();
          }
        }
        const pdfBuffer = await generateReceiptBuffer(payment);

        await SendEmails.sendPaymentReceiptEmail(
          payment.user.email,
          payment.user.fullName,
          payment,
          pdfBuffer,
        );
      }

      if (event.event === 'charge.failed') {
        payment.status = 'failed';
        await payment.save();
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error('Webhook error:', err.message);

      // ❗ IMPORTANT: return 500 so Paystack retries
      return res.sendStatus(500);
    }
  };

  /**
   * ✅ VERIFY PAYMENT (FALLBACK)
   */
  static verifyPayment = asyncHandler(async (req, res) => {
    const { reference } = req.query;

    if (!reference) {
      res.status(400);
      throw new Error('Reference required');
    }

    // ===============================
    // 💳 VERIFY WITH PAYSTACK
    // ===============================
    const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = response.data.data;
    console.log('Verification data:', response.data);
    const payment = await Payment.findOne({ reference });

    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }
    if (payment.status === 'success') {
      res.status(400);
      throw new Error('Payment already verified');
    }
    // ===============================
    // ❌ FAILED PAYMENT
    // ===============================
    if (data.status !== 'success') {
      payment.status = 'failed';
      await payment.save();
      res.status(400);
      throw new Error('Payment failed');
    }

    // ===============================
    // ✅ SUCCESS PAYMENT
    // ===============================
    payment.status = 'success';
    payment.transactionId = data.id;
    payment.paymentMethod = data.channel;
    payment.paidAt = new Date();

    await payment.save();

    // ===============================
    // 🔥 PLAN ACTIVATION
    // ===============================
    if (payment.plan) {
      const homeSeeker = await HomeSeeker.findOne({
        user: payment.user,
      });

      if (!homeSeeker) {
        res.status(404);
        throw new Error('HomeSeeker not found');
      }

      homeSeeker.plan = payment.plan;
      homeSeeker.isPlanActive = true;
      homeSeeker.planActivatedAt = new Date();

      await homeSeeker.save();
    }

    // ===============================
    // 🏠 PROPERTY PAYMENT
    // ===============================
    if (payment.paymentFor === 'property') {
      const property = await Property.findById(payment.property);

      if (property) {
        // 👉 You can customize this logic
        property.isSold = true; // optional

        property.isAvailable = false;

        await property.save();
      }
    }

    // ===============================
    // 🎫 TOUR PAYMENT (EXISTING)
    // ===============================
    if (payment.paymentFor === 'tour') {
      const tour = await Tour.findById(payment.tour);

      if (tour) {
        tour.paid = true;
        tour.status = 'paid';
        tour.expiresAt = null;
        await tour.save();
      }
    }

    res.json({
      success: true,
      message: 'Payment verified',
      data: payment,
    });
  });

  static downloadReceipt = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('user', 'fullName email')
      .populate({
        path: 'agent',
        populate: { path: 'user', select: 'fullName email' },
      })
      .populate('property')
      .populate('tour');

    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    // 🔐 Only owner can download
    if (payment.user._id.toString() !== req.user._id.toString()) {
      res.status(400);
      throw new Error('Not authorized');
    }

    generateReceipt(payment, res);
  });

  /**
   * ✅ Get PAYMENT BY Reference(FALLBACK)
   */
  static getPaymentByReference = asyncHandler(async (req, res) => {
    const { reference, trxref } = req.params;

    // ✅ support both Paystack params
    const paymentRef = reference || trxref;

    if (!paymentRef) {
      res.status(400);
      throw new Error('Reference or trxref is required');
    }

    const payment = await Payment.findOne({ reference: paymentRef });

    // ❗ Handle not found
    if (!payment) {
      res.status(404);
      throw new Error('Payment not found');
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  });
}

module.exports = PaymentController;
