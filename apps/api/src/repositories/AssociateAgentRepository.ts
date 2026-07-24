import { getDb } from '@database/index.js';
import { ConflictError } from '@errors/AppError.js';

export const associateAgentRepository = {
  async findAll(agentId: string, search?: string) {
    const db = getDb();
    const where: Record<string, unknown> = { agentId };

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term } },
        { mobileNumber: { contains: term } },
        { agencyName: { contains: term } },
      ];
    }

    return db.associateAgent.findMany({
      where,
      include: {
        _count: {
          select: { clients: true, policies: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(agentId: string, id: string) {
    const db = getDb();
    return db.associateAgent.findFirst({
      where: { id, agentId },
      include: {
        clients: true,
        policies: true,
        _count: {
          select: { clients: true, policies: true },
        },
      },
    });
  },

  async findByMobile(agentId: string, mobileNumber: string) {
    const db = getDb();
    return db.associateAgent.findFirst({
      where: { agentId, mobileNumber },
    });
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
    const db = getDb();
    const existing = await this.findByMobile(agentId, data.mobileNumber);
    if (existing) {
      throw new ConflictError('An associate agent with this mobile number already exists');
    }

    return db.associateAgent.create({
      data: {
        agentId,
        name: data.name,
        mobileNumber: data.mobileNumber,
        agencyName: data.agencyName || null,
        notes: data.notes || null,
      },
    });
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
    const db = getDb();
    const existing = await this.findById(agentId, id);
    if (!existing) return null;

    if (data.mobileNumber && data.mobileNumber !== existing.mobileNumber) {
      const duplicate = await this.findByMobile(agentId, data.mobileNumber);
      if (duplicate) {
        throw new ConflictError('An associate agent with this mobile number already exists');
      }
    }

    return db.associateAgent.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.mobileNumber !== undefined && { mobileNumber: data.mobileNumber }),
        ...(data.agencyName !== undefined && { agencyName: data.agencyName }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  },

  async delete(agentId: string, id: string) {
    const db = getDb();
    const existing = await db.associateAgent.findFirst({ where: { id, agentId } });
    if (!existing) return null;

    return db.associateAgent.delete({ where: { id } });
  },
};
