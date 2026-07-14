import fastifyHelmet from '@fastify/helmet';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Helmet plugin.
 * Sets security-related HTTP headers.
 */
const helmetPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  });
};

export default fp(helmetPlugin, {
  name: 'helmet',
  fastify: '5.x',
});

export { helmetPlugin };
