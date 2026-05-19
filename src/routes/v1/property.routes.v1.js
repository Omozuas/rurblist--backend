const express = require('express');

const Checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const PropertyController = require('../../services/property/controllers/propertyControllerAdapter');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const { validateBody } = require('../../middleware/validate');
const { createMutationLimiter, createUploadLimiter } = require('../../middleware/rateLimiter');
const {
  validate,
  createPropertySchema,
  updatePropertySchema,
  commentSchema,
  verifyBuyerSchema,
} = require('../../validators/propertySchemas');

const router = express.Router();

const propertyMutationLimiter = createMutationLimiter({
  maxEnv: 'PROPERTY_MUTATION_RATE_LIMIT_MAX',
  max: 50,
  code: 'PROPERTY_MUTATION_RATE_LIMITED',
});
const propertyUploadLimiter = createUploadLimiter({
  maxEnv: 'PROPERTY_UPLOAD_RATE_LIMIT_MAX',
  max: 15,
  code: 'PROPERTY_UPLOAD_RATE_LIMITED',
});
const buyerVerificationUploadLimiter = createUploadLimiter({
  maxEnv: 'BUYER_VERIFICATION_UPLOAD_RATE_LIMIT_MAX',
  max: 10,
  code: 'BUYER_VERIFICATION_UPLOAD_RATE_LIMITED',
});

router.post(
  '/',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  propertyUploadLimiter,
  Upload.fields([{ name: 'images', maxCount: 6 }]),
  validateBody({ schema: createPropertySchema, validator: validate }),
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
  propertyMutationLimiter,
  PropertyController.likeProperty,
);
router.patch(
  '/:id/unlike',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  propertyMutationLimiter,
  PropertyController.unlikeProperty,
);
router.post(
  '/:id/comment',
  Checker.authmiddleware,
  validateMongoIdParams(['id']),
  propertyMutationLimiter,
  validateBody({ schema: commentSchema, validator: validate }),
  PropertyController.addComment,
);
router.post(
  '/comment/:commentId/reply',
  Checker.authmiddleware,
  validateMongoIdParams(['commentId']),
  propertyMutationLimiter,
  validateBody({ schema: commentSchema, validator: validate }),
  PropertyController.addReply,
);
router.post(
  '/:id/verify-buyer',
  Checker.authmiddleware,
  Checker.allowRoles('Home_Seeker', 'Agent'),
  validateMongoIdParams(['id']),
  buyerVerificationUploadLimiter,
  Upload.fields([{ name: 'ninSlip', maxCount: 1 }]),
  validateBody({ schema: verifyBuyerSchema, validator: validate }),
  PropertyController.verifyBuyer,
);
router.get('/', PropertyController.searchProperties);
router.delete(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['id']),
  propertyMutationLimiter,
  PropertyController.deleteProperty,
);
router.patch(
  '/:id',
  Checker.authmiddleware,
  Checker.allowRoles('Agent', 'Landlord', 'Admin'),
  validateMongoIdParams(['id']),
  propertyUploadLimiter,
  Upload.fields([{ name: 'images', maxCount: 6 }]),
  validateBody({ schema: updatePropertySchema, validator: validate }),
  PropertyController.updateProperty,
);

router.get('/:id', validateMongoIdParams(['id']), PropertyController.getSingleProperty);

module.exports = router;
