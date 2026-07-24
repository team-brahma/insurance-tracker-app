import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { associateAgentController } from '@controllers/AssociateAgentController.js';
import { authenticate } from '@middlewares/Auth.js';

const associateAgentRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) =>
    associateAgentController.list(req, reply),
  );

  fastify.get('/:id', { preHandler: [authenticate] }, (req, reply) =>
    associateAgentController.getById(req, reply),
  );

  fastify.post('/', { preHandler: [authenticate] }, (req, reply) =>
    associateAgentController.create(req, reply),
  );

  fastify.put('/:id', { preHandler: [authenticate] }, (req, reply) =>
    associateAgentController.update(req, reply),
  );

  fastify.delete('/:id', { preHandler: [authenticate] }, (req, reply) =>
    associateAgentController.delete(req, reply),
  );

  await Promise.resolve();
};

export default associateAgentRoutes;
