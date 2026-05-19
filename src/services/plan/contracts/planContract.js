const planService = require('../planService');

module.exports = {
  createPlan: async (deps, input) => planService.createPlan(deps, input),
  getPlans: async (deps, input) => planService.getPlans(deps, input),
  getPlanById: async (deps, input) => planService.getPlanById(deps, input),
};
