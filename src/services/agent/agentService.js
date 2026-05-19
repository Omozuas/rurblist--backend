const AgentUseCases = require('./useCases/AgentUseCases');

module.exports = {
  getMyAgent: AgentUseCases.getMyAgent,
  getAgentByUserId: AgentUseCases.getAgentByUserId,
  createAgent: AgentUseCases.createAgent,
  completeAgentProfile: AgentUseCases.completeAgentProfile,
  updateAgent: AgentUseCases.updateAgent,
  deleteAgent: AgentUseCases.deleteAgent,
};
