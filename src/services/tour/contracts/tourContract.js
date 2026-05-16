const tourService = require('../tourService');

module.exports = {
  createTour: async (deps, input) => tourService.createTour(deps, input),
  rescheduleTour: async (deps, input) => tourService.rescheduleTour(deps, input),
  cancelTour: async (deps, input) => tourService.cancelTour(deps, input),
  confirmTour: async (deps, input) => tourService.confirmTour(deps, input),
  getUserTours: async (deps, input) => tourService.getUserTours(deps, input),
  getAgentTours: async (deps, input) => tourService.getAgentTours(deps, input),
  getTourById: async (deps, input) => tourService.getTourById(deps, input),
  sendMessage: async (deps, input) => tourService.sendMessage(deps, input),
  getMessages: async (deps, input) => tourService.getMessages(deps, input),
  getUserConversations: async (deps, input) => tourService.getUserConversations(deps, input),
  getAgentConversations: async (deps, input) => tourService.getAgentConversations(deps, input),
};
