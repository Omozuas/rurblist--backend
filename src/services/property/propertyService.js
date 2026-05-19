const PropertyUseCases = require('./useCases/PropertyUseCases');

module.exports = {
  searchProperties: PropertyUseCases.searchProperties,
  getMyProperties: PropertyUseCases.getMyProperties,
  getSingleProperty: PropertyUseCases.getSingleProperty,
  getPropertyBySlug: PropertyUseCases.getPropertyBySlug,
  getAgentsPropertiesById: PropertyUseCases.getAgentsPropertiesById,
  likeProperty: PropertyUseCases.likeProperty,
  unlikeProperty: PropertyUseCases.unlikeProperty,
  addComment: PropertyUseCases.addComment,
  addReply: PropertyUseCases.addReply,
  getCommentsByProperty: PropertyUseCases.getCommentsByProperty,
  deleteProperty: PropertyUseCases.deleteProperty,
  createProperty: PropertyUseCases.createProperty,
  verifyBuyer: PropertyUseCases.verifyBuyer,
  updateProperty: PropertyUseCases.updateProperty,
};
