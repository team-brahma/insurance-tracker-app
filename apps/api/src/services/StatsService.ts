import { policyRepository } from '@repositories/PolicyRepository.js';

export const statsService = {
  async get(agentId: string) {
    return policyRepository.getStats(agentId);
  },
};
