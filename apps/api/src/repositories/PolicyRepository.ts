import { getDb } from '@database/index.js';
import type { RenewalStatus } from '@prisma/client';

export interface PolicyFilters {
  agentId: string;
  search?: string;
  policyType?: string; // This holds policyTypeId
  renewalStatus?: RenewalStatus;
  urgency?: 'overdue' | 'due7' | 'due30' | 'future';
  page?: number;
  limit?: number;
}

export const policyRepository = {
  async findAll(filters: PolicyFilters) {
    const db = getDb();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { agentId: filters.agentId };
    const AND: Record<string, unknown>[] = [];

    if (filters.search) {
      AND.push({
        OR: [
          { client: { insuredName: { contains: filters.search } } },
          { vehicleNumber: { contains: filters.search } },
          { policyNumber: { contains: filters.search } },
        ],
      });
    }

    if (filters.policyType) {
      AND.push({ policyTypeId: filters.policyType });
    }

    if (filters.renewalStatus) {
      AND.push({ renewalStatus: filters.renewalStatus });
    }

    if (filters.urgency) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filters.urgency) {
        case 'overdue':
          AND.push({ endDate: { lt: today } });
          break;
        case 'due7': {
          const due7 = new Date(today);
          due7.setDate(due7.getDate() + 7);
          AND.push({ endDate: { gte: today, lte: due7 } });
          break;
        }
        case 'due30': {
          const due30 = new Date(today);
          due30.setDate(due30.getDate() + 30);
          AND.push({ endDate: { gte: today, lte: due30 } });
          break;
        }
        case 'future': {
          const future = new Date(today);
          future.setDate(future.getDate() + 30);
          AND.push({ endDate: { gt: future } });
          break;
        }
      }
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    const [data, total] = await Promise.all([
      db.policy.findMany({
        where,
        include: { client: true, policyType: true },
        orderBy: { endDate: 'asc' },
        skip,
        take: limit,
      }),
      db.policy.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(agentId: string, id: string) {
    const db = getDb();
    return db.policy.findFirst({
      where: { id, agentId },
      include: { client: true, policyType: true },
    });
  },

  async findByIdPublic(id: string) {
    const db = getDb();
    return db.policy.findUnique({
      where: { id },
      include: { client: true, policyType: true },
    });
  },

  async create(
    agentId: string,
    data: {
      clientId: string;
      policyTypeId: string;
      vehicleNumber?: string | null;
      policyNumber?: string | null;
      referenceNote?: string | null;
      typeNote?: string | null;
      endDate: Date;
      renewalStatus?: RenewalStatus;
      premiumPrice?: number | null;
      paymentLink?: string | null;
      renewalNotice?: string | null;
      additionalNotice?: string | null;
      isClaimed?: boolean;
      claimDate?: Date | null;
      claimAmount?: number | null;
    },
  ) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const policy = await tx.policy.create({
        data: {
          agentId,
          clientId: data.clientId,
          policyTypeId: data.policyTypeId,
          vehicleNumber: data.vehicleNumber ?? null,
          policyNumber: data.policyNumber ?? null,
          referenceNote: data.referenceNote ?? null,
          typeNote: data.typeNote ?? null,
          endDate: data.endDate,
          renewalStatus: data.renewalStatus ?? 'PENDING',
          premiumPrice: data.premiumPrice ?? null,
          paymentLink: data.paymentLink ?? null,
          renewalNotice: data.renewalNotice ?? null,
          additionalNotice: data.additionalNotice ?? null,
          isClaimed: data.isClaimed ?? false,
          claimDate: data.claimDate ?? null,
          claimAmount: data.claimAmount ?? null,
        },
        include: { client: true, policyType: true },
      });

      await tx.policyStatusHistory.create({
        data: {
          policyId: policy.id,
          previousStatus: null,
          newStatus: policy.renewalStatus,
          changedById: agentId,
        },
      });

      return policy;
    });
  },

  async update(agentId: string, id: string, data: Record<string, unknown>, changedById: string) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const existing = await tx.policy.findFirst({ where: { id, agentId } });
      if (!existing) return null;

      const previousStatus = existing.renewalStatus;
      const updated = await tx.policy.update({
        where: { id },
        data,
        include: { client: true, policyType: true },
      });

      if (data.renewalStatus !== undefined && data.renewalStatus !== previousStatus) {
        await tx.policyStatusHistory.create({
          data: {
            policyId: id,
            previousStatus,
            newStatus: data.renewalStatus as RenewalStatus,
            changedById,
          },
        });
      }

      return updated;
    });
  },

  async delete(agentId: string, id: string) {
    const db = getDb();
    const existing = await db.policy.findFirst({ where: { id, agentId } });
    if (!existing) return null;
    return db.policy.delete({ where: { id } });
  },

  async updateStatus(agentId: string, id: string, status: RenewalStatus, changedById: string) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const existing = await tx.policy.findFirst({ where: { id, agentId } });
      if (!existing) return null;

      const previousStatus = existing.renewalStatus;
      const updateData: Record<string, unknown> = { renewalStatus: status };
      if (status === 'REMINDED') {
        updateData.lastRemindedAt = new Date();
      }

      const updated = await tx.policy.update({
        where: { id },
        data: updateData,
        include: { client: true, policyType: true },
      });

      if (previousStatus !== status) {
        await tx.policyStatusHistory.create({
          data: {
            policyId: id,
            previousStatus,
            newStatus: status,
            changedById,
          },
        });
      }

      return updated;
    });
  },

  async getStats(agentId: string) {
    const db = getDb();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due7 = new Date(today);
    due7.setDate(due7.getDate() + 7);
    const due30 = new Date(today);
    due30.setDate(due30.getDate() + 30);

    const baseWhere = { agentId };

    const [total, overdue, due7Count, due30Count, futureCount, statusCounts] = await Promise.all([
      db.policy.count({ where: { ...baseWhere } }),
      db.policy.count({ where: { ...baseWhere, endDate: { lt: today } } }),
      db.policy.count({ where: { ...baseWhere, endDate: { gte: today, lte: due7 } } }),
      db.policy.count({ where: { ...baseWhere, endDate: { gte: today, lte: due30 } } }),
      db.policy.count({ where: { ...baseWhere, endDate: { gt: due30 } } }),
      Promise.all([
        db.policy.count({ where: { ...baseWhere, renewalStatus: 'PENDING' } }),
        db.policy.count({ where: { ...baseWhere, renewalStatus: 'REMINDED' } }),
        db.policy.count({ where: { ...baseWhere, renewalStatus: 'RENEWED' } }),
        db.policy.count({ where: { ...baseWhere, renewalStatus: 'NOT_RENEWED' } }),
        db.policy.count({ where: { ...baseWhere, renewalStatus: 'LAPSED' } }),
      ]),
    ]);

    return {
      total,
      overdue,
      due7: due7Count,
      due30: due30Count,
      future: futureCount,
      pending: statusCounts[0],
      reminded: statusCounts[1],
      renewed: statusCounts[2],
      notRenewed: statusCounts[3],
      lapsed: statusCounts[4],
    };
  },

  async getStatusHistory(policyId: string) {
    const db = getDb();
    return db.policyStatusHistory.findMany({
      where: { policyId },
      include: { changedBy: true },
      orderBy: { changedAt: 'desc' },
    });
  },
};
