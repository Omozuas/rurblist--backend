const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'senderModel',
      required: true,
    },

    senderModel: {
      type: String,
      enum: ['User', 'Agent'],
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Messages = mongoose.model('Message', messageSchema);
module.exports = Messages;
