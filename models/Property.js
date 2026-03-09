const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        "Apartment",
        "Duplex",
        "Land",
        "Commercial",
        "bedsitter",
        "Self_contain",
        "Flat",
        "Boys_quarters",
        "Mansion"
      ],
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["For_Sale", "For_Rent", "Sold"],
      required: true,
      index: true
    },

    price: {
      type: Number,
      required: true,
      index: true
    },

    bedrooms: { type: Number, index: true },
    bathrooms: { type: Number, index: true },
    size: Number,

    agentFee: {
      type: Number,
      validate: {
        validator: (value) => value > 0,
        message: "Agent fee must be a positive number."
      }
    },

    paymentFrequency: {
      type: String,
      enum: ["per_year", "per_week", "per_month", "one_time"],
      index: true
    },

    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
      }
    ],

    location: {
      address: String,
      city: { type: String, index: true },
      state: { type: String, index: true },
      country: String,
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point"
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true
        }
      }
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    likesCount: {
      type: Number,
      default: 0
    },

    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
      }
    ],

    views: {
      type: Number,
      default: 0
    },

    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "pending"],
      default: "unverified"
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    },

    priorityLevel: {
      type: Number,
      default: 0,
      index: true
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    trendingScore: {
        type: Number,
        default: 0,
        index: true
    },
    priorityStartedAt: Date,
    priorityExpiresAt: Date
  },
  { timestamps: true }
);

//
// INDEXES (IMPORTANT)
//

// Geo index MUST be separate
propertySchema.index({ "location.coordinates": "2dsphere" });

// Compound index for filtering
propertySchema.index({
  status: 1,
  type: 1,
  price: 1,
  bedrooms: 1,
  "location.state": 1
});

const Property = mongoose.model("Property", propertySchema);
module.exports = Property;