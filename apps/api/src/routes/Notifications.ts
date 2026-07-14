import type { FastifyPluginAsync } from 'fastify';
import { authenticate, assertAuthenticated } from '@middlewares/Auth.js';
import { userRepository } from '@repositories/UserRepository.js';
import { runRenewalNotificationJob } from '@services/NotificationService.js';
import { getDb } from '@database/index.js';
import { HTTP_STATUS } from '@repo/constants';

/**
 * Notification routes
 *
 * PATCH /api/v1/notifications/token
 *   Allows authenticated agents to update their FCM device token.
 *   Called when Capacitor reports a token refresh event, or when the app
 *   starts on native and the token changes.
 */
const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/notifications
   *   Returns upcoming policy renewals and enquiry follow-ups for the
   *   authenticated user, sorted by urgency (days left ascending).
   */
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = assertAuthenticated(request);
    const db = getDb();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    const [policies, enquiries] = await Promise.all([
      db.policy.findMany({
        where: {
          agentId: id,
          renewalStatus: { in: ['PENDING', 'REMINDED'] },
          endDate: { lte: maxDate },
        },
        include: { client: true, policyType: true },
        orderBy: { endDate: 'asc' },
      }),
      db.enquiry.findMany({
        where: {
          agentId: id,
          status: 'OPEN',
          remindOn: { gte: today, lte: maxDate },
        },
        include: { policyType: true },
        orderBy: { remindOn: 'asc' },
      }),
    ]);

    const msPerDay = 24 * 60 * 60 * 1000;

    const policyItems = policies.map((p) => ({
      id: p.id,
      type: 'policy_renewal' as const,
      clientName: p.client.insuredName,
      policyType: p.policyType.name,
      policyNumber: p.policyNumber,
      premiumPrice: p.premiumPrice ? Number(p.premiumPrice) : null,
      clientPhone: p.client.mobileNumber,
      vehicleNumber: p.vehicleNumber,
      endDate: p.endDate.toISOString(),
      daysLeft: Math.round((p.endDate.getTime() - today.getTime()) / msPerDay),
      renewalStatus: p.renewalStatus,
    }));

    const enquiryItems = enquiries.map((e) => ({
      id: e.id,
      type: 'enquiry_followup' as const,
      name: e.name,
      mobileNumber: e.mobileNumber,
      policyType: e.policyType.name,
      referredBy: e.referredBy,
      remindOn: e.remindOn!.toISOString(),
      daysLeft: Math.round((e.remindOn!.getTime() - today.getTime()) / msPerDay),
      createdAt: e.createdAt.toISOString(),
    }));

    const allItems = [...policyItems, ...enquiryItems].sort((a, b) => a.daysLeft - b.daysLeft);

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: {
        policies: policyItems,
        enquiries: enquiryItems,
        items: allItems,
        totalCount: allItems.length,
      },
    });
  });

  /**
   * GET /api/v1/notifications/count
   *   Lightweight endpoint — returns only the total count of upcoming
   *   policy renewals and enquiry follow-ups. Used by navigation badges
   *   to avoid fetching the full list on every page load.
   */
  fastify.get('/count', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = assertAuthenticated(request);
    const db = getDb();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    const [policyCount, enquiryCount] = await Promise.all([
      db.policy.count({
        where: {
          agentId: id,
          renewalStatus: { in: ['PENDING', 'REMINDED'] },
          endDate: { lte: maxDate },
        },
      }),
      db.enquiry.count({
        where: {
          agentId: id,
          status: 'OPEN',
          remindOn: { gte: today, lte: maxDate },
        },
      }),
    ]);

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: { totalCount: policyCount + enquiryCount },
    });
  });

  fastify.patch('/token', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = assertAuthenticated(request);
    const body = request.body as {
      fcmToken?: string | null;
      fcm_token?: string | null;
    };
    const fcmToken = body.fcmToken ?? body.fcm_token ?? null;

    if (fcmToken !== null && typeof fcmToken !== 'string') {
      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        error: { message: 'fcmToken/fcm_token must be a string or null' },
      });
    }

    await userRepository.updateFcmToken(id, fcmToken);

    return reply.code(HTTP_STATUS.OK).send({ success: true, message: 'FCM token updated' });
  });

  /**
   * POST /api/v1/notifications/trigger
   *   Manually triggers the renewal notification job for testing.
   *   Any authenticated user can trigger it — notifications are sent
   *   to all agents who have policies matching the reminder offsets.
   */
  fastify.post('/trigger', { preHandler: [authenticate] }, async (request, reply) => {
    assertAuthenticated(request);
    const summary = await runRenewalNotificationJob();
    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      message: 'Notification job completed',
      data: summary,
    });
  });

  await Promise.resolve();
};

export default notificationRoutes;
