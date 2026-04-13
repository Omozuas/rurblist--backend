const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // 👤 Who paid
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 🧑‍💼 Who receives (agent / platform)
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },

    // 🏠 Property involved (if any)
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },

    // 🎯 Tour (if payment is for a tour)
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
    },

    // 🧾 Payment purpose
    paymentFor: {
      type: String,
      enum: ['tour', 'property', 'subscription', 'refund'],
      required: true,
    },

    // 💰 Financials
    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'GHS', 'ZAR'],
    },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    paymentMethod: {
      type: String,
      default: 'paystack',
    },

    reference: {
      type: String,
      required: true,
    },

    transactionId: String,

    paidAt: Date,

    // 🔁 Refund linking
    relatedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    receiptSent: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object,
    },
  },
  { timestamps: true },
);

// 🚀 Helpful indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ agent: 1 });
paymentSchema.index({ property: 1 });
paymentSchema.index({ tour: 1 });
paymentSchema.index({ reference: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
