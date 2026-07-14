import type { FastifyRequest, FastifyReply } from 'fastify';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { getDb } from '@database/index.js';
import { authService } from '@services/AuthService.js';
import { ValidationError, NotFoundError, ForbiddenError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { createUserSchema } from '@validators/index.js';

export const userController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { role } = assertAuthenticated(request);
    if (role !== 'ADMIN') throw new ForbiddenError('Admin access required');

    const db = getDb();
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));

    return reply.code(HTTP_STATUS.OK).send({ success: true, data: formatted });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { role } = assertAuthenticated(request);
    if (role !== 'ADMIN') throw new ForbiddenError('Admin access required');

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );

    const { email, password, name, role: newRole } = parsed.data;

    const result = await authService.register({
      email,
      password,
      name,
      role: newRole ?? 'AGENT',
    });

    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: result.user });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id: currentUserId, role } = assertAuthenticated(request);
    if (role !== 'ADMIN') throw new ForbiddenError('Admin access required');

    const { id } = request.params as { id: string };

    if (id === currentUserId) {
      throw new ValidationError('Cannot delete yourself');
    }

    const db = getDb();
    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new NotFoundError('User', id);
    }

    const clientsCount = await db.client.count({ where: { agentId: id } });
    const policiesCount = await db.policy.count({ where: { agentId: id } });
    const enquiriesCount = await db.enquiry.count({ where: { agentId: id } });
    const policyStatusCount = await db.policyStatusHistory.count({ where: { changedById: id } });
    const enquiryStatusCount = await db.enquiryStatusHistory.count({ where: { changedById: id } });

    if (
      clientsCount > 0 ||
      policiesCount > 0 ||
      enquiriesCount > 0 ||
      policyStatusCount > 0 ||
      enquiryStatusCount > 0
    ) {
      throw new ValidationError(
        'Cannot delete user who has active clients, policies, enquiries, or status history records',
      );
    }

    await db.settings.deleteMany({ where: { agentId: id } });
    await db.refreshToken.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });

    return reply.code(HTTP_STATUS.OK).send({ success: true, message: 'User deleted successfully' });
  },
};
