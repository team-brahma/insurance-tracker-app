import type { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { getDb } from '@database/index.js';
import { authService } from '@services/AuthService.js';
import { userRepository } from '@repositories/UserRepository.js';
import { ValidationError, NotFoundError, ForbiddenError } from '@errors/AppError.js';
import { HTTP_STATUS, AUTH } from '@repo/constants';
import { createUserSchema, updateUserSchema } from '@validators/index.js';

export const userController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { role } = assertAuthenticated(request);
    if (role !== 'ADMIN') throw new ForbiddenError('Admin access required');

    const query = request.query as {
      search?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)));
    const search = query.search?.trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const db = getDb();
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isOutsourcedEnabled: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const formatted = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
      },
    });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { role } = assertAuthenticated(request);
    if (role !== 'ADMIN') throw new ForbiddenError('Admin access required');

    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );

    const { email, password, name, role: newRole, isOutsourcedEnabled } = parsed.data;

    const result = await authService.register({
      email,
      password,
      name,
      role: newRole ?? 'AGENT',
      isOutsourcedEnabled: isOutsourcedEnabled ?? false,
    });

    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: result.user });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { role } = assertAuthenticated(request);
    if (role !== 'ADMIN') throw new ForbiddenError('Admin access required');

    const { id } = request.params as { id: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );

    const db = getDb();
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User', id);

    const updateData: {
      email?: string;
      password?: string;
      name?: string;
      role?: 'ADMIN' | 'AGENT';
      isOutsourcedEnabled?: boolean;
    } = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.isOutsourcedEnabled !== undefined)
      updateData.isOutsourcedEnabled = parsed.data.isOutsourcedEnabled;
    if (parsed.data.password !== undefined) {
      updateData.password = await bcrypt.hash(parsed.data.password, AUTH.BCRYPT_SALT_ROUNDS);
    }

    const updated = await userRepository.update(id, updateData);

    return reply.code(HTTP_STATUS.OK).send({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isOutsourcedEnabled: updated.isOutsourcedEnabled,
        createdAt: updated.createdAt.toISOString(),
      },
    });
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
