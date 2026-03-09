const User = require("../models/User");
const jwt = require("jsonwebtoken");
const asynchandler = require("express-async-handler");

class Checker {

  // ===============================
  // 🔐 AUTH MIDDLEWARE
  // ===============================
  static authmiddleware = asynchandler(async (req, res, next) => {
    let token;

    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer")
    ) {
      res.status(401);
      throw new Error("Not authorized. No token provided");
    }

    token = req.headers.authorization.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        res.status(401);
        throw new Error("User not found");
      }

      if (user.isBlocked) {
        res.status(403);
        throw new Error("Your account has been blocked");
      }

      // Password changed after token issued
      if (
        user.passwordChangedDate &&
        decoded.iat * 1000 < user.passwordChangedDate.getTime()
      ) {
        res.status(401);
        throw new Error("Password recently changed. Please login again.");
      }

      req.user = user;
      next();

    } catch (err) {
      res.status(401);
      throw new Error("Invalid or expired token");
    }
  });

  // ===============================
  // 🎯 GENERIC ROLE CHECKER
  // ===============================
  static allowRoles = (...roles) => {
    return asynchandler(async (req, res, next) => {

      if (!req.user) {
        res.status(401);
        throw new Error("Not authenticated");
      }

      if (!roles.includes(req.user.role)) {
        res.status(405);
        throw new Error("Access denied");
      }

      next();
    });
  };

}

module.exports = Checker;