import type { FastifyPluginAsync } from 'fastify';
import { userController } from '@controllers/UserController.js';
import { authenticate } from '@middlewares/Auth.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [authenticate] }, (req, reply) => userController.list(req, reply));
  fastify.post('/', { preHandler: [authenticate] }, (req, reply) =>
    userController.create(req, reply),
  );
  fastify.delete('/:id', { preHandler: [authenticate] }, (req, reply) =>
    userController.delete(req, reply),
  );

  await Promise.resolve();
};

export default userRoutes;
