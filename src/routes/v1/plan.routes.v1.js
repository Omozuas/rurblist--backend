const express = require('express');

const PlanController = require('../../services/plan/controllers/planControllerAdapter');
const Checker = require('../../middleware/checker');
const { validateMongoIdParams } = require('../../middleware/validateParams');

const router = express.Router();

router.post('/', Checker.authmiddleware, Checker.allowRoles('Admin'), PlanController.createPlan);
router.get('/', Checker.authmiddleware, PlanController.getPlans);
router.get('/:id', Checker.authmiddleware, validateMongoIdParams(['id']), PlanController.getPlanById);

module.exports = router;
