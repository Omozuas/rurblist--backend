// models/HomeSeeker.js
const mongoose = require('mongoose');

const homeSeekerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    budget: Number,

    preferredLocations: [String],

    savedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],

    // 🔥 KYC STATUS FLOW
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'under_review', 'approved', 'rejected'],
      default: 'not_submitted',
    },
    // ===============================
    // 🔥 PLAN SYSTEM
    // ===============================
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },

    isPlanActive: {
      type: Boolean,
      default: false,
    },

    planActivatedAt: Date,
    // KYC DATA (OPTIONAL UNTIL SUBMITTED)
    nin: {
      type: String,
      default: null,
    },

    ninSlipUrl: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },

    selfieUrl: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: false,
    },

    // VERIFICATION FLAGS
    kycStatus: {
      ninVerified: { type: Boolean, default: false },
    },

    // RAW VERIFICATION DATA (FROM 3RD PARTY APIs)
    verificationData: {
      nin: { type: Object, default: null },
    },
  },
  { timestamps: true },
);

const HomeSeeker = mongoose.model('HomeSeeker', homeSeekerSchema);
module.exports = HomeSeeker;
