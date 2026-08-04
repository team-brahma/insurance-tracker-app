import { getDb } from '@database/index.js';
import { ConflictError } from '@errors/AppError.js';

export const clientRepository = {
  async findAll(
    agentId: string,
    search?: string,
    page = 1,
    limit = 20,
    exactMobile?: string,
    exactName?: string,
    isOutsourced?: boolean,
    associateAgentId?: string,
  ) {
    const db = getDb();
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = { agentId };

    const mobile = exactMobile && exactMobile.trim().length > 0 ? exactMobile.trim() : undefined;
    const name = exactName && exactName.trim().length > 0 ? exactName.trim() : undefined;

    if (mobile && name) {
      const digits = mobile.replace(/\D/g, '').slice(-10);
      where = {
        agentId,
        OR: [
          ...(digits.length >= 6 ? [{ mobileNumber: { endsWith: digits } }] : []),
          { insuredName: name },
        ],
      };
    } else if (mobile) {
      const digits = mobile.replace(/\D/g, '').slice(-10);
      where = digits.length >= 6 ? { agentId, mobileNumber: { endsWith: digits } } : { agentId };
    } else if (name) {
      where = { agentId, insuredName: name };
    } else if (search) {
      where = {
        agentId,
        OR: [
          { insuredName: { contains: search } },
          { referenceName: { contains: search } },
          { mobileNumber: { contains: search } },
          { associateAgent: { name: { contains: search } } },
        ],
      };
    }

    if (isOutsourced !== undefined) {
      where.isOutsourced = isOutsourced;
    }
    if (associateAgentId) {
      where.associateAgentId = associateAgentId;
    }

    const [data, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          associateAgent: true,
          policies: {
            include: { policyType: true, insuranceProvider: true, associateAgent: true },
            orderBy: { endDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.client.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async findById(agentId: string, id: string) {
    const db = getDb();
    return db.client.findFirst({
      where: { id, agentId },
      include: {
        associateAgent: true,
        policies: { include: { policyType: true, insuranceProvider: true, associateAgent: true } },
      },
    });
  },

  async findByMobile(agentId: string, mobileNumber: string) {
    const db = getDb();
    return db.client.findFirst({
      where: { mobileNumber, agentId },
      include: { associateAgent: true },
    });
  },

  async findByName(agentId: string, name: string) {
    const db = getDb();
    return db.client.findFirst({
      where: { insuredName: name, agentId },
      include: { associateAgent: true },
    });
  },

  async findOrCreate(
    agentId: string,
    data: {
      insuredName: string;
      referenceName?: string | null;
      mobileNumber: string;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    },
  ) {
    const existing = await this.findByName(agentId, data.insuredName);
    if (existing) return existing;

    return this.create(agentId, data);
  },

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
    const db = getDb();
    const existing = await this.findByMobile(agentId, data.mobileNumber);
    if (existing) {
      throw new ConflictError('A client with this phone number already exists');
    }
    return db.client.create({
      data: {
        agentId,
        insuredName: data.insuredName,
        referenceName: data.referenceName || null,
        mobileNumber: data.mobileNumber,
        isOutsourced: data.isOutsourced ?? false,
        associateAgentId: data.associateAgentId || null,
      },
      include: {
        associateAgent: true,
      },
    });
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
    const db = getDb();
    const existing = await db.client.findFirst({ where: { id, agentId } });
    if (!existing) return null;

    if (data.mobileNumber !== undefined && data.mobileNumber !== existing.mobileNumber) {
      const duplicate = await this.findByMobile(agentId, data.mobileNumber);
      if (duplicate) {
        throw new ConflictError('A client with this phone number already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.insuredName !== undefined) updateData.insuredName = data.insuredName;
    if (data.referenceName !== undefined) updateData.referenceName = data.referenceName;
    if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber;
    if (data.isOutsourced !== undefined) updateData.isOutsourced = data.isOutsourced;
    if (data.associateAgentId !== undefined) updateData.associateAgentId = data.associateAgentId;

    return db.client.update({
      where: { id },
      data: updateData,
      include: {
        associateAgent: true,
      },
    });
  },

  async delete(agentId: string, id: string) {
    const db = getDb();
    const existing = await db.client.findFirst({ where: { id, agentId } });
    if (!existing) return null;
    return db.client.delete({ where: { id } });
  },
};
