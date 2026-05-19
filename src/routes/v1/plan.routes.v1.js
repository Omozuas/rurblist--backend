const express = require('express');

const PlanController = require('../../services/plan/controllers/planControllerAdapter');
const Checker = require('../../middleware/checker');
const { validateMongoIdParams } = require('../../middleware/validateParams');
const { validateBody } = require('../../middleware/validate');
const { createMutationLimiter } = require('../../middleware/rateLimiter');
const { validate, createPlanSchema } = require('../../validators/planSchemas');

const router = express.Router();

const planMutationLimiter = createMutationLimiter({
  maxEnv: 'PLAN_MUTATION_RATE_LIMIT_MAX',
  max: 20,
  code: 'PLAN_MUTATION_RATE_LIMITED',
});

router.post(
  '/',
  Checker.authmiddleware,
  Checker.allowRoles('Admin'),
  planMutationLimiter,
  validateBody({ schema: createPlanSchema, validator: validate }),
  PlanController.createPlan,
);
router.get('/', Checker.authmiddleware, PlanController.getPlans);
router.get('/:id', Checker.authmiddleware, validateMongoIdParams(['id']), PlanController.getPlanById);

module.exports = router;
