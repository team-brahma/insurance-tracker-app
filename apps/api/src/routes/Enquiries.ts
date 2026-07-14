import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { enquiryController } from '@controllers/EnquiryController.js';

const enquiryRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', (req, reply) => enquiryController.list(req, reply));
  fastify.get('/:id', (req, reply) => enquiryController.getById(req, reply));
  fastify.post('/', (req, reply) => enquiryController.create(req, reply));
  fastify.put('/:id', (req, reply) => enquiryController.update(req, reply));
  fastify.delete('/:id', (req, reply) => enquiryController.delete(req, reply));
  fastify.patch('/:id/status', (req, reply) => enquiryController.updateStatus(req, reply));
  fastify.get('/:id/status-history', (req, reply) =>
    enquiryController.getStatusHistory(req, reply),
  );

  await Promise.resolve();
};

export default enquiryRoutes;
