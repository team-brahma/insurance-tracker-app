import { clientRepository } from '@repositories/ClientRepository.js';
import { NotFoundError, ValidationError } from '@errors/AppError.js';

export const clientService = {
  async create(agentId: string, data: { insuredName: string; mobileNumber: string }) {
    return clientRepository.create(agentId, {
      insuredName: data.insuredName,
      mobileNumber: data.mobileNumber,
    });
  },

  async list(
    agentId: string,
    search?: string,
    page?: number,
    limit?: number,
    exactMobile?: string,
    exactName?: string,
  ) {
    return clientRepository.findAll(agentId, search, page, limit, exactMobile, exactName);
  },

  async getById(agentId: string, id: string) {
    const client = await clientRepository.findById(agentId, id);
    if (!client) throw new NotFoundError('Client', id);
    return client;
  },

  async update(agentId: string, id: string, data: { insuredName?: string; mobileNumber?: string }) {
    await this.getById(agentId, id);
    return clientRepository.update(agentId, id, data);
  },

  async delete(agentId: string, id: string) {
    const client = await this.getById(agentId, id);
    if (client.policies.length > 0) {
      throw new ValidationError('Cannot delete client because they have active policies');
    }
    return clientRepository.delete(agentId, id);
  },
};
