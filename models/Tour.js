const mongoose = require('mongoose');

const tourSchema = new mongoose.Schema(
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

    tourType: {
      type: String,
      enum: ['in-person', 'inspection', 'call'],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    // 💰 Pricing (only for tours)
    price: {
      type: Number,
      required: function () {
        return this.type === 'tour';
      },
      min: [1000, 'Price cannot be less than 1000'],
      validate: {
        validator: Number.isFinite,
        message: 'Price must be a valid number',
      },
    },

    paid: {
      type: Boolean,
      default: false,
    },

    note: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rescheduled', 'cancelled'],
      default: 'pending',
    },
    // ⏱ Expiry field (AUTO DELETE)
    expiresAt: {
      type: Date,
      required: function () {
        return this.type === 'tour' && !this.paid;
      },
    },
  },
  { timestamps: true },
);

// 🔥 TTL INDEX (Mongo deletes automatically)
tourSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
