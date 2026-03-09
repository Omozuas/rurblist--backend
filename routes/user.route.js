const Route = require('express').Router();
const errorHandler=require('../middlewares/errorhandler');
const userController = require('../controllers/userController');
const checker=require('../middlewares/checker'); 
const Upload  = require('../helper/multer');
const rateLimit = require("express-rate-limit");

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: "Too many password change attempts. Try again later."
  }
});

module.exports = passwordChangeLimiter;


Route.get("/", checker.authmiddleware,checker.allowRoles("Admin"),userController.getUsers);
Route.get("/me", checker.authmiddleware,userController.getCurrentUser);
Route.get("/:id", checker.authmiddleware,userController.getUserbyId);


Route.put('/edit-user',checker.authmiddleware,Upload.single('image'),userController.updateUserbyId);
Route.patch('/block-user/:id',checker.authmiddleware,checker.allowRoles("Admin"),userController.blockUserbyId);
Route.patch('/unblock-user/:id',checker.authmiddleware,checker.allowRoles("Admin"),userController.unblockUserbyId);
Route.patch('/change-password',checker.authmiddleware,passwordChangeLimiter,userController.updateUserPasswordbyId);

Route.delete('/me',checker.authmiddleware,userController.deleteMyAccount);
Route.delete('/:id',checker.authmiddleware,checker.allowRoles("Admin"),userController.deleteUserbyId);

Route.use(errorHandler.notfound);
Route.use(errorHandler.errorHandler);

module.exports = Route;