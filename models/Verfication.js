const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'payment_confirmed',
        'verification_started',
        'documents_under_review',
        'inspection_scheduled',
        'completed',
        'rejected',
        'cancelled',
      ],
      default: 'pending',
    },

    currentStage: {
      title: {
        type: String,
        default: 'Payment Pending',
      },
      description: {
        type: String,
        default: 'Waiting for payment confirmation',
      },
      estimatedCompletion: {
        type: String,
        default: null,
      },
    },

    documents: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        status: {
          type: String,
          enum: ['pending', 'submitted', 'under_review', 'verified', 'rejected'],
          default: 'pending',
        },

        file: {
          url: { type: String, default: null },
          public_id: { type: String, default: null },
        },

        note: {
          type: String,
          default: '',
        },

        submittedAt: {
          type: Date,
          default: null,
        },

        verifiedAt: {
          type: Date,
          default: null,
        },

        rejectedAt: {
          type: Date,
          default: null,
        },
      },
    ],

    timeline: [
      {
        title: {
          type: String,
          required: true,
        },

        description: {
          type: String,
          default: '',
        },

        status: {
          type: String,
          enum: ['success', 'info', 'warning', 'failed'],
          default: 'info',
        },

        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    certificate: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },

      certificateId: {
        type: String,
        unique: true,
        sparse: true,
        default: null,
      },

      issuedAt: {
        type: Date,
        default: null,
      },
    },

    inspection: {
      scheduledAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      note: {
        type: String,
        default: '',
      },
    },

    fundsReleased: {
      type: Boolean,
      default: false,
    },

    fundsReleasedAt: {
      type: Date,
      default: null,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

verificationSchema.pre('save', function (next) {
  if (!this.certificate.certificateId) {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);

    this.certificate.certificateId = `CERT-${year}-${random}`;
  }

  if (this.status === 'completed') {
    this.isCompleted = true;
    this.completedAt = this.completedAt || new Date();
  }

  next();
});

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;
