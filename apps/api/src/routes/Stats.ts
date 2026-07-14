import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { policyController } from '@controllers/PolicyController.js';

const statsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', (req, reply) => policyController.stats(req, reply));

  await Promise.resolve();
};

export default statsRoutes;
