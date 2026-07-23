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
  ) {
    const db = getDb();
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = { agentId };

    // Strip empty-string sentinels so the logic below works correctly.
    // Axios/Fastify may pass empty strings for absent params.
    const mobile = exactMobile && exactMobile.trim().length > 0 ? exactMobile.trim() : undefined;
    const name = exactName && exactName.trim().length > 0 ? exactName.trim() : undefined;

    if (mobile && name) {
      // Extract last 10 digits of mobile so enquiries stored as
      // "9876543212" still match client records stored as "+919876543212".
      // Uses endsWith (not contains) to avoid accidentally matching
      // other clients whose numbers share a longer common substring.
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
      // General search: match on either insuredName or mobileNumber
      where = {
        agentId,
        OR: [{ insuredName: { contains: search } }, { mobileNumber: { contains: search } }],
      };
    }

    const [data, total] = await Promise.all([
      db.client.findMany({
        where,
        include: { policies: { include: { policyType: true, insuranceProvider: true } } },
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
      include: { policies: { include: { policyType: true, insuranceProvider: true } } },
    });
  },

  async findByMobile(agentId: string, mobileNumber: string) {
    const db = getDb();
    return db.client.findFirst({ where: { mobileNumber, agentId } });
  },

  async findByName(agentId: string, name: string) {
    const db = getDb();
    return db.client.findFirst({ where: { insuredName: name, agentId } });
  },

  async findOrCreate(
    agentId: string,
    data: {
      insuredName: string;
      mobileNumber: string;
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
      mobileNumber: string;
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
        mobileNumber: data.mobileNumber,
      },
    });
  },

  async update(agentId: string, id: string, data: { insuredName?: string; mobileNumber?: string }) {
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
    if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber;
    return db.client.update({ where: { id }, data: updateData });
  },

  async delete(agentId: string, id: string) {
    const db = getDb();
    const existing = await db.client.findFirst({ where: { id, agentId } });
    if (!existing) return null;
    return db.client.delete({ where: { id } });
  },
};
