import { associateAgentRepository } from '@repositories/AssociateAgentRepository.js';
import { NotFoundError, ValidationError } from '@errors/AppError.js';

export const associateAgentService = {
  async list(agentId: string, search?: string) {
    return associateAgentRepository.findAll(agentId, search);
  },

  async getById(agentId: string, id: string) {
    const agent = await associateAgentRepository.findById(agentId, id);
    if (!agent) throw new NotFoundError('AssociateAgent', id);
    return agent;
  },

  async create(
    agentId: string,
    data: {
      name: string;
      mobileNumber: string;
      agencyName?: string | null;
      notes?: string | null;
    },
  ) {
    return associateAgentRepository.create(agentId, data);
  },

  async update(
    agentId: string,
    id: string,
    data: {
      name?: string;
      mobileNumber?: string;
      agencyName?: string | null;
      notes?: string | null;
    },
  ) {
    await this.getById(agentId, id);
    return associateAgentRepository.update(agentId, id, data);
  },

  async delete(agentId: string, id: string) {
    const agent = await this.getById(agentId, id);

    const clientCount = agent._count?.clients ?? 0;
    const policyCount = agent._count?.policies ?? 0;

    if (clientCount > 0 || policyCount > 0) {
      throw new ValidationError(
        'Cannot delete associate agent because they have active clients or policies attached',
      );
    }

    return associateAgentRepository.delete(agentId, id);
  },
};
