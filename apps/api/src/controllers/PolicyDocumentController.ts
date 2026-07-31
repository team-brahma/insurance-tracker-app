import type { FastifyRequest, FastifyReply } from 'fastify';
import { policyDocumentService } from '@services/PolicyDocumentService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { HTTP_STATUS } from '@repo/constants';
import { ValidationError } from '@errors/AppError.js';

export const policyDocumentController = {
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id: policyId } = request.params as { id: string };
    const body = request.body as { year?: number; documents: { year?: number; fileName: string; fileData: string; fileSize?: number; mimeType?: string }[] };

    if (!body || typeof body !== 'object' || !Array.isArray(body.documents)) {
      throw new ValidationError('Invalid request payload');
    }

    const docsInput = body.documents.map((d) => ({
      ...d,
      year: Number(d.year ?? body.year),
    }));

    const docs = await policyDocumentService.uploadDocuments(
      agentId,
      policyId,
      docsInput,
    );

    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: docs });
  },

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id: policyId } = request.params as { id: string };
    const query = request.query as Record<string, string | undefined>;

    const params: { search?: string; page?: number; limit?: number } = {};
    if (query.search) params.search = query.search;
    if (query.page) params.page = parseInt(query.page, 10);
    if (query.limit) params.limit = parseInt(query.limit, 10);

    const result = await policyDocumentService.listDocuments(agentId, policyId, params);

    return reply.code(HTTP_STATUS.OK).send({ success: true, ...result });
  },

  async downloadFile(request: FastifyRequest, reply: FastifyReply) {
    const { docId } = request.params as { id: string; docId: string };

    const file = await policyDocumentService.getDocumentFile(docId);

    return reply
      .code(HTTP_STATUS.OK)
      .header('Content-Type', file.mimeType)
      .header('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`)
      .send(file.buffer);
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id: policyId, docId } = request.params as { id: string; docId: string };

    await policyDocumentService.deleteDocument(agentId, policyId, docId);

    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  },
};
