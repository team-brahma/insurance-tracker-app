import { getDb } from '@database/index.js';

export interface CreateDocumentInput {
  year: number;
  fileName: string;
  fileData: string;
  fileSize?: number | null;
  mimeType?: string | null;
}

export const policyDocumentRepository = {
  async createMany(policyId: string, documents: CreateDocumentInput[]) {
    const db = getDb();
    const records = documents.map((doc) => ({
      policyId,
      year: doc.year,
      fileName: doc.fileName,
      fileData: doc.fileData,
      fileSize: doc.fileSize ?? null,
      mimeType: doc.mimeType ?? 'application/pdf',
    }));

    await db.policyDocument.createMany({
      data: records,
    });

    return db.policyDocument.findMany({
      where: { policyId },
      select: {
        id: true,
        policyId: true,
        year: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async findByPolicyId(policyId: string, params?: { search?: string; page?: number; limit?: number }) {
    const db = getDb();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;

    let allDocs = await db.policyDocument.findMany({
      where: { policyId },
      select: {
        id: true,
        policyId: true,
        year: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    if (params?.search && params.search.trim()) {
      const searchStr = params.search.trim().toLowerCase();
      allDocs = allDocs.filter(
        (doc) =>
          doc.year.toString().includes(searchStr) ||
          doc.fileName.toLowerCase().includes(searchStr),
      );
    }

    const total = allDocs.length;
    const skip = (page - 1) * limit;
    const data = allDocs.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async findById(id: string) {
    const db = getDb();
    return db.policyDocument.findUnique({
      where: { id },
      include: {
        policy: {
          select: {
            id: true,
            agentId: true,
          },
        },
      },
    });
  },

  async deleteById(id: string) {
    const db = getDb();
    return db.policyDocument.delete({
      where: { id },
    });
  },
};
