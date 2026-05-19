const propertyService = require('../propertyService');

module.exports = {
  searchProperties: async (deps, input) => propertyService.searchProperties(deps, input),
  getMyProperties: async (deps, input) => propertyService.getMyProperties(deps, input),
  getSingleProperty: async (deps, input) => propertyService.getSingleProperty(deps, input),
  getPropertyBySlug: async (deps, input) => propertyService.getPropertyBySlug(deps, input),
  getAgentsPropertiesById: async (deps, input) =>
    propertyService.getAgentsPropertiesById(deps, input),
  likeProperty: async (deps, input) => propertyService.likeProperty(deps, input),
  unlikeProperty: async (deps, input) => propertyService.unlikeProperty(deps, input),
  addComment: async (deps, input) => propertyService.addComment(deps, input),
  addReply: async (deps, input) => propertyService.addReply(deps, input),
  getCommentsByProperty: async (deps, input) =>
    propertyService.getCommentsByProperty(deps, input),
  deleteProperty: async (deps, input) => propertyService.deleteProperty(deps, input),
  createProperty: async (deps, input) => propertyService.createProperty(deps, input),
  verifyBuyer: async (deps, input) => propertyService.verifyBuyer(deps, input),
  updateProperty: async (deps, input) => propertyService.updateProperty(deps, input),
};
