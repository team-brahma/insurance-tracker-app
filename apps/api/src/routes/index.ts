import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './Health.js';
import authRoutes from './Auth.js';
import policyRoutes from './Policies.js';
import clientRoutes from './Clients.js';
import settingsRoutes from './Settings.js';
import statsRoutes from './Stats.js';
import userRoutes from './Users.js';
import enquiryRoutes from './Enquiries.js';
import notificationRoutes from './Notifications.js';
import policyTypeRoutes from './PolicyTypes.js';
import bulkRoutes from './BulkImport.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });

  await app.register(policyRoutes, { prefix: '/api/v1/policies' });
  await app.register(clientRoutes, { prefix: '/api/v1/clients' });
  await app.register(enquiryRoutes, { prefix: '/api/v1/enquiries' });
  await app.register(settingsRoutes, { prefix: '/api/v1/settings' });
  await app.register(statsRoutes, { prefix: '/api/v1/stats' });
  await app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await app.register(policyTypeRoutes, { prefix: '/api/v1/policy-types' });
  await app.register(bulkRoutes, { prefix: '/api/v1/bulk' });
}
