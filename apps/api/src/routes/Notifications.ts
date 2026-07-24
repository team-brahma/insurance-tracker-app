import type { FastifyPluginAsync } from 'fastify';
import { authenticate, assertAuthenticated } from '@middlewares/Auth.js';
import { userRepository } from '@repositories/UserRepository.js';
import { runRenewalNotificationJob } from '@services/NotificationService.js';
import { getDb } from '@database/index.js';
import { HTTP_STATUS } from '@repo/constants';
import { appConfig } from '@config/index.js';
import { ForbiddenError } from '@errors/AppError.js';
import { RenewalStatus, EnquiryStatus, type Prisma } from '@prisma/client';

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
   *   Supports pagination (page, limit) and filtering by type (all, policies, enquiries).
   */
  fastify.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = assertAuthenticated(request);
    const query = request.query as {
      page?: string;
      limit?: string;
      type?: 'all' | 'policies' | 'enquiries';
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const filterType = query.type || 'all';

    const db = getDb();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    const msPerDay = 24 * 60 * 60 * 1000;

    const policyWhere: Prisma.PolicyWhereInput = {
      agentId: id,
      renewalStatus: { in: [RenewalStatus.PENDING, RenewalStatus.REMINDED] },
      endDate: { lte: maxDate },
    };

    const enquiryWhere: Prisma.EnquiryWhereInput = {
      agentId: id,
      status: EnquiryStatus.OPEN,
      remindOn: { gte: today, lte: maxDate },
    };

    const [policyCount, enquiryCount] = await Promise.all([
      db.policy.count({ where: policyWhere }),
      db.enquiry.count({ where: enquiryWhere }),
    ]);

    let items: Array<any> = [];
    let totalCount = 0;

    if (filterType === 'policies') {
      totalCount = policyCount;
      const policies = await db.policy.findMany({
        where: policyWhere,
        include: { client: true, policyType: true },
        orderBy: { endDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      items = policies.map((p) => ({
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
    } else if (filterType === 'enquiries') {
      totalCount = enquiryCount;
      const enquiries = await db.enquiry.findMany({
        where: enquiryWhere,
        include: { policyType: true },
        orderBy: { remindOn: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      items = enquiries.map((e) => ({
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
    } else {
      totalCount = policyCount + enquiryCount;
      const [policies, enquiries] = await Promise.all([
        db.policy.findMany({
          where: policyWhere,
          include: { client: true, policyType: true },
          orderBy: { endDate: 'asc' },
        }),
        db.enquiry.findMany({
          where: enquiryWhere,
          include: { policyType: true },
          orderBy: { remindOn: 'asc' },
        }),
      ]);

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
      items = allItems.slice((page - 1) * limit, page * limit);
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: {
        items,
        counts: {
          totalCount: policyCount + enquiryCount,
          policyCount,
          enquiryCount,
        },
      },
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
      },
    });
  });

  /**
   * GET /api/v1/notifications/count
   *   Lightweight endpoint — returns counts of upcoming policy renewals and enquiry follow-ups.
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
      data: {
        totalCount: policyCount + enquiryCount,
        policyCount,
        enquiryCount,
      },
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

  /**
   * POST /api/v1/notifications/test-trigger
   *   Manually triggers the renewal notification job bypassing today's check,
   *   allowing developers to trigger it multiple times in dev environment.
   */
  fastify.post('/test-trigger', { preHandler: [authenticate] }, async (request, reply) => {
    assertAuthenticated(request);
    if (!appConfig.isDevelopment) {
      throw new ForbiddenError('This endpoint is only available in development mode.');
    }
    const summary = await runRenewalNotificationJob(undefined, true);
    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      message: "Today's notification logic triggered successfully (test run).",
      data: summary,
    });
  });

  /**
   * POST /api/v1/notifications/test-push
   *   Sends a direct push notification to the logged-in user's registered FCM token.
   *   Only available in development mode.
   */
  fastify.post('/test-push', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = assertAuthenticated(request);
    if (!appConfig.isDevelopment) {
      throw new ForbiddenError('This endpoint is only available in development mode.');
    }

    const db = getDb();
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user || !user.fcmToken) {
      return reply.code(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        error: { message: 'No FCM token registered for this user/agent.' },
      });
    }

    const body = request.body as { title?: string; message?: string };
    const title = body.title || '🔔 Test Push Notification';
    const message =
      body.message || 'This is a test push notification from Insurance Tracker dev monitor.';

    // Send push notification helper
    const { sendPushNotification } = await import('@services/NotificationService.js');
    const result = await sendPushNotification(user.fcmToken, {
      title,
      body: message,
      data: {
        type: 'test',
        remindedAt: new Date().toISOString(),
      },
    });

    if (result.success) {
      return reply.code(HTTP_STATUS.OK).send({
        success: true,
        message: 'Test push notification sent successfully.',
        data: result,
      });
    } else {
      return reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        success: false,
        error: { message: `FCM failed: ${result.error ?? 'Unknown error'}` },
      });
    }
  });

  /**
   * POST /api/v1/notifications/create-test-data
   *   Seeds mock policies and enquiries that match today's notification offsets (7d, 1d, and 0d).
   *   Only available in development mode.
   */
  fastify.post('/create-test-data', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = assertAuthenticated(request);
    if (!appConfig.isDevelopment) {
      throw new ForbiddenError('This endpoint is only available in development mode.');
    }

    const db = getDb();

    // Find or create a test client for this agent
    let client = await db.client.findFirst({
      where: { agentId: id, insuredName: 'Test Customer' },
    });

    if (!client) {
      // Find a unique name
      const timestamp = String(Date.now()).slice(-4);
      client = await db.client.create({
        data: {
          agentId: id,
          insuredName: `Test Customer ${timestamp}`,
          mobileNumber: `98765${timestamp}`,
        },
      });
    }

    // Find or create a policy type master
    let policyType = await db.policyTypeMaster.findFirst({
      where: { name: 'Health' },
    });
    if (!policyType) {
      policyType = await db.policyTypeMaster.create({
        data: { name: 'Health' },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a policy expiring in 7 days (matching offset 7)
    const policy7dDate = new Date(today);
    policy7dDate.setDate(today.getDate() + 7);

    const policy7d = await db.policy.create({
      data: {
        agentId: id,
        clientId: client.id,
        policyTypeId: policyType.id,
        policyNumber: `POL-TEST-7D-${String(Date.now()).slice(-4)}`,
        vehicleNumber: 'KA-01-ME-1234',
        endDate: policy7dDate,
        premiumPrice: 15000,
        renewalStatus: 'PENDING',
      },
    });

    // Create a policy expiring in 1 day (matching offset 1)
    const policy1dDate = new Date(today);
    policy1dDate.setDate(today.getDate() + 1);

    const policy1d = await db.policy.create({
      data: {
        agentId: id,
        clientId: client.id,
        policyTypeId: policyType.id,
        policyNumber: `POL-TEST-1D-${String(Date.now()).slice(-4)}`,
        vehicleNumber: 'KA-01-ME-5678',
        endDate: policy1dDate,
        premiumPrice: 25000,
        renewalStatus: 'PENDING',
      },
    });

    // Create a policy expiring today (matching offset 0)
    const policy0dDate = new Date(today);
    const policy0d = await db.policy.create({
      data: {
        agentId: id,
        clientId: client.id,
        policyTypeId: policyType.id,
        policyNumber: `POL-TEST-0D-${String(Date.now()).slice(-4)}`,
        vehicleNumber: 'KA-01-ME-9999',
        endDate: policy0dDate,
        premiumPrice: 35000,
        renewalStatus: 'PENDING',
      },
    });

    // Create an enquiry scheduled for follow-up today
    const enquiry = await db.enquiry.create({
      data: {
        agentId: id,
        name: 'Test Enquirer',
        mobileNumber: `9999${String(Date.now()).slice(-6)}`,
        policyTypeId: policyType.id,
        remindOn: new Date(),
        status: 'OPEN',
      },
    });

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      message: 'Test data created successfully.',
      data: {
        client,
        policies: [policy7d.id, policy1d.id, policy0d.id],
        enquiry: enquiry.id,
      },
    });
  });

  await Promise.resolve();
};

export default notificationRoutes;
