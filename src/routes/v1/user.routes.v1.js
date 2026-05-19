const express = require('express');

const checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const UserController = require('../../services/user/controllers/userControllerAdapter');
const KycController = require('../../services/kyc/controllers/kycControllerAdapter');
const { validateBody } = require('../../middleware/validate');
const { validate, changePasswordSchema, updateUserSchema } = require('../../validators/userSchemas');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const {
  createMutationLimiter,
  createRateLimiter,
  createUploadLimiter,
} = require('../../middleware/rateLimiter');

const router = express.Router();

const passwordChangeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password change attempts. Try again later.',
  code: 'PASSWORD_CHANGE_RATE_LIMITED',
});
const userMutationLimiter = createMutationLimiter({
  maxEnv: 'USER_MUTATION_RATE_LIMIT_MAX',
  max: 40,
  code: 'USER_MUTATION_RATE_LIMITED',
});
const userUploadLimiter = createUploadLimiter({
  maxEnv: 'USER_UPLOAD_RATE_LIMIT_MAX',
  max: 15,
  code: 'USER_UPLOAD_RATE_LIMITED',
});
const kycProviderLimiter = createMutationLimiter({
  windowEnv: 'KYC_PROVIDER_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'KYC_PROVIDER_RATE_LIMIT_MAX',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many verification attempts. Please try again later.',
  code: 'KYC_PROVIDER_RATE_LIMITED',
});

router.get('/', checker.authmiddleware, checker.allowRoles('Admin'), UserController.getUsers);
router.get('/verify-nin', kycProviderLimiter, KycController.verifyNIN);
router.get('/verify-bvn', kycProviderLimiter, KycController.verifyBVN);
router.get('/verify-cac', kycProviderLimiter, KycController.verifyCAC);
router.get('/me', checker.authmiddleware, UserController.getCurrentUser);
router.get('/saved', checker.authmiddleware, UserController.getSavedProperties);
router.put(
  '/edit-user',
  checker.authmiddleware,
  userUploadLimiter,
  Upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  validateBody({ schema: updateUserSchema, validator: validate }),
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
  userMutationLimiter,
  UserController.toggleSaveProperty,
);
router.patch(
  '/block-user/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  userMutationLimiter,
  UserController.blockUserById,
);
router.patch(
  '/unblock-user/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  userMutationLimiter,
  UserController.unblockUserById,
);

router.delete('/me', checker.authmiddleware, userMutationLimiter, UserController.deleteMyAccount);
router.delete(
  '/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  validateMongoIdParams(['id']),
  userMutationLimiter,
  UserController.deleteUserById,
);

router.get(
  '/:id',
  checker.authmiddleware,
  validateMongoIdParams(['id']),
  UserController.getUserById,
);

module.exports = router;
