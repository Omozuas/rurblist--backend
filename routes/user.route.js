const Route = require('express').Router();
const userController = require('../controllers/userController');
const checker = require('../middlewares/checker');
const Upload = require('../helper/multer');
const rateLimit = require('express-rate-limit');

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password change attempts. Try again later.',
  },
});

// ✅ ADMIN
Route.get('/', checker.authmiddleware, checker.allowRoles('Admin'), userController.getUsers);

// ✅ CURRENT USER
Route.get('/me', checker.authmiddleware, userController.getCurrentUser);
Route.get('/saved', checker.authmiddleware, userController.getSavedProperties);

// ✅ UPDATE
Route.put(
  '/edit-user',
  checker.authmiddleware,
  Upload.fields([
    { name: 'image', maxCount: 1 }, // profile image
    { name: 'ninSlip', maxCount: 1 }, // KYC
    { name: 'selfie', maxCount: 1 }, // KYC
  ]),
  userController.updateUserbyId,
);

// ✅ PASSWORD
Route.patch(
  '/change-password',
  checker.authmiddleware,
  passwordChangeLimiter,
  userController.updateUserPasswordbyId,
);

// ✅ SAVE PROPERTY
Route.patch('/:propertyId/save', checker.authmiddleware, userController.toggleSaveProperty);

// ✅ ADMIN ACTIONS
Route.patch(
  '/block-user/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  userController.blockUserbyId,
);
Route.patch(
  '/unblock-user/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  userController.unblockUserbyId,
);

// ✅ DELETE
Route.delete('/me', checker.authmiddleware, userController.deleteMyAccount);
Route.delete(
  '/:id',
  checker.authmiddleware,
  checker.allowRoles('Admin'),
  userController.deleteUserbyId,
);

// ❗ ALWAYS LAST
Route.get('/:id', checker.authmiddleware, userController.getUserbyId);

module.exports = Route;
