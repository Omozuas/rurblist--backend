const express = require('express');

const Checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const PropertyController = require('../../services/property/controllers/propertyControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

router.post(
  '/',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  Upload.fields([{ name: 'images', maxCount: 6 }]),
  PropertyController.createProperty,
);
router.get(
  '/my-properties',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  PropertyController.getMyProperties,
);
router.get(
  '/agent-properties/:id',
  validateMongoIdParams(['id']),
  PropertyController.getAgentsPropertiesById,
);
router.get('/slug/:slug', PropertyController.getPropertyBySlug);
router.get(
  '/:propertyId/comments',
  validateMongoIdParams(['propertyId']),
  PropertyController.getCommentsByProperty,
);
router.patch(
  '/:id/like',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  PropertyController.likeProperty,
);
router.patch(
  '/:id/unlike',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  PropertyController.unlikeProperty,
);
router.post(
  '/:id/comment',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  PropertyController.addComment,
);
router.post(
  '/comment/:commentId/reply',
  Checker.authmiddleware,
  validateMongoIdParams(['commentId']),
  PropertyController.addReply,
);
router.post(
  '/:id/verify-buyer',
  Checker.authmiddleware,
  Checker.allowRoles('Home_Seeker', 'Agent'),
  validateMongoIdParams(['id']),
  Upload.fields([{ name: 'ninSlip', maxCount: 1 }]),
  PropertyController.verifyBuyer,
);
router.get('/', PropertyController.searchProperties);
router.delete(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['id']),
  PropertyController.deleteProperty,
);
router.patch(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['id']),
  Upload.fields([{ name: 'images', maxCount: 6 }]),
  PropertyController.updateProperty,
);

router.get('/:id', validateMongoIdParams(['id']), PropertyController.getSingleProperty);

module.exports = router;
