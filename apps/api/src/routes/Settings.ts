import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { settingsController } from '@controllers/SettingsController.js';

const settingsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', (req, reply) => settingsController.get(req, reply));

  fastify.put('/', (req, reply) => settingsController.update(req, reply));

  await Promise.resolve();
};

export default settingsRoutes;
