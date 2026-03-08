const User = require("../models/User");
const jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');

class Checker {
   // Main auth middleware
   static authmiddleware = asynchandler(async (req, res, next) => {
      let token;
      
      if (!req?.headers?.authorization?.startsWith('Bearer')) {
         throw new Error('Not authorized. No token');
      }
      
      token = req.headers.authorization.split(' ')[1];
      
      try {
         const decode = jwt.verify(token, process.env.JWT_SECRET);
         const user = await User.findById(decode.userId).select('-password');
         
         if (!user) {
            throw new Error('User not found');
         }
         
         // Check if user is blocked
         if (user.isBlocked) {
            res.status(404)
            throw new Error('Your account has been blocked');
         }
         
         if (user.passwordChangedDate) {
            if (decode.iat * 1000 < user.passwordChangedDate.getTime()) {
               throw new Error("Password recently changed. Please login again.");
            }
         }
         // Check if email is verified (optional - uncomment if needed)
         // if (!user.isEmailVerified) {
         //    throw new Error('Please verify your email first');
         // }
         
         req.user = user;
         next();
         
      } catch (err) {
         res.status(403)
         throw new Error('Wrong or expired token');
      }
   });

   // Check if user is Admin
   static authIsAdmin = asynchandler(async (req, res, next) => {
      if (req.user.role !== "Admin") {
         throw new Error('Not authorized. Admin access required');
      }
      next(); 
   });

   // Check if user is Agent
   static authIsAgent = asynchandler(async (req, res, next) => {
      if (req.user.role !== "Agent" && req.user.role !== "Admin") {
         throw new Error('Not authorized. Agent access required');
      }
      next(); 
   });

   // Check if user is Landlord
   static authIsLandlord = asynchandler(async (req, res, next) => {
      if (req.user.role !== "Landlord" && req.user.role !== "Admin") {
         throw new Error('Not authorized. Landlord access required');
      }
      next(); 
   });

   // Check if user is Home Seeker
   static authIsHomeSeeker = asynchandler(async (req, res, next) => {
      if (req.user.role !== "Home_Seeker" && req.user.role !== "Admin") {
         throw new Error('Not authorized');
      }
      next(); 
   });
}

module.exports = Checker;

