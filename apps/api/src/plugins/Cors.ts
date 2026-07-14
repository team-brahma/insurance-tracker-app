import fastifyCors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { appConfig } from '../config/index.js';

/**
 * CORS plugin.
 * Configures allowed origins from environment configuration.
 */
const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyCors, {
    origin: appConfig.isDevelopment ? true : appConfig.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  });
};

export default fp(corsPlugin, {
  name: 'cors',
  fastify: '5.x',
});

export { corsPlugin };
