const express = require('express');

const Checker = require('../../middleware/checker');
const TourController = require('../../services/tour/controllers/tourControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

router.post('/', Checker.authmiddleware, TourController.createTour);
router.post('/message', Checker.authmiddleware, TourController.sendMessage);
router.put(
  '/reschedule/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['tourId']),
  TourController.rescheduleTour,
);
router.put(
  '/confirm/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['tourId']),
  TourController.confirmTour,
);
router.put(
  '/cancel/:tourId',
  Checker.authmiddleware,
  validateMongoIdParams(['tourId']),
  TourController.cancelTour,
);
router.get('/user/conversations', Checker.authmiddleware, TourController.getUserConversations);
router.get('/agent/conversations', Checker.authmiddleware, TourController.getAgentConversations);
router.get(
  '/conversations/:conversationId/messages',
  Checker.authmiddleware,
  validateMongoIdParams(['conversationId']),
  TourController.getMessages,
);
router.get('/user', Checker.authmiddleware, TourController.getUserTours);
router.get('/agent', Checker.authmiddleware, TourController.getAgentTours);

router.get(
  '/:id',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  TourController.getTourById,
);

module.exports = router;
