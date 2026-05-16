const express = require('express');

const AgentController = require('../../services/agent/controllers/agentControllerAdapter');
const Checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

router.post(
  '/',
  Checker.authmiddleware,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  AgentController.createAgent,
);
router.get('/me', Checker.authmiddleware, Checker.allowRoles('Agent'), AgentController.getMyAgent);
router.get(
  '/userAgent/:userId',
  Checker.authmiddleware,
  validateMongoIdParams(['userId']),
  AgentController.getAgentByUserId,
);
router.patch(
  '/me',
  Checker.authmiddleware,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  AgentController.updateAgent,
);
router.patch(
  '/complete-profile',
  Checker.authmiddleware,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  AgentController.completeAgentProfile,
);
router.delete('/me', Checker.authmiddleware, AgentController.deleteAgent);

module.exports = router;
