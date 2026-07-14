import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { clientController } from '@controllers/ClientController.js';

const clientRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/', (req, reply) => clientController.create(req, reply));

  fastify.get('/', (req, reply) => clientController.list(req, reply));

  fastify.get('/:id', (req, reply) => clientController.getById(req, reply));

  fastify.put('/:id', (req, reply) => clientController.update(req, reply));

  fastify.delete('/:id', (req, reply) => clientController.delete(req, reply));

  await Promise.resolve();
};

export default clientRoutes;
