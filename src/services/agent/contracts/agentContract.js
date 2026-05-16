const agentService = require('../agentService');

module.exports = {
  getMyAgent: async (deps, input) => agentService.getMyAgent(deps, input),
  getAgentByUserId: async (deps, input) => agentService.getAgentByUserId(deps, input),
  createAgent: async (deps, input) => agentService.createAgent(deps, input),
  completeAgentProfile: async (deps, input) => agentService.completeAgentProfile(deps, input),
  updateAgent: async (deps, input) => agentService.updateAgent(deps, input),
  deleteAgent: async (deps, input) => agentService.deleteAgent(deps, input),
};
