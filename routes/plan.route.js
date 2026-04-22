const express = require('express');
const Route = express.Router();
const PlanController = require('../controllers/planController');
const Checker = require('../middlewares/checker');

// ✅ ADMIN ONLY
Route.post('/', Checker.authmiddleware, Checker.allowRoles('Admin'), PlanController.createPlan);

Route.get('/', Checker.authmiddleware, PlanController.getPlans);

Route.get('/:id', Checker.authmiddleware, PlanController.getPlanById);

module.exports = Route;
