// src/models/Agent.js
const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    // PERSONAL INFO
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: Date,
    city: String,
    address: String,
    nationality: { type: String, default: 'Nigeria' },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // 🚀 performance boost
    },

    // KYC
    nin: String,
    ninSlipUrl: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    selfieUrl: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },

    // BUSINESS INFO
    cacNumber: String,
    cacDocumentUrl: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    bvn: String,
    companyName: String,
    yearsOfExperience: Number,
    description: String,

    // VERIFICATION STATUS
    kycStatus: {
      ninVerified: { type: Boolean, default: false },
      cacVerified: { type: Boolean, default: false },
      bvnVerified: { type: Boolean, default: false },
      livenessVerified: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
    },
    isAgreement: {
      type: Boolean,
      required: true,
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: 'Agreement must be accepted',
      },
    },
    verificationData: {
      nin: Object,
      cac: Object,
      liveness: Object,
      bvn: Object,
    },
  },
  { timestamps: true },
);

const Agent = mongoose.model('Agent', agentSchema);
module.exports = Agent;
