import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { insuranceProviderController } from '@controllers/InsuranceProviderController.js';
import { authenticate } from '@middlewares/Auth.js';

const insuranceProviderRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) =>
    insuranceProviderController.list(req, reply),
  );

  fastify.get('/:id', { preHandler: [authenticate] }, (req, reply) =>
    insuranceProviderController.getById(req, reply),
  );

  fastify.post('/', { preHandler: [authenticate] }, (req, reply) =>
    insuranceProviderController.create(req, reply),
  );

  fastify.put('/:id', { preHandler: [authenticate] }, (req, reply) =>
    insuranceProviderController.update(req, reply),
  );

  fastify.delete('/:id', { preHandler: [authenticate] }, (req, reply) =>
    insuranceProviderController.delete(req, reply),
  );

  await Promise.resolve();
};

export default insuranceProviderRoutes;
