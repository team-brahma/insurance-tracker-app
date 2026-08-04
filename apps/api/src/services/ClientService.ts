import { clientRepository } from '@repositories/ClientRepository.js';
import { NotFoundError, ValidationError } from '@errors/AppError.js';
import { formatSmartClientName } from '@repo/utils';

export const clientService = {
  async create(
    agentId: string,
    data: {
      insuredName: string;
      referenceName?: string | null;
      mobileNumber: string;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    },
  ) {
    const createPayload: {
      insuredName: string;
      referenceName?: string | null;
      mobileNumber: string;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    } = {
      insuredName: formatSmartClientName(data.insuredName),
      referenceName: data.referenceName ? formatSmartClientName(data.referenceName) : null,
      mobileNumber: data.mobileNumber,
    };
    if (data.isOutsourced !== undefined) createPayload.isOutsourced = data.isOutsourced;
    if (data.associateAgentId !== undefined) createPayload.associateAgentId = data.associateAgentId;

    return clientRepository.create(agentId, createPayload);
  },

  async list(
    agentId: string,
    search?: string,
    page?: number,
    limit?: number,
    exactMobile?: string,
    exactName?: string,
    isOutsourced?: boolean,
    associateAgentId?: string,
  ) {
    return clientRepository.findAll(
      agentId,
      search,
      page,
      limit,
      exactMobile,
      exactName,
      isOutsourced,
      associateAgentId,
    );
  },

  async getById(agentId: string, id: string) {
    const client = await clientRepository.findById(agentId, id);
    if (!client) throw new NotFoundError('Client', id);
    return client;
  },

  async update(
    agentId: string,
    id: string,
    data: {
      insuredName?: string;
      referenceName?: string | null;
      mobileNumber?: string;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    },
  ) {
    await this.getById(agentId, id);
    const updateData: typeof data = { ...data };
    if (updateData.insuredName) {
      updateData.insuredName = formatSmartClientName(updateData.insuredName);
    }
    if (updateData.referenceName !== undefined) {
      updateData.referenceName = updateData.referenceName ? formatSmartClientName(updateData.referenceName) : null;
    }
    return clientRepository.update(agentId, id, updateData);
  },

  async delete(agentId: string, id: string) {
    const client = await this.getById(agentId, id);
    if (client.policies.length > 0) {
      throw new ValidationError('Cannot delete client because they have active policies');
    }
    return clientRepository.delete(agentId, id);
  },
};
