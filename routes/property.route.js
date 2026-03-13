const express = require("express");
const Route = express.Router();
const PropertyController = require("../controllers/propertyController");
const Checker = require("../middlewares/checker");
const Upload = require("../helper/multer");

// ===============================
// CREATE PROPERTY
// Only Agent, Landlord, Admin
// ===============================
Route.post(
  "/",
  Checker.authmiddleware,
  Checker.allowRoles("Agent", "Landlord", "Admin"),
  Upload.multiple("images"),
  PropertyController.createProperty
);

Route.get(
  "/my-properties",
  Checker.authmiddleware,
  Checker.allowRoles("Agent", "Landlord", "Admin"),
  PropertyController.getMyProperties
);

// ===============================
// UPDATE PROPERTY
// Only Agent, Landlord, Admin
// ===============================
Route.patch(
  "/:id",
  Checker.authmiddleware,
  Checker.allowRoles("Agent", "Landlord", "Admin"),
  Upload.multiple("images"),
  PropertyController.updateProperty
);

// ===============================
// DELETE PROPERTY
// Only Agent, Landlord, Admin
// ===============================
Route.delete(
  "/:id",
  Checker.authmiddleware,
  Checker.allowRoles("Agent", "Landlord", "Admin"),
  PropertyController.deleteProperty
);

// ===============================
// GET SINGLE PROPERTY
// Public
// ===============================
Route.get("/:id", PropertyController.getSingleProperty);

Route.get(
  "/",
  Checker.authmiddleware,
  PropertyController.searchProperties
);

// ===============================
// LIKE / UNLIKE
// ===============================
Route.patch("/:id/like", Checker.authmiddleware, PropertyController.likeProperty);
Route.patch("/:id/unlike", Checker.authmiddleware, PropertyController.unlikeProperty);

// ===============================
// COMMENTS
// ===============================
Route.post("/:id/comment", Checker.authmiddleware, PropertyController.addComment);
Route.post("/comment/:commentId/reply", Checker.authmiddleware, PropertyController.addReply);

Route.get("/slug/:slug",Checker.authmiddleware, PropertyController.getPropertyBySlug);
Route.get(
  "/:propertyId/comments",
  Checker.authmiddleware,
  PropertyController.getCommentsByProperty
);


module.exports = Route;