const express = require('express');
const Route = express.Router();
const PropertyController = require('../controllers/propertyController');
const Checker = require('../middlewares/checker');
const Upload = require('../helper/multer');

// ===============================
// CREATE PROPERTY
// ===============================
Route.post(
  '/',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  Upload.multiple('images'),
  PropertyController.createProperty,
);

// ===============================
// VERIFY BUYER
// ===============================
Route.post(
  '/:id/verify-buyer',
  Checker.authmiddleware,
  Checker.allowRoles('Home_Seeker', 'Agent'),
  Upload.fields([
    { name: 'ninSlip', maxCount: 1 }, // KYC
  ]),
  PropertyController.verfyBuyer,
);
// ===============================
// MY PROPERTIES
// ===============================
Route.get(
  '/my-properties',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  PropertyController.getMyProperties,
);

// ===============================
// AGENT PROPERTIES (PUBLIC)
// ===============================
Route.get('/agent-properties/:id', PropertyController.getAgentsPropertiesById);

// ===============================
// SEARCH (PUBLIC)
// ===============================
Route.get('/', PropertyController.searchProperties);

// ===============================
// SLUG (PUBLIC)
// ===============================
Route.get('/slug/:slug', PropertyController.getPropertyBySlug);

// ===============================
// COMMENTS (READ PUBLIC)
// ===============================
Route.get('/:propertyId/comments', PropertyController.getCommentsByProperty);

// ===============================
// LIKE / UNLIKE
// ===============================
Route.patch('/:id/like', Checker.authmiddleware, PropertyController.likeProperty);
Route.patch('/:id/unlike', Checker.authmiddleware, PropertyController.unlikeProperty);

// ===============================
// COMMENTS (WRITE)
// ===============================
Route.post('/:id/comment', Checker.authmiddleware, PropertyController.addComment);
Route.post('/comment/:commentId/reply', Checker.authmiddleware, PropertyController.addReply);

// ===============================
// SINGLE PROPERTY (PUBLIC)
// ===============================
Route.get('/:id', PropertyController.getSingleProperty);

// ===============================
// UPDATE PROPERTY
// ===============================
Route.patch(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  Upload.multiple('images'),
  PropertyController.updateProperty,
);

// ===============================
// DELETE PROPERTY
// ===============================
Route.delete(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  PropertyController.deleteProperty,
);

module.exports = Route;
