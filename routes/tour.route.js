const express = require('express');
const Route = express.Router();
const TourController = require('../controllers/tourController');
const Checker = require('../middlewares/checker');

// ===============================
// CREATE TOUR
// Authenticated users only
// ===============================
Route.post('/', Checker.authmiddleware, TourController.createTour);
// 📩 Send message (create or reply)
Route.post('/message', Checker.authmiddleware, TourController.sendMessage);
// ===============================
// RESCHEDULE TOUR
// Authenticated users only
// ===============================
Route.put(
  '/reschedule/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  TourController.rescheduleTour,
);

// ===============================
// CANCEL TOUR
// Authenticated users only
// ===============================
Route.put('/cancel/:tourId', Checker.authmiddleware, TourController.cancelTour);

// 📥 Get tours (user)
Route.get('/user', Checker.authmiddleware, TourController.getUserTours);

// 📥 Get tours (agent)
Route.get('/agent', Checker.authmiddleware, TourController.getAgentTours);

// 📥 Get messages in a conversation
Route.get('/:conversationId', Checker.authmiddleware, TourController.getMessages);

// 📂 Get user conversations
Route.get('/user/conversations', Checker.authmiddleware, TourController.getUserConversations);

// 📂 Get agent conversations
Route.get('/agent/conversations', Checker.authmiddleware, TourController.getAgentConversations);

module.exports = Route;
