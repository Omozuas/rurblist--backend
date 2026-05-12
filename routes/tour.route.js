const express = require('express');
const Route = express.Router();
const TourController = require('../controllers/tourController');
const Checker = require('../middlewares/checker');

Route.post('/', Checker.authmiddleware, TourController.createTour);
Route.post('/message', Checker.authmiddleware, TourController.sendMessage);

Route.put(
  '/reschedule/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  TourController.rescheduleTour,
);

Route.put(
  '/confirm/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  TourController.confirmTour,
);

Route.put('/cancel/:tourId', Checker.authmiddleware, TourController.cancelTour);

Route.get('/user/conversations', Checker.authmiddleware, TourController.getUserConversations);
Route.get('/agent/conversations', Checker.authmiddleware, TourController.getAgentConversations);
Route.get(
  '/conversations/:conversationId/messages',
  Checker.authmiddleware,
  TourController.getMessages,
);

Route.get('/user', Checker.authmiddleware, TourController.getUserTours);
Route.get('/agent', Checker.authmiddleware, TourController.getAgentTours);
Route.get('/:id', Checker.authmiddleware, TourController.getTourById);

module.exports = Route;
