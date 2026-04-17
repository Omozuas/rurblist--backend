const express = require('express');
const Route = express.Router();
const PlanController = require('../controllers/planController');
const Checker = require('../middlewares/checker');

// ✅ ADMIN ONLY
Route.post('/', Checker.authmiddleware, Checker.allowRoles('Admin'), PlanController.createPlan);

Route.get('/', PlanController.getPlans);

module.exports = Route;
