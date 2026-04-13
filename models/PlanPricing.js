const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
    },

    currency: {
      type: String,
      default: 'NGN',
    },

    features: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
