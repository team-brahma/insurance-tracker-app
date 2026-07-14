import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { policyTypeController } from '@controllers/PolicyTypeController.js';
import { authenticate } from '@middlewares/Auth.js';

const policyTypeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) =>
    policyTypeController.list(req, reply),
  );

  fastify.get('/:id', { preHandler: [authenticate] }, (req, reply) =>
    policyTypeController.getById(req, reply),
  );

  fastify.post('/', { preHandler: [authenticate] }, (req, reply) =>
    policyTypeController.create(req, reply),
  );

  fastify.put('/:id', { preHandler: [authenticate] }, (req, reply) =>
    policyTypeController.update(req, reply),
  );

  fastify.delete('/:id', { preHandler: [authenticate] }, (req, reply) =>
    policyTypeController.delete(req, reply),
  );

  await Promise.resolve();
};

export default policyTypeRoutes;
