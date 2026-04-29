const asyncHandler = require('express-async-handler');
const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Tour = require('../models/Tour');
const Plan = require('../models/PlanPricing');
const HomeSeeker = require('../models/HomeSeeker');
const Property = require('../models/Property');
const Verification = require('../models/Verfication');
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
        callback_url: `${process.env.FRONTEND_URl}/payment-tour/success`,
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

    const property = await Property.findById(propertyId).populate('owner');

    if (!property) {
      res.status(404);
      throw new Error('Property not found');
    }

    const parsedEscrowFee = Number(enscrowFee || 0);

    if (Number.isNaN(parsedEscrowFee) || parsedEscrowFee < 0) {
      res.status(400);
      throw new Error('Invalid enscrowFee');
    }

    const propertyPrice = Number(property.price || 0);
    const agentFee = Number(property.agentFee || 0);

    if (Number.isNaN(propertyPrice) || Number.isNaN(agentFee)) {
      res.status(400);
      throw new Error('Invalid property pricing data');
    }

    let totalAmount = propertyPrice + agentFee + parsedEscrowFee;
    let selectedPlan = null;

    if (planId) {
      const plan = await Plan.findById(planId);

      if (!plan || !plan.isActive) {
        res.status(400);
        throw new Error('Invalid plan');
      }

      totalAmount += Number(plan.amount || 0);
      selectedPlan = plan;
    }

    if (!totalAmount || Number.isNaN(totalAmount) || totalAmount <= 0) {
      res.status(400);
      throw new Error('Invalid total amount');
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
      status: 'pending',
      plan: selectedPlan ? selectedPlan._id : null,
    });

    const verification = await Verification.create({
      user: user._id,
      agent: property.owner,
      property: property._id,
      payment: payment._id,

      status: 'pending',

      currentStage: {
        title: 'Payment Pending',
        description: 'Waiting for payment confirmation',
        estimatedCompletion: null,
      },

      documents: [
        {
          name: 'Certificate of Occupancy',
          status: 'pending',
        },
        {
          name: 'Survey Plan',
          status: 'pending',
        },
        {
          name: 'Deed of Assignment',
          status: 'pending',
        },
      ],

      timeline: [
        {
          title: 'Payment Initiated',
          description: 'Property verification payment has been initiated',
          status: 'info',
          date: new Date(),
        },
      ],
    });

    payment.verification = verification._id;
    await payment.save();

    const payload = {
      email: user.email,
      amount: convertToSmallestUnit(totalAmount, currency),
      currency,
      reference,
      metadata: {
        paymentId: payment._id.toString(),
        type: 'property',
        userName: user.fullName,
        userPhone: user.phoneNumber,
        propertyId: property._id.toString(),
        planId: selectedPlan ? selectedPlan._id.toString() : null,
        enscrowFee: parsedEscrowFee,
        agentFee: property.agentFee || 0,
        propertyPrice: property.price,
      },
      callback_url: `${process.env.FRONTEND_URl}/payment-tour/success`,
    };

    if (paymentMethod) {
      payload.channels = [paymentMethod];
    }

    try {
      const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, payload, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Payment initialized',
        data: response.data.data,
      });
    } catch (error) {
      console.error('Paystack Property Init Error:', {
        status: error.response?.status,
        data: error.response?.data,
        payload,
      });

      return res.status(error.response?.status || 500).json({
        success: false,
        message: 'Payment initialization failed',
        error: error.response?.data || error.message,
      });
    }
  });

  /**
   * 🔔 PAYSTACK WEBHOOK (AUTO CONFIRM)
   */
  /*
  static webhook = async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());

    const data = event.data;
    console.log(data);
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
    // only skip if payment is already fully processed
    if (payment.status === 'success' && payment.receiptSent) {
      return res.sendStatus(200);
    }

    try {
      if (event.event === 'charge.success') {
        payment.status = 'success';
        payment.transactionId = data.id;
        payment.paidAt = payment.paidAt || new Date();
        payment.paymentMethod = data.channel;
        payment.metadata = data.metadata;

        // PLAN ACTIVATION
        if (payment.plan) {
          const homeSeeker = await HomeSeeker.findOne({
            user: payment.user._id,
          });

          if (homeSeeker && !homeSeeker.isPlanActive) {
            homeSeeker.plan = payment.plan;
            homeSeeker.isPlanActive = true;
            homeSeeker.planActivatedAt = new Date();
            await homeSeeker.save();

            await SendEmails.sendPlanActivationEmail(
              payment.user.email,
              payment.user.fullName,
              payment.plan,
            );
          }
        }

        // PROPERTY PAYMENT
        if (payment.paymentFor === 'property') {
          const propertyId = payment.property?._id || payment.property;
          const property = await Property.findById(propertyId);

          const verification = await Verification.findOne({ payment: payment._id });

          if (verification && verification.status === 'pending') {
            verification.status = 'documents_under_review';

            verification.currentStage = {
              title: 'Documents under Review',
              description: 'Our team is verifying property documents',
              estimatedCompletion: '2-3 business days',
            };

            verification.timeline.push(
              {
                title: 'Payment Received and Confirmed',
                description: 'Your property verification payment was confirmed',
                status: 'success',
                date: new Date(),
              },
              {
                title: 'Verification Process Initiated',
                description: 'Property verification has started',
                status: 'success',
                date: new Date(),
              },
              {
                title: 'Document Review in Progress',
                description: 'Our team is reviewing the submitted property documents',
                status: 'info',
                date: new Date(),
              },
            );

            await verification.save();
          }
          if (property) {
            property.isSold = true;
            // property.isAvailable = false;
            await property.save();

            payment.property = property;
          }
        }

        // TOUR PAYMENT
        if (payment.paymentFor === 'tour') {
          const tourId = payment.tour?._id || payment.tour;
          const tour = await Tour.findById(tourId);

          if (tour && !tour.paid) {
            tour.paid = true;
            tour.status = 'paid';
            tour.expiresAt = null;
            await tour.save();

            payment.tour = tour;
          }
        }

        // SEND RECEIPT FOR BOTH PROPERTY AND TOUR
        if (!payment.receiptSent) {
          const pdfBuffer = await generateReceiptBuffer(payment);
          console.log(pdfBuffer);
          const e = await SendEmails.sendPaymentReceiptEmail(
            payment.user.email,
            payment.user.fullName,
            payment,
            pdfBuffer,
          );
          console.log(e);
          payment.receiptSent = true;
        }

        await payment.save();
      }

      if (event.event === 'charge.failed') {
        payment.status = 'failed';
        await payment.save();
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error('Webhook error:', err.message);
      return res.sendStatus(500);
    }
  };
*/
  static webhook = async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());
    const data = event.data;

    const payment = await Payment.findOne({ reference: data.reference });

    if (!payment) return res.sendStatus(200);

    // ✅ respond immediately (CRITICAL)
    res.sendStatus(200);

    // ✅ process in background
    PaymentController.processWebhook(event, payment._id);
  };
  static async processWebhook(event, paymentId) {
    try {
      const data = event.data;

      const payment = await Payment.findById(paymentId)
        .populate('user', 'fullName email phoneNumber')
        .populate('property')
        .populate('plan')
        .populate('tour');

      if (!payment) return;

      // ✅ idempotency
      if (payment.webhookProcessed) return;

      if (event.event === 'charge.success') {
        // ======================
        // 💾 SAVE EARLY
        // ======================
        payment.status = 'success';
        payment.transactionId = data.id;
        payment.paidAt = payment.paidAt || new Date();
        payment.paymentMethod = data.channel;

        await payment.save();

        // ======================
        // 🏠 PROPERTY
        // ======================
        if (payment.paymentFor === 'property') {
          const property = await Property.findById(payment.property);

          if (property && !property.isSold) {
            property.isSold = true;
            await property.save();
          }

          const verification = await Verification.findOne({ payment: payment._id });

          if (verification && verification.status === 'pending') {
            verification.status = 'documents_under_review';

            verification.currentStage = {
              title: 'Documents under Review',
              description: 'Our team is verifying property documents',
              estimatedCompletion: '2-3 business days',
            };

            verification.timeline.push({
              title: 'Payment Confirmed',
              description: 'Verification started',
              status: 'success',
              date: new Date(),
            });

            await verification.save();
          }
        }

        // ======================
        // 🎫 TOUR
        // ======================
        if (payment.paymentFor === 'tour') {
          const tour = await Tour.findById(payment.tour);

          if (tour && !tour.paid) {
            tour.paid = true;
            tour.status = 'paid';
            await tour.save();
          }
        }

        // ======================
        // 📦 PLAN
        // ======================
        if (payment.plan) {
          const homeSeeker = await HomeSeeker.findOne({
            user: payment.user._id,
          });

          if (homeSeeker && !homeSeeker.isPlanActive) {
            homeSeeker.plan = payment.plan;
            homeSeeker.isPlanActive = true;
            homeSeeker.planActivatedAt = new Date();
            await homeSeeker.save();
          }
        }

        // ======================
        // 📧 RECEIPT
        // ======================
        if (!payment.receiptSent) {
          try {
            const pdfBuffer = await generateReceiptBuffer(payment);

            await SendEmails.sendPaymentReceiptEmail(
              payment.user.email,
              payment.user.fullName,
              payment,
              pdfBuffer,
            );

            payment.receiptSent = true;
            await payment.save();
          } catch (err) {
            console.error('Receipt error:', err);
          }
        }

        // ======================
        // 🔒 FINAL FLAG
        // ======================
        payment.webhookProcessed = true;
        await payment.save();
      }

      if (event.event === 'charge.failed') {
        payment.status = 'failed';
        await payment.save();
      }
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }
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
