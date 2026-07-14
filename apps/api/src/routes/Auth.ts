import type { FastifyPluginAsync } from 'fastify';
import { authController } from '@controllers/AuthController.js';
import { authenticate } from '@middlewares/Auth.js';

const authRoutes: FastifyPluginAsync = (fastify, _opts) => {
  fastify.post('/login', (req, reply) => authController.login(req, reply));
  fastify.post('/refresh', (req, reply) => authController.refresh(req, reply));
  fastify.post('/logout', (req, reply) => authController.logout(req, reply));
  fastify.get('/me', { preHandler: [authenticate] }, (req, reply) => authController.me(req, reply));

  return Promise.resolve();
};

export default authRoutes;
