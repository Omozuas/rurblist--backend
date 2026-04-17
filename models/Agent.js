// models/Agent.js
const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    // 🔗 LINK TO USER
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // ✅ one agent profile per user
      index: true,
    },

    // 👤 PERSONAL INFO (collected when becoming agent)
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: Date,
    city: String,
    address: String,
    nationality: { type: String, default: 'Nigeria' },

    // 🏢 BUSINESS INFO (optional at first)
    cacNumber: { type: String, default: null },
    companyName: { type: String, default: null },
    yearsOfExperience: Number,
    description: String,

    // 🔥 KYC STATUS FLOW
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'under_review', 'approved', 'rejected'],
      default: 'not_submitted',
    },

    // 🆔 KYC DATA (OPTIONAL INITIALLY)
    nin: { type: String, default: null },

    ninSlipUrl: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },

    selfieUrl: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },

    cacDocumentUrl: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },

    bvn: { type: String, default: null },

    // ✅ AGREEMENT (still required at creation)
    isAgreement: {
      type: Boolean,
      default: false,
    },

    // 🔍 VERIFICATION FLAGS
    kycStatus: {
      ninVerified: { type: Boolean, default: false },
      cacVerified: { type: Boolean, default: false },
      bvnVerified: { type: Boolean, default: false },
      livenessVerified: { type: Boolean, default: false },
    },

    // 📦 RAW VERIFICATION RESPONSES
    verificationData: {
      nin: { type: Object, default: null },
      cac: { type: Object, default: null },
      liveness: { type: Object, default: null },
      bvn: { type: Object, default: null },
    },
    savedProperties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
  },
  { timestamps: true },
);

const Agent = mongoose.model('Agent', agentSchema);
module.exports = Agent;
