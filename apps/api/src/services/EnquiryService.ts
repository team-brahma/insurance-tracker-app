import { enquiryRepository } from '@repositories/EnquiryRepository.js';
import { NotFoundError, ValidationError } from '@errors/AppError.js';
import type { EnquiryStatus, DropReason } from '@prisma/client';

interface ListEnquiriesParams {
  search?: string;
  policyType?: string | string[];
  status?: string | string[];
  page?: number;
  limit?: number;
}

export const enquiryService = {
  async list(agentId: string, params: ListEnquiriesParams) {
    const filters: Record<string, unknown> = { agentId };

    if (params.search) filters.search = params.search;
    if (params.policyType) filters.policyType = params.policyType;
    if (params.status) filters.status = params.status;
    filters.page = params.page ?? 1;
    filters.limit = params.limit ?? 20;

    return enquiryRepository.findAll(filters as never);
  },

  async getById(agentId: string, id: string) {
    const enquiry = await enquiryRepository.findById(agentId, id);
    if (!enquiry) throw new NotFoundError('Enquiry', id);
    return enquiry;
  },

  async create(
    agentId: string,
    data: {
      name: string;
      mobileNumber: string;
      policyType: string; // This holds the policyTypeId
      referredBy?: string | null;
      remindOn?: string | null;
      status?: EnquiryStatus;
      vehicleNumber?: string | null;
    },
  ) {
    if (!data.name) {
      throw new ValidationError('Name is required');
    }
    if (!data.mobileNumber) {
      throw new ValidationError('Mobile number is required');
    }

    let remindOn: Date | null = null;
    if (data.remindOn) {
      if (data.remindOn.includes('T') || data.remindOn.includes(' ')) {
        remindOn = new Date(data.remindOn);
      } else {
        remindOn = new Date(`${data.remindOn.slice(0, 10)}T09:30:00`);
      }
      if (isNaN(remindOn.getTime())) {
        throw new ValidationError('Invalid remind date');
      }
    }

    const existing = await enquiryRepository.findByMobile(agentId, data.mobileNumber);
    if (existing) {
      return enquiryRepository.update(
        agentId,
        existing.id,
        {
          name: data.name,
          policyTypeId: data.policyType,
          referredBy: data.referredBy ?? null,
          remindOn,
          status: data.status ?? 'OPEN',
          vehicleNumber: data.vehicleNumber ?? null,
        },
        agentId,
      );
    }

    return enquiryRepository.create(agentId, {
      name: data.name,
      mobileNumber: data.mobileNumber,
      policyTypeId: data.policyType,
      referredBy: data.referredBy ?? null,
      remindOn,
      status: data.status ?? 'OPEN',
      vehicleNumber: data.vehicleNumber ?? null,
    });
  },

  async update(
    agentId: string,
    id: string,
    data: {
      name?: string;
      mobileNumber?: string;
      policyType?: string; // This contains the policyTypeId
      referredBy?: string | null;
      remindOn?: string | null;
      status?: EnquiryStatus;
      vehicleNumber?: string | null;
    },
  ) {
    await this.getById(agentId, id);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber;
    if (data.policyType !== undefined) updateData.policyTypeId = data.policyType;
    if (data.referredBy !== undefined) updateData.referredBy = data.referredBy;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber;

    if (data.remindOn !== undefined) {
      if (data.remindOn) {
        let remindOn: Date;
        if (data.remindOn.includes('T') || data.remindOn.includes(' ')) {
          remindOn = new Date(data.remindOn);
        } else {
          remindOn = new Date(`${data.remindOn.slice(0, 10)}T09:30:00`);
        }
        if (isNaN(remindOn.getTime())) {
          throw new ValidationError('Invalid remind date');
        }
        updateData.remindOn = remindOn;
      } else {
        updateData.remindOn = null;
      }
    }

    return enquiryRepository.update(agentId, id, updateData, agentId);
  },

  async delete(agentId: string, id: string) {
    await this.getById(agentId, id);
    return enquiryRepository.delete(agentId, id);
  },

  async updateStatus(
    agentId: string,
    id: string,
    status: EnquiryStatus,
    dropReason?: DropReason,
    dropNote?: string,
  ) {
    await this.getById(agentId, id);
    return enquiryRepository.updateStatus(agentId, id, status, agentId, dropReason, dropNote);
  },

  async getStatusHistory(agentId: string, id: string) {
    await this.getById(agentId, id);
    return enquiryRepository.getStatusHistory(id);
  },
};
