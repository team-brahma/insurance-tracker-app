import { getDb } from '@database/index.js';

export const policyTypeRepository = {
  async findAll(search?: string, page?: number, limit?: number) {
    const db = getDb();

    const isPaginated = page !== undefined || limit !== undefined;
    const skip = isPaginated ? ((page ?? 1) - 1) * (limit ?? 10) : undefined;
    const take = isPaginated ? (limit ?? 10) : undefined;

    const where = search ? { name: { contains: search } } : undefined;

    const findOptions: Parameters<typeof db.policyTypeMaster.findMany>[0] = {
      orderBy: { name: 'asc' },
    };

    const countOptions: Parameters<typeof db.policyTypeMaster.count>[0] = {};

    if (where) {
      findOptions.where = where;
      countOptions.where = where;
    }

    if (skip !== undefined) {
      findOptions.skip = skip;
    }
    if (take !== undefined) {
      findOptions.take = take;
    }

    const [data, total] = await Promise.all([
      db.policyTypeMaster.findMany(findOptions),
      db.policyTypeMaster.count(countOptions),
    ]);

    return {
      data,
      meta: {
        total,
        page: page ?? 1,
        limit: limit ?? total,
        totalPages: isPaginated ? Math.ceil(total / (limit ?? 10)) : 1,
      },
    };
  },

  async findById(id: string) {
    const db = getDb();
    return db.policyTypeMaster.findUnique({
      where: { id },
    });
  },

  async findByName(name: string) {
    const db = getDb();
    return db.policyTypeMaster.findUnique({
      where: { name },
    });
  },

  async create(data: { name: string }) {
    const db = getDb();
    return db.policyTypeMaster.create({
      data: {
        name: data.name,
      },
    });
  },

  async update(id: string, data: Partial<{ name: string | undefined }>) {
    const db = getDb();
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;

    return db.policyTypeMaster.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    const db = getDb();
    return db.policyTypeMaster.delete({
      where: { id },
    });
  },
};
