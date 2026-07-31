import { getDb } from '@database/index.js';
import type { EnquiryStatus, DropReason } from '@prisma/client';

export interface EnquiryFilters {
  agentId: string;
  search?: string;
  policyType?: string | string[];
  status?: string | string[];
  page?: number;
  limit?: number;
}

export const enquiryRepository = {
  async findAll(filters: EnquiryFilters) {
    const db = getDb();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { agentId: filters.agentId };
    const baseAND: Record<string, unknown>[] = [];

    if (filters.search) {
      baseAND.push({
        OR: [
          { name: { contains: filters.search } },
          { mobileNumber: { contains: filters.search } },
          { referredBy: { contains: filters.search } },
        ],
      });
    }

    if (filters.policyType) {
      if (Array.isArray(filters.policyType)) {
        baseAND.push({ policyTypeId: { in: filters.policyType } });
      } else {
        baseAND.push({ policyTypeId: filters.policyType });
      }
    }

    const baseWhereForStatus: Record<string, unknown> = { agentId: filters.agentId };
    if (baseAND.length > 0) {
      baseWhereForStatus.AND = baseAND;
    }

    const dataAND = [...baseAND];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        dataAND.push({ status: { in: filters.status } });
      } else {
        dataAND.push({ status: filters.status });
      }
    }

    if (dataAND.length > 0) {
      where.AND = dataAND;
    }

    const [data, total, openCount, convertedCount, droppedCount, allStatusCount] = await Promise.all([
      db.enquiry.findMany({
        where,
        include: { policyType: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.enquiry.count({ where }),
      db.enquiry.count({ where: { ...baseWhereForStatus, status: 'OPEN' } }),
      db.enquiry.count({ where: { ...baseWhereForStatus, status: 'CONVERTED' } }),
      db.enquiry.count({ where: { ...baseWhereForStatus, status: 'DROPPED' } }),
      db.enquiry.count({ where: baseWhereForStatus }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statusCounts: {
          OPEN: openCount ?? 0,
          CONVERTED: convertedCount ?? 0,
          DROPPED: droppedCount ?? 0,
          all: allStatusCount ?? 0,
        },
      },
    };
  },

  async findByMobile(agentId: string, mobileNumber: string) {
    const db = getDb();
    return db.enquiry.findFirst({
      where: { mobileNumber, agentId },
      include: { policyType: true },
    });
  },

  async findById(agentId: string, id: string) {
    const db = getDb();
    return db.enquiry.findFirst({
      where: { id, agentId },
      include: { policyType: true },
    });
  },

  async create(
    agentId: string,
    data: {
      name: string;
      mobileNumber: string;
      policyTypeId: string;
      referredBy?: string | null;
      remindOn?: Date | null;
      status?: EnquiryStatus;
      vehicleNumber?: string | null;
    },
  ) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const enquiry = await tx.enquiry.create({
        data: {
          agentId,
          name: data.name,
          mobileNumber: data.mobileNumber,
          policyTypeId: data.policyTypeId,
          referredBy: data.referredBy ?? null,
          remindOn: data.remindOn ?? null,
          status: data.status ?? 'OPEN',
          vehicleNumber: data.vehicleNumber ?? null,
        },
        include: { policyType: true },
      });

      await tx.enquiryStatusHistory.create({
        data: {
          enquiryId: enquiry.id,
          previousStatus: null,
          newStatus: enquiry.status,
          changedById: agentId,
        },
      });

      return enquiry;
    });
  },

  async update(agentId: string, id: string, data: Record<string, unknown>, changedById: string) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const existing = await tx.enquiry.findFirst({ where: { id, agentId } });
      if (!existing) return null;

      const previousStatus = existing.status;
      const updated = await tx.enquiry.update({
        where: { id },
        data,
        include: { policyType: true },
      });

      if (data.status !== undefined && data.status !== previousStatus) {
        await tx.enquiryStatusHistory.create({
          data: {
            enquiryId: id,
            previousStatus,
            newStatus: data.status as EnquiryStatus,
            changedById,
          },
        });
      }

      return updated;
    });
  },

  async delete(agentId: string, id: string) {
    const db = getDb();
    const existing = await db.enquiry.findFirst({ where: { id, agentId } });
    if (!existing) return null;
    return db.enquiry.delete({ where: { id } });
  },

  async updateStatus(
    agentId: string,
    id: string,
    status: EnquiryStatus,
    changedById: string,
    dropReason?: DropReason,
    dropNote?: string,
  ) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const existing = await tx.enquiry.findFirst({ where: { id, agentId } });
      if (!existing) return null;

      const previousStatus = existing.status;
      const updateData: Record<string, unknown> = { status };
      if (status === 'DROPPED') {
        updateData.dropReason = dropReason ?? null;
        updateData.dropNote = dropNote ?? null;
        updateData.droppedAt = new Date();
      }

      const updated = await tx.enquiry.update({
        where: { id },
        data: updateData,
        include: { policyType: true },
      });

      if (previousStatus !== status) {
        await tx.enquiryStatusHistory.create({
          data: {
            enquiryId: id,
            previousStatus,
            newStatus: status,
            changedById,
            notes: dropNote ?? null,
          },
        });
      }

      return updated;
    });
  },

  async getStatusHistory(enquiryId: string) {
    const db = getDb();
    return db.enquiryStatusHistory.findMany({
      where: { enquiryId },
      include: { changedBy: true },
      orderBy: { changedAt: 'desc' },
    });
  },
};
