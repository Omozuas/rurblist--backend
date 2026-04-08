const asyncHandler = require('express-async-handler');
const axios = require('axios');
const crypto = require('crypto');

const Payment = require('../models/Payment');
const Tour = require('../models/Tour');
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
    const { currency = 'NGN' } = req.body;
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
        metadata: {
          paymentId: payment._id,
          type: 'tour',
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
    const { currency = 'NGN' } = req.body;
    const user = req.user;

    const property = await Property.findById(propertyId).populate('agent');

    if (!property) throw new Error('Property not found');

    const reference = crypto.randomBytes(20).toString('hex');

    const payment = await Payment.create({
      user: user._id,
      agent: property.owner,
      property: property._id,
      paymentFor: 'property',
      amount: property.price,
      currency,
      reference,
    });

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: user.email,
        amount: convertToSmallestUnit(property.price, currency),
        currency,
        reference,
        metadata: {
          paymentId: payment._id,
          type: 'property',
        },
        callback_url: `${process.env.CLIENT_URL}/payment-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

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
      .populate('tour');

    if (!payment) return res.sendStatus(200);

    // 🔥 IDEMPOTENCY CHECK
    if (payment.status === 'success') {
      return res.sendStatus(200);
    }

    try {
      if (event.event === 'charge.success') {
        payment.status = 'success';
        payment.transactionId = data.id;
        payment.paidAt = new Date();
        payment.receiptSent = true;
        await payment.save();

        // 🎯 BUSINESS LOGIC
        if (payment.paymentFor === 'tour') {
          const tour = await Tour.findById(payment.tour);

          if (tour && !tour.paid) {
            tour.paid = true;
            tour.status = 'confirmed';
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

    if (!reference) throw new Error('Reference required');

    const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = response.data.data;

    const payment = await Payment.findOne({ reference });

    if (!payment) throw new Error('Payment not found');

    if (data.status !== 'success') {
      payment.status = 'failed';
      await payment.save();
      throw new Error('Payment failed');
    }

    payment.status = 'success';
    payment.transactionId = data.id;
    payment.paidAt = new Date();

    await payment.save();

    if (payment.paymentFor === 'tour') {
      const tour = await Tour.findById(payment.tour);
      if (tour) {
        tour.paid = true;
        tour.status = 'confirmed';
        tour.expiresAt = null;
        await tour.save();
      }
    }

    res.json({
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
      res.status(403);
      throw new Error('Not authorized');
    }

    generateReceipt(payment, res);
  });
}

module.exports = PaymentController;
