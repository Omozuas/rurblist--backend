const express = require('express');

const Checker = require('../../middleware/checker');
const TourController = require('../../services/tour/controllers/tourControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const { validateBody } = require('../../middleware/validate');
const { createMutationLimiter } = require('../../middleware/rateLimiter');
const {
  validate,
  createTourSchema,
  rescheduleTourSchema,
  sendMessageSchema,
} = require('../../validators/tourSchemas');

const router = express.Router();

const tourMutationLimiter = createMutationLimiter({
  maxEnv: 'TOUR_MUTATION_RATE_LIMIT_MAX',
  max: 40,
  code: 'TOUR_MUTATION_RATE_LIMITED',
});
const tourMessageLimiter = createMutationLimiter({
  windowEnv: 'TOUR_MESSAGE_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'TOUR_MESSAGE_RATE_LIMIT_MAX',
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many tour messages. Please try again later.',
  code: 'TOUR_MESSAGE_RATE_LIMITED',
});

router.post(
  '/',
  Checker.authmiddleware,
  tourMutationLimiter,
  validateBody({ schema: createTourSchema, validator: validate }),
  TourController.createTour,
);
router.post(
  '/message',
  Checker.authmiddleware,
  tourMessageLimiter,
  validateBody({ schema: sendMessageSchema, validator: validate }),
  TourController.sendMessage,
);
router.put(
  '/reschedule/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['tourId']),
  tourMutationLimiter,
  validateBody({ schema: rescheduleTourSchema, validator: validate }),
  TourController.rescheduleTour,
);
router.put(
  '/confirm/:tourId',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['tourId']),
  tourMutationLimiter,
  TourController.confirmTour,
);
router.put(
  '/cancel/:tourId',
  Checker.authmiddleware,
  validateMongoIdParams(['tourId']),
  tourMutationLimiter,
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
