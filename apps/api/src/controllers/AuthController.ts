import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '@services/AuthService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { loginSchema, refreshSchema } from '@validators/index.js';

export const authController = {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const { email, password, fcmToken } = parsed.data;
    const result = await authService.login(email, password, fcmToken ?? null);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: result });
  },

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const { refreshToken } = parsed.data;
    const result = await authService.refresh(refreshToken);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: result });
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const { refreshToken } = parsed.data;
    await authService.logout(refreshToken);
    return reply.code(HTTP_STATUS.OK).send({ success: true, message: 'Logged out' });
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    const { id } = assertAuthenticated(request);
    const user = await authService.me(id);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: user });
  },
};
