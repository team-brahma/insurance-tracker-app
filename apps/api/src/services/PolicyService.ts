import { policyRepository } from '@repositories/PolicyRepository.js';
import { clientRepository } from '@repositories/ClientRepository.js';
import { enquiryRepository } from '@repositories/EnquiryRepository.js';
import { NotFoundError, ValidationError } from '@errors/AppError.js';
import { formatSmartClientName } from '@repo/utils';
import type { RenewalStatus } from '@prisma/client';

interface ListPoliciesParams {
  search?: string;
  policyType?: string | string[]; // This holds policyTypeId
  renewalStatus?: RenewalStatus | RenewalStatus[];
  urgency?: string;
  isOutsourced?: boolean;
  associateAgentId?: string;
  page?: number;
  limit?: number;
}

export const policyService = {
  async list(agentId: string, params: ListPoliciesParams) {
    const filters: Record<string, unknown> = { agentId };

    if (params.search) filters.search = params.search;
    if (params.policyType) filters.policyType = params.policyType;
    if (params.renewalStatus) filters.renewalStatus = params.renewalStatus;
    if (params.urgency && ['overdue', 'due7', 'due30', 'future'].includes(params.urgency)) {
      filters.urgency = params.urgency;
    }
    if (params.isOutsourced !== undefined) filters.isOutsourced = params.isOutsourced;
    if (params.associateAgentId) filters.associateAgentId = params.associateAgentId;

    filters.page = params.page ?? 1;
    filters.limit = params.limit ?? 20;

    return policyRepository.findAll(filters as never);
  },

  async getById(agentId: string, id: string) {
    const policy = await policyRepository.findById(agentId, id);
    if (!policy) throw new NotFoundError('Policy', id);
    return policy;
  },

  async create(
    agentId: string,
    data: {
      clientId?: string;
      enquiryId?: string | null;
      insuredName: string;
      mobileNumber?: string | null;
      referenceNote?: string | null;
      policyType: string; // This contains the policyTypeId
      vehicleNumber?: string | null;
      policyNumber?: string | null;
      typeNote?: string | null;
      endDate: string;
      renewalStatus?: RenewalStatus;
      premiumPrice?: number | null;
      paymentLink?: string | null;
      renewalNotice?: string | null;
      additionalNotice?: string | null;
      isClaimed?: boolean;
      claimDate?: string | null;
      claimAmount?: number | null;
      insuredPersonName?: string | null;
      insuranceProviderId?: string | null;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    },
  ) {
    let client: {
      id: string;
      insuredName: string;
      mobileNumber: string | null;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    } | null;

    if (data.clientId) {
      client = await clientRepository.findById(agentId, data.clientId);
      if (!client) throw new NotFoundError('Client', data.clientId);
    } else {
      client = data.mobileNumber
        ? await clientRepository.findByMobile(agentId, data.mobileNumber)
        : null;

      const formattedName = formatSmartClientName(data.insuredName);
      client ??= await clientRepository.findByName(agentId, formattedName);

      if (!data.mobileNumber) {
        throw new ValidationError('Mobile number is required to register a new client');
      }
      const clientPayload: {
        insuredName: string;
        mobileNumber: string;
        isOutsourced?: boolean;
        associateAgentId?: string | null;
      } = {
        insuredName: formattedName,
        mobileNumber: data.mobileNumber,
      };
      if (data.isOutsourced !== undefined) clientPayload.isOutsourced = data.isOutsourced;
      if (data.associateAgentId !== undefined) clientPayload.associateAgentId = data.associateAgentId;
      client ??= await clientRepository.create(agentId, clientPayload);
    }

    const endDate = new Date(data.endDate.slice(0, 10) + 'T00:00:00.000Z');
    if (isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid end date');
    }

    const isOutsourced = data.isOutsourced ?? client?.isOutsourced ?? false;
    const associateAgentId = data.associateAgentId ?? client?.associateAgentId ?? null;

    const createData: Record<string, unknown> = {
      clientId: client.id,
      policyTypeId: data.policyType,
      endDate,
      isOutsourced,
      associateAgentId,
    };
    if (data.insuranceProviderId !== undefined) createData.insuranceProviderId = data.insuranceProviderId;
    if (data.vehicleNumber !== undefined) createData.vehicleNumber = data.vehicleNumber;
    if (data.policyNumber !== undefined) createData.policyNumber = data.policyNumber;
    if (data.referenceNote !== undefined) createData.referenceNote = data.referenceNote;
    if (data.typeNote !== undefined) createData.typeNote = data.typeNote;
    if (data.renewalStatus !== undefined) createData.renewalStatus = data.renewalStatus;
    if (data.premiumPrice !== undefined) createData.premiumPrice = data.premiumPrice;
    if (data.paymentLink !== undefined) createData.paymentLink = data.paymentLink;
    if (data.renewalNotice !== undefined) createData.renewalNotice = data.renewalNotice;
    if (data.additionalNotice !== undefined) createData.additionalNotice = data.additionalNotice;
    if (data.insuredPersonName !== undefined) {
      createData.insuredPersonName = data.insuredPersonName ? formatSmartClientName(data.insuredPersonName) : null;
    }
    if (data.isClaimed !== undefined) createData.isClaimed = data.isClaimed;
    if (data.claimDate !== undefined && data.claimDate !== null) {
      const claimDate = new Date(data.claimDate.slice(0, 10) + 'T00:00:00.000Z');
      if (isNaN(claimDate.getTime())) throw new ValidationError('Invalid claim date');
      createData.claimDate = claimDate;
    } else if (data.claimDate === null) {
      createData.claimDate = null;
    }
    if (data.claimAmount !== undefined) createData.claimAmount = data.claimAmount;

    const policy = await policyRepository.create(agentId, createData as never);

    if (data.enquiryId) {
      const enquiry = await enquiryRepository.findById(agentId, data.enquiryId);
      if (enquiry) {
        await enquiryRepository.updateStatus(agentId, data.enquiryId, 'CONVERTED', agentId);
      }
    }

    return policy;
  },

  async update(
    agentId: string,
    id: string,
    data: {
      clientId?: string | null;
      insuredName?: string;
      mobileNumber?: string | null;
      referenceNote?: string | null;
      policyType?: string; // This contains the policyTypeId
      vehicleNumber?: string | null;
      policyNumber?: string | null;
      typeNote?: string | null;
      endDate?: string;
      renewalStatus?: RenewalStatus;
      premiumPrice?: number | null;
      paymentLink?: string | null;
      renewalNotice?: string | null;
      additionalNotice?: string | null;
      isClaimed?: boolean;
      claimDate?: string | null;
      claimAmount?: number | null;
      insuredPersonName?: string | null;
      insuranceProviderId?: string | null;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    },
  ) {
    const existing = await this.getById(agentId, id);

    const updateData: Record<string, unknown> = {};

    if (data.clientId !== undefined && data.clientId !== null) {
      const client = await clientRepository.findById(agentId, data.clientId);
      if (!client) throw new NotFoundError('Client', data.clientId);
      updateData.clientId = data.clientId;
    }

    if (data.policyType !== undefined) updateData.policyTypeId = data.policyType;
    if (data.insuranceProviderId !== undefined) updateData.insuranceProviderId = data.insuranceProviderId;
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber;
    if (data.policyNumber !== undefined) updateData.policyNumber = data.policyNumber;
    if (data.referenceNote !== undefined) updateData.referenceNote = data.referenceNote;
    if (data.typeNote !== undefined) updateData.typeNote = data.typeNote;
    if (data.renewalStatus !== undefined) updateData.renewalStatus = data.renewalStatus;
    if (data.premiumPrice !== undefined) updateData.premiumPrice = data.premiumPrice;
    if (data.paymentLink !== undefined) updateData.paymentLink = data.paymentLink;
    if (data.renewalNotice !== undefined) updateData.renewalNotice = data.renewalNotice;
    if (data.additionalNotice !== undefined) updateData.additionalNotice = data.additionalNotice;
    if (data.insuredPersonName !== undefined) updateData.insuredPersonName = data.insuredPersonName;
    if (data.isClaimed !== undefined) updateData.isClaimed = data.isClaimed;
    if (data.isOutsourced !== undefined) updateData.isOutsourced = data.isOutsourced;
    if (data.associateAgentId !== undefined) updateData.associateAgentId = data.associateAgentId;
    if (data.claimDate !== undefined && data.claimDate !== null) {
      const claimDate = new Date(data.claimDate.slice(0, 10) + 'T00:00:00.000Z');
      if (isNaN(claimDate.getTime())) throw new ValidationError('Invalid claim date');
      updateData.claimDate = claimDate;
    } else if (data.claimDate === null) {
      updateData.claimDate = null;
    }
    if (data.claimAmount !== undefined) updateData.claimAmount = data.claimAmount;

    if (data.endDate !== undefined) {
      const endDate = new Date(data.endDate.slice(0, 10) + 'T00:00:00.000Z');
      if (isNaN(endDate.getTime())) throw new ValidationError('Invalid end date');
      updateData.endDate = endDate;
    }

    const targetClientId = data.clientId ?? existing.clientId;
    if (data.insuredName !== undefined || data.mobileNumber !== undefined) {
      const clientData: Record<string, unknown> = {};
      if (data.insuredName !== undefined) clientData.insuredName = data.insuredName;
      if (data.mobileNumber !== undefined) clientData.mobileNumber = data.mobileNumber;
      await clientRepository.update(agentId, targetClientId, clientData);
    }

    return policyRepository.update(agentId, id, updateData, agentId);
  },

  async delete(agentId: string, id: string) {
    await this.getById(agentId, id);
    return policyRepository.delete(agentId, id);
  },

  async updateStatus(agentId: string, id: string, status: RenewalStatus) {
    await this.getById(agentId, id);
    return policyRepository.updateStatus(agentId, id, status, agentId);
  },

  async getStats(agentId: string) {
    return policyRepository.getStats(agentId);
  },

  async getStatusHistory(agentId: string, id: string) {
    await this.getById(agentId, id);
    return policyRepository.getStatusHistory(id);
  },

  async getRenewalNoticePdf(id: string): Promise<Buffer> {
    const policy = await policyRepository.findByIdPublic(id);
    if (!policy) throw new NotFoundError('Policy', id);
    if (!policy.renewalNotice) throw new NotFoundError('Renewal notice PDF', id);
    const base64Data = policy.renewalNotice.replace(/^data:application\/pdf;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  },
};
