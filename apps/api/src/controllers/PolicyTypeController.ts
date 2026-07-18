import type { FastifyRequest, FastifyReply } from 'fastify';
import { policyTypeService } from '@services/PolicyTypeService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { sanitizePolicyType } from '@utils/sanitize.js';
import { createPolicyTypeSchema, updatePolicyTypeSchema } from '@validators/index.js';

export const policyTypeController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const query = request.query as Record<string, string | undefined>;
    const result = await policyTypeService.list(
      query.search,
      query.page ? parseInt(query.page, 10) : undefined,
      query.limit ? parseInt(query.limit, 10) : undefined,
    );
    for (const pt of result.data) sanitizePolicyType(pt as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, ...result });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const policyType = await policyTypeService.getById(id);
    sanitizePolicyType(policyType as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: policyType });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const parsed = createPolicyTypeSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    }
    const policyType = await policyTypeService.create(parsed.data);
    sanitizePolicyType(policyType as Record<string, unknown>);
    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: policyType });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updatePolicyTypeSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    }
    const policyType = await policyTypeService.update(id, parsed.data);
    sanitizePolicyType(policyType as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: policyType });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    assertAuthenticated(request);
    const { id } = request.params as { id: string };
    await policyTypeService.delete(id);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  },
};
