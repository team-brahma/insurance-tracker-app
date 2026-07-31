import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { policyController } from '@controllers/PolicyController.js';
import { policyDocumentController } from '@controllers/PolicyDocumentController.js';

const policyRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', (req, reply) => policyController.list(req, reply));
  fastify.get('/:id', (req, reply) => policyController.getById(req, reply));
  fastify.post('/', (req, reply) => policyController.create(req, reply));
  fastify.put('/:id', (req, reply) => policyController.update(req, reply));
  fastify.delete('/:id', (req, reply) => policyController.delete(req, reply));
  fastify.patch('/:id/status', (req, reply) => policyController.updateStatus(req, reply));
  fastify.get('/:id/status-history', (req, reply) => policyController.getStatusHistory(req, reply));
  fastify.get('/:id/renewal-notice', (req, reply) =>
    policyController.getRenewalNoticePdf(req, reply),
  );
  fastify.get('/stats', (req, reply) => policyController.stats(req, reply));

  // ── Policy Documents Routes ────────────────────────────────────────────────
  fastify.post('/:id/documents', (req, reply) => policyDocumentController.upload(req, reply));
  fastify.get('/:id/documents', (req, reply) => policyDocumentController.list(req, reply));
  fastify.get('/:id/documents/:docId/file', (req, reply) => policyDocumentController.downloadFile(req, reply));
  fastify.delete('/:id/documents/:docId', (req, reply) => policyDocumentController.delete(req, reply));

  await Promise.resolve();
};

export default policyRoutes;
