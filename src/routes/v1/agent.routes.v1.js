const express = require('express');

const AgentController = require('../../services/agent/controllers/agentControllerAdapter');
const Checker = require('../../middleware/checker');
const Upload = require('../../middleware/upload');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const { validateBody } = require('../../middleware/validate');
const { createMutationLimiter, createUploadLimiter } = require('../../middleware/rateLimiter');
const {
  validate,
  createAgentSchema,
  completeAgentProfileSchema,
  updateAgentSchema,
} = require('../../validators/agentSchemas');

const router = express.Router();

const agentMutationLimiter = createMutationLimiter({
  maxEnv: 'AGENT_MUTATION_RATE_LIMIT_MAX',
  max: 30,
  code: 'AGENT_MUTATION_RATE_LIMITED',
});
const agentUploadLimiter = createUploadLimiter({
  maxEnv: 'AGENT_UPLOAD_RATE_LIMIT_MAX',
  max: 10,
  code: 'AGENT_UPLOAD_RATE_LIMITED',
});

router.post(
  '/',
  Checker.authmiddleware,
  agentUploadLimiter,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  validateBody({ schema: createAgentSchema, validator: validate }),
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
  agentUploadLimiter,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  validateBody({ schema: updateAgentSchema, validator: validate }),
  AgentController.updateAgent,
);
router.patch(
  '/complete-profile',
  Checker.authmiddleware,
  agentUploadLimiter,
  Upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'ninSlip', maxCount: 1 },
    { name: 'cacDoc', maxCount: 1 },
  ]),
  validateBody({ schema: completeAgentProfileSchema, validator: validate }),
  AgentController.completeAgentProfile,
);
router.delete('/me', Checker.authmiddleware, agentMutationLimiter, AgentController.deleteAgent);

module.exports = router;
