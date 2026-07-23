import type { FastifyRequest, FastifyReply } from 'fastify';
import { insuranceProviderService } from '@services/InsuranceProviderService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { sanitizeInsuranceProvider } from '@utils/sanitize.js';
import { createInsuranceProviderSchema, updateInsuranceProviderSchema } from '@validators/index.js';

export const insuranceProviderController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const query = request.query as Record<string, string | undefined>;
    const result = await insuranceProviderService.list(
      query.search,
      query.page ? parseInt(query.page, 10) : undefined,
      query.limit ? parseInt(query.limit, 10) : undefined,
    );
    for (const item of result.data) sanitizeInsuranceProvider(item as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, ...result });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const provider = await insuranceProviderService.getById(id);
    sanitizeInsuranceProvider(provider as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: provider });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const parsed = createInsuranceProviderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    }
    const provider = await insuranceProviderService.create(parsed.data);
    sanitizeInsuranceProvider(provider as Record<string, unknown>);
    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: provider });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updateInsuranceProviderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    }
    const provider = await insuranceProviderService.update(id, parsed.data);
    sanitizeInsuranceProvider(provider as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: provider });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { id } = request.params as { id: string };
    await insuranceProviderService.delete(id);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  },
};
