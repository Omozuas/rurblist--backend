const asynchandler = require('express-async-handler');

const Agent = require('../../../models/Agent');
const Tour = require('../../../models/Tour');
const Conversation = require('../../../models/Conversation');
const Message = require('../../../models/Message');
const SendEmails = require('../../email/emailService');
const TourContract = require('../contracts/tourContract');

module.exports = {
  createTour: asynchandler(async (req, res) => {
    const result = await TourContract.createTour(
      {
        Tour,
        SendEmails,
      },
      {
        user: req.user,
        body: req.body,
      },
    );

    return res.status(201).json(result);
  }),

  rescheduleTour: asynchandler(async (req, res) => {
    const result = await TourContract.rescheduleTour(
      {
        Tour,
        SendEmails,
      },
      {
        user: req.user,
        tourId: req.params.tourId,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  cancelTour: asynchandler(async (req, res) => {
    const result = await TourContract.cancelTour(
      {
        Tour,
        SendEmails,
      },
      { tourId: req.params.tourId },
    );

    return res.status(200).json(result);
  }),

  confirmTour: asynchandler(async (req, res) => {
    const result = await TourContract.confirmTour(
      {
        Tour,
        SendEmails,
      },
      {
        tourId: req.params.tourId,
        body: req.body,
      },
    );

    return res.status(200).json(result);
  }),

  getUserTours: asynchandler(async (req, res) => {
    const result = await TourContract.getUserTours(
      { Tour },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getAgentTours: asynchandler(async (req, res) => {
    const result = await TourContract.getAgentTours(
      {
        Agent,
        Tour,
      },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getTourById: asynchandler(async (req, res) => {
    const result = await TourContract.getTourById({ Tour }, { id: req.params.id });
    return res.status(200).json(result);
  }),

  sendMessage: asynchandler(async (req, res) => {
    const result = await TourContract.sendMessage(
      {
        Conversation,
        Message,
      },
      {
        user: req.user,
        body: req.body,
      },
    );

    return res.status(201).json(result);
  }),

  getMessages: asynchandler(async (req, res) => {
    const result = await TourContract.getMessages(
      { Message },
      {
        conversationId: req.params.conversationId,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getUserConversations: asynchandler(async (req, res) => {
    const result = await TourContract.getUserConversations(
      { Conversation },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),

  getAgentConversations: asynchandler(async (req, res) => {
    const result = await TourContract.getAgentConversations(
      {
        Agent,
        Conversation,
      },
      {
        user: req.user,
        query: req.query,
      },
    );

    return res.status(200).json(result);
  }),
};
