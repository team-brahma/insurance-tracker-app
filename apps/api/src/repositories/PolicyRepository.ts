import { getDb } from '@database/index.js';
import type { RenewalStatus } from '@prisma/client';

export interface PolicyFilters {
  agentId: string;
  search?: string;
  policyType?: string | string[]; // This holds policyTypeId(s)
  renewalStatus?: RenewalStatus | RenewalStatus[];
  urgency?: 'overdue' | 'due7' | 'due30' | 'future';
  month?: string; // Format: YYYY-MM
  isOutsourced?: boolean;
  associateAgentId?: string;
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
    const baseAND: Record<string, unknown>[] = [];

    if (filters.search) {
      baseAND.push({
        OR: [
          { client: { insuredName: { contains: filters.search } } },
          { insuredPersonName: { contains: filters.search } },
          { referenceName: { contains: filters.search } },
          { vehicleNumber: { contains: filters.search } },
          { policyNumber: { contains: filters.search } },
          { associateAgent: { name: { contains: filters.search } } },
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

    if (filters.month) {
      const parts = filters.month.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0] ?? '', 10);
        const monthIndex = parseInt(parts[1] ?? '', 10) - 1;
        if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
          const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
          const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
          baseAND.push({ endDate: { gte: startOfMonth, lt: endOfMonth } });
        }
      }
    }

    if (filters.isOutsourced !== undefined) {
      baseAND.push({ isOutsourced: filters.isOutsourced });
    }

    if (filters.associateAgentId) {
      baseAND.push({ associateAgentId: filters.associateAgentId });
    }

    const dataAND = [...baseAND];

    if (filters.renewalStatus) {
      if (Array.isArray(filters.renewalStatus)) {
        dataAND.push({ renewalStatus: { in: filters.renewalStatus } });
      } else {
        dataAND.push({ renewalStatus: filters.renewalStatus });
      }
    }

    if (filters.urgency && !filters.renewalStatus) {
      dataAND.push({ renewalStatus: { notIn: ['RENEWED', 'INACTIVE'] } });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filters.urgency) {
        case 'overdue':
          dataAND.push({ endDate: { lt: today } });
          break;
        case 'due7': {
          const due7 = new Date(today);
          due7.setDate(due7.getDate() + 7);
          dataAND.push({ endDate: { gte: today, lte: due7 } });
          break;
        }
        case 'due30': {
          const due30 = new Date(today);
          due30.setDate(due30.getDate() + 30);
          dataAND.push({ endDate: { gte: today, lte: due30 } });
          break;
        }
        case 'future': {
          const future = new Date(today);
          future.setDate(future.getDate() + 30);
          dataAND.push({ endDate: { gt: future } });
          break;
        }
      }
    }

    if (dataAND.length > 0) {
      where.AND = dataAND;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due7Date = new Date(today);
    due7Date.setDate(due7Date.getDate() + 7);
    const due30Date = new Date(today);
    due30Date.setDate(due30Date.getDate() + 30);

    const buildCountWhere = (...extraFilters: Record<string, unknown>[]) => {
      const countWhere: Record<string, unknown> = { agentId: filters.agentId };
      const countAND = [...baseAND, ...extraFilters];
      if (countAND.length > 0) {
        countWhere.AND = countAND;
      }
      return countWhere;
    };

    const notUrgentOrInactive = { renewalStatus: { notIn: ['RENEWED', 'INACTIVE'] } };

    const [
      data,
      total,
      totalMatching,
      overdueCount,
      due7Count,
      due30Count,
      futureCount,
      renewedCount,
      inactiveCount,
    ] = await Promise.all([
      db.policy.findMany({
        where,
        include: {
          client: { include: { associateAgent: true } },
          policyType: true,
          insuranceProvider: true,
          associateAgent: true,
        },
        orderBy: [{ endDate: 'asc' }, { client: { insuredName: 'asc' } }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.policy.count({ where }),
      db.policy.count({ where: buildCountWhere() }),
      db.policy.count({ where: buildCountWhere({ endDate: { lt: today } }, notUrgentOrInactive) }),
      db.policy.count({
        where: buildCountWhere({ endDate: { gte: today, lte: due7Date } }, notUrgentOrInactive),
      }),
      db.policy.count({
        where: buildCountWhere({ endDate: { gte: today, lte: due30Date } }, notUrgentOrInactive),
      }),
      db.policy.count({ where: buildCountWhere({ endDate: { gt: due30Date } }, notUrgentOrInactive) }),
      db.policy.count({ where: buildCountWhere({ renewalStatus: 'RENEWED' }) }),
      db.policy.count({ where: buildCountWhere({ renewalStatus: 'INACTIVE' }) }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        urgencyCounts: {
          overdue: overdueCount,
          due7: due7Count,
          due30: due30Count,
          future: futureCount,
          renewed: renewedCount,
          inactive: inactiveCount,
          all: totalMatching,
        },
      },
    };
  },

  async findById(agentId: string, id: string) {
    const db = getDb();
    return db.policy.findFirst({
      where: { id, agentId },
      include: {
        client: { include: { associateAgent: true } },
        policyType: true,
        insuranceProvider: true,
        associateAgent: true,
      },
    });
  },

  async findByIdPublic(id: string) {
    const db = getDb();
    return db.policy.findUnique({
      where: { id },
      include: {
        client: { include: { associateAgent: true } },
        policyType: true,
        insuranceProvider: true,
        associateAgent: true,
      },
    });
  },

  async create(
    agentId: string,
    data: {
      clientId: string;
      policyTypeId: string;
      insuranceProviderId?: string | null;
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
      insuredPersonName?: string | null;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    },
  ) {
    const db = getDb();
    return db.$transaction(async (tx) => {
      const policy = await tx.policy.create({
        data: {
          agentId,
          clientId: data.clientId,
          policyTypeId: data.policyTypeId,
          insuranceProviderId: data.insuranceProviderId ?? null,
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
          insuredPersonName: data.insuredPersonName ?? null,
          isOutsourced: data.isOutsourced ?? false,
          associateAgentId: data.associateAgentId ?? null,
        },
        include: {
          client: { include: { associateAgent: true } },
          policyType: true,
          insuranceProvider: true,
          associateAgent: true,
        },
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
        include: {
          client: { include: { associateAgent: true } },
          policyType: true,
          insuranceProvider: true,
          associateAgent: true,
        },
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
        include: {
          client: { include: { associateAgent: true } },
          policyType: true,
          insuranceProvider: true,
          associateAgent: true,
        },
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
        db.policy.count({ where: { ...baseWhere, renewalStatus: 'INACTIVE' } }),
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
      inactive: statusCounts[5],
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
