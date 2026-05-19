const PlanUseCases = require('./useCases/PlanUseCases');

module.exports = {
  createPlan: PlanUseCases.createPlan,
  getPlans: PlanUseCases.getPlans,
  getPlanById: PlanUseCases.getPlanById,
};
