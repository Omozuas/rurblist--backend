const asynchandler = require('express-async-handler');
const SendEmails = require('../helper/email_sender');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Property = require('../models/Property');
const Tour = require('../models/Tour');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class TourController {
  /**
   * 📌 CREATE TOUR (with optional note)
   */
  static createTour = asynchandler(async (req, res) => {
    const { agentId, propertyId, price, tourType, scheduledAt, note } = req.body;
    const user = req.user;

    if (!agentId || !propertyId || !price || !tourType || !scheduledAt) {
      res.status(400);
      throw new Error('All fields including date & time are required');
    }
    // ✅ Validate price minimum
    if (price < 1000) {
      res.status(400);
      throw new Error('Price cannot be less than 1000');
    }

    // ✅ Validate date
    const tourDate = new Date(scheduledAt);

    if (isNaN(tourDate.getTime())) {
      res.status(400);
      throw new Error('Invalid date');
    }
    if (tourDate < new Date()) {
      res.status(400);
      throw new Error('Tour date must be in the future');
    }
    // 🚫 DOUBLE BOOKING CHECK
    const existingTour = await Tour.findOne({
      agent: agentId,
      date: tourDate,
      type: 'tour',
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingTour) {
      res.status(400);
      throw new Error('This time slot is already booked for this agent');
    }
    // ⏱ Set expiry (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tour = await Tour.create({
      user: user._id,
      agent: agentId,
      property: propertyId,
      type: 'tour',
      tourType,
      date: tourDate,
      price,
      expiresAt,
      note,
    });
    await SendEmails.sendTourBookingPaymentEmail(user.email, user.fullName, tour);
    res.status(201).json({
      message: 'Tour booked successfully. Pay within 24 hours.',
      data: tour,
    });
  });

  static rescheduleTour = asynchandler(async (req, res) => {
    const { tourId } = req.params;
    const { newDate } = req.body;

    // ✅ Populate main tour (needed for email)
    const tour = await Tour.findById(tourId)
      .populate('user', 'email fullName phoneNumber _id')
      .populate({
        path: 'agent',
        select: '_id user',
        populate: {
          path: 'user',
          select: 'email fullName phoneNumber _id',
        },
      })
      .populate('property', 'location.address title _id');

    if (!tour) {
      res.status(404);
      throw new Error('Tour not found');
    }

    // ✅ Authorization (VERY IMPORTANT)
    if (
      tour.user._id.toString() !== req.user._id.toString() &&
      tour.agent.user._id.toString() !== req.user._id.toString()
    ) {
      res.status(403);
      throw new Error('Not authorized to reschedule this tour');
    }

    if (tour.status === 'cancelled') {
      res.status(400);
      throw new Error('Cannot reschedule a cancelled tour');
    }

    const newTourDate = new Date(newDate);

    if (isNaN(newTourDate.getTime())) {
      res.status(400);
      throw new Error('Invalid date');
    }

    if (newTourDate < new Date()) {
      res.status(400);
      throw new Error('New date must be in the future');
    }

    // 🚫 DOUBLE BOOKING CHECK (no populate needed here)
    const start = new Date(newTourDate.getTime() - 60 * 60 * 1000);
    const end = new Date(newTourDate.getTime() + 60 * 60 * 1000);

    const conflict = await Tour.findOne({
      _id: { $ne: tourId },
      agent: tour.agent._id,
      type: 'tour',
      status: { $in: ['pending', 'confirmed'] },
      date: { $gte: start, $lte: end },
    });

    if (conflict) {
      res.status(400);
      throw new Error('New time slot is already booked');
    }

    // ✅ Update
    tour.date = newTourDate;
    tour.status = 'rescheduled';

    await tour.save();

    // 📧 Emails
    await Promise.all([
      SendEmails.sendTourRescheduleEmail(tour.user.email, tour.user.fullName, tour),
      SendEmails.sendTourRescheduleEmail(tour.agent.user.email, tour.agent.user.fullName, tour),
    ]);

    res.status(200).json({
      message: 'Tour rescheduled successfully',
      data: tour,
    });
  });

  static cancelTour = asynchandler(async (req, res) => {
    const { tourId } = req.params;

    const tour = await Tour.findById(tourId)
      .populate('user', 'email fullName phoneNumber _id')
      .populate({
        path: 'agent',
        select: '_id user',
        populate: {
          path: 'user',
          select: 'email fullName phoneNumber _id',
        },
      })
      .populate('property', 'location.address title _id');

    if (!tour) {
      res.status(404);
      throw new Error('Tour not found');
    }

    if (tour.status === 'cancelled') {
      res.status(400);
      throw new Error('Tour already cancelled');
    }

    tour.status = 'cancelled';

    // 💡 Optional: also mark unpaid tours to expire immediately
    if (!tour.paid) {
      tour.expiresAt = new Date(); // triggers TTL deletion soon
    }

    await tour.save();
    await Promise.all([
      SendEmails.sendTourCancelEmail(tour.user.email, tour.user.fullName, tour),
      SendEmails.sendTourCancelEmail(tour.agent.user.email, tour.agent.user.fullName, tour),
    ]);
    res.json({
      message: 'Tour cancelled successfully',
    });
  });

  static getUserTours = asynchandler(async (req, res) => {
    const tours = await Tour.find({ user: req.user._id })
      .populate('property', 'title location')
      .populate({
        path: 'agent',
        populate: { path: 'user', select: 'fullName email' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: tours,
    });
  });

  /**
   * 📥 GET AGENT TOURS
   */
  static getAgentTours = asynchandler(async (req, res) => {
    const tours = await Tour.find({ agent: req.user._id })
      .populate('property', 'title location')
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: tours,
    });
  });

  /**
   * 📩 SEND MESSAGE (CREATE OR REPLY)
   */
  static sendMessage = asynchandler(async (req, res) => {
    const { agentId, text } = req.body;
    const userId = req.user._id;

    if (!agentId || !text) {
      res.status(400);
      throw new Error('agentId and text are required');
    }

    // 🔍 Find or create conversation
    let conversation = await Conversation.findOne({
      user: userId,
      agent: agentId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        user: userId,
        agent: agentId,
      });
    }

    // 📨 Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: userId,
      senderModel: 'User',
      text,
    });

    // 📝 Update last message
    conversation.lastMessage = message._id;
    await conversation.save();

    res.status(201).json({
      message: 'Message sent successfully',
      data: message,
    });
  });

  /**
   * 📥 GET ALL MESSAGES IN A CONVERSATION
   */
  static getMessages = asynchandler(async (req, res) => {
    const { conversationId } = req.params;

    const messages = await Message.find({
      conversation: conversationId,
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'fullName email');

    res.status(200).json({
      data: messages,
    });
  });

  /**
   * 📂 GET USER CONVERSATIONS
   */
  static getUserConversations = asynchandler(async (req, res) => {
    const conversations = await Conversation.find({
      user: req.user._id,
    })
      .populate('agent')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      data: conversations,
    });
  });

  /**
   * 📂 GET AGENT CONVERSATIONS
   */
  static getAgentConversations = asynchandler(async (req, res) => {
    const conversations = await Conversation.find({
      agent: req.user._id,
    })
      .populate('user', 'fullName email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      data: conversations,
    });
  });
}

module.exports = TourController;
