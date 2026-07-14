import fastifySensible from '@fastify/sensible';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Sensible plugin.
 * Adds useful Fastify utilities: http errors, reply decorators, etc.
 */
const sensiblePlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifySensible);
};

export default fp(sensiblePlugin, {
  name: 'sensible',
  fastify: '5.x',
});

export { sensiblePlugin };
