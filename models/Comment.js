// models/comment.model.js

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound index for fast queries
commentSchema.index({ property: 1, parentComment: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
