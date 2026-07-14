import Fastify, { type FastifyInstance } from 'fastify';
import { appConfig } from './config/index.js';
import { corsPlugin } from './plugins/Cors.js';
import { helmetPlugin } from './plugins/Helmet.js';
import { sensiblePlugin } from './plugins/Sensible.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middlewares/ErrorHandler.js';
import { authenticate } from './middlewares/Auth.js';
import { keysToCamelCase, keysToSnakeCase } from '@repo/utils';
import fastifyMultipart from '@fastify/multipart';

const PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
];

/**
 * Fastify application factory.
 *
 * Constructs and configures the Fastify instance with all plugins and routes.
 * Separating build from listen allows easy testing.
 *
 * @returns A fully configured Fastify instance.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: appConfig.isDevelopment ? 'debug' : 'info',
      transport: appConfig.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    } as Record<string, unknown>,
    disableRequestLogging: false,
    trustProxy: true,
  });

  // ── Error handler ────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Security plugins ─────────────────────────────────────────────────────
  await app.register(corsPlugin);
  await app.register(helmetPlugin);

  // ── Global casing conversion hooks ───────────────────────────────────────
  app.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = keysToCamelCase(request.body);
    }
    if (request.query && typeof request.query === 'object') {
      request.query = keysToCamelCase(request.query);
    }
    await Promise.resolve();
  });

  app.addHook('preSerialization', async (_, __, payload) => {
    if (payload && typeof payload === 'object') {
      return keysToSnakeCase(payload);
    }
    return payload;
  });

  // ── Global auth hook — protect all /api/v1/* routes except public auth paths ──
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      return;
    }
    const path = request.url.split('?')[0] ?? '';
    const isPublic =
      PUBLIC_PATHS.includes(path) || /^\/api\/v1\/policies\/[^/]+\/renewal-notice$/.test(path);
    if (path.startsWith('/api/v1') && !isPublic) {
      await authenticate(request, reply);
    }
  });

  // ── Utility plugins ──────────────────────────────────────────────────────
  await app.register(sensiblePlugin);

  // ── File upload plugin ───────────────────────────────────────────────────
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  await registerRoutes(app);

  return app;
}
