import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Health check routes.
 *
 * GET /health  — basic liveness probe
 * GET /health/ready — readiness probe (checks DB connectivity)
 */
const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * @route GET /health
   * @description Liveness probe — returns 200 if the process is running.
   */
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Liveness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok'] },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
            },
            required: ['status', 'timestamp', 'uptime'],
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.code(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    },
  );

  /**
   * @route GET /health/ready
   * @description Readiness probe — checks external dependencies.
   */
  fastify.get(
    '/health/ready',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness probe',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ready'] },
              timestamp: { type: 'string' },
            },
            required: ['status', 'timestamp'],
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['not_ready'] },
              timestamp: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      // TODO: Add database ping check here when Prisma client is integrated.
      return reply.code(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    },
  );
  await Promise.resolve();
};

export default fp(healthRoutes, {
  name: 'health-routes',
  fastify: '5.x',
});

export { healthRoutes };
