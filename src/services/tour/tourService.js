const TourUseCases = require('./useCases/TourUseCases');

module.exports = {
  createTour: TourUseCases.createTour,
  rescheduleTour: TourUseCases.rescheduleTour,
  cancelTour: TourUseCases.cancelTour,
  confirmTour: TourUseCases.confirmTour,
  getUserTours: TourUseCases.getUserTours,
  getAgentTours: TourUseCases.getAgentTours,
  getTourById: TourUseCases.getTourById,
  sendMessage: TourUseCases.sendMessage,
  getMessages: TourUseCases.getMessages,
  getUserConversations: TourUseCases.getUserConversations,
  getAgentConversations: TourUseCases.getAgentConversations,
};
