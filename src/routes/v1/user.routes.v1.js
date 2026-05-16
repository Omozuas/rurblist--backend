const express = require('express');
const rateLimit = require('express-rate-limit');

const checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const UserController = require('../../services/user/controllers/userControllerAdapter');
const KycController = require('../../services/kyc/controllers/kycControllerAdapter');
const { validateBody } = require('../../middleware/validate');
const { validate, changePasswordSchema } = require('../../validators/userSchemas');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password change attempts. Try again later.',
  },
});

router.get('/', checker.authmiddleware, checker.allowRoles('Admin'), UserController.getUsers);
router.get('/verify-nin', KycController.verifyNIN);
router.get('/verify-bvn', KycController.verifyBVN);
router.get('/verify-cac', KycController.verifyCAC);
router.get('/me', checker.authmiddleware, UserController.getCurrentUser);
router.get('/saved', checker.authmiddleware, UserController.getSavedProperties);
router.put(
  '/edit-user',
  checker.authmiddleware,
  Upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  UserController.updateUserById,
);
router.patch(
  '/change-password',
  checker.authmiddleware,
  passwordChangeLimiter,
  validateBody({ schema: changePasswordSchema, validator: validate }),
  UserController.updateUserPassword,
);
router.patch(
  '/:propertyId/save',
  checker.authmiddleware,
  validateMongoIdParams(['propertyId']),
  UserController.toggleSaveProperty,
);
router.patch(
  '/block-user/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  UserController.blockUserById,
);
router.patch(
  '/unblock-user/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  UserController.unblockUserById,
);

router.delete('/me', checker.authmiddleware, UserController.deleteMyAccount);
router.delete(
  '/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  UserController.deleteUserById,
);

router.get(
  '/:id',
  checker.authmiddleware,
  validateMongoIdParams(['id']),
  UserController.getUserById,
);

module.exports = router;
