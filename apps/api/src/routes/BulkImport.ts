import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { bulkImportController } from '@controllers/BulkImportController.js';

const bulkRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/template', async (request: FastifyRequest, reply: FastifyReply) => {
    return bulkImportController.downloadTemplate(request, reply);
  });

  fastify.post('/import', async (request: FastifyRequest, reply: FastifyReply) => {
    return bulkImportController.uploadAndImport(request, reply);
  });

  fastify.post('/export-report', async (request: FastifyRequest, reply: FastifyReply) => {
    return bulkImportController.exportReport(request, reply);
  });

  await Promise.resolve();
};

export default bulkRoutes;
