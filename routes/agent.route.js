const express = require('express');
const Route = express.Router();
const AgentController = require('../controllers/agentController');
const Checker = require('../middlewares/checker');
const Upload = require('../helper/multer');

// ===============================
// CREATE AGENT
// Authenticated users only
// ===============================
Route.post(
  '/',
  Checker.authmiddleware,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  AgentController.createAgent,
);

// ===============================
// GET MY AGENT PROFILE
// ===============================
Route.get('/me', Checker.authmiddleware, Checker.allowRoles('Agent'), AgentController.getMyAgent);

// ===============================
// GET AGENT BY USER ID
// Admin or Owner
// ===============================
Route.get('/userAgent/:userId', Checker.authmiddleware, AgentController.getAgentByUserId);

// ===============================
// UPDATE AGENT
// ===============================
Route.patch(
  '/me',
  Checker.authmiddleware,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  AgentController.updateAgent,
);

// ===============================
// CREATE AGENT
// Authenticated users only
// ===============================
Route.patch(
  '/complete-profile',
  Checker.authmiddleware,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  AgentController.completeAgentProfile,
);
/*
Route.post(
  '/:agentId/verify',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  AgentController.verifyAgent,
);*/

// ===============================
// DELETE AGENT
// ===============================
Route.delete('/me', Checker.authmiddleware, AgentController.deleteAgent);

module.exports = Route;
