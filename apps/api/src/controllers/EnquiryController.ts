import type { FastifyRequest, FastifyReply } from 'fastify';
import { enquiryService } from '@services/EnquiryService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { normaliseMobile } from '@repo/utils';
import {
  createEnquirySchema,
  updateEnquirySchema,
  updateEnquiryStatusSchema,
} from '@validators/index.js';

export const enquiryController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const query = request.query as Record<string, string | undefined>;
    const params: Record<string, unknown> = {};
    if (query.search) params.search = query.search;
    if (query.policyType) params.policyType = query.policyType;
    if (query.status) params.status = query.status;
    if (query.page) params.page = parseInt(query.page, 10);
    if (query.limit) params.limit = parseInt(query.limit, 10);
    const result = await enquiryService.list(agentId, params);
    return reply.code(HTTP_STATUS.OK).send({ success: true, ...result });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const enquiry = await enquiryService.getById(agentId, id);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: enquiry });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const parsed = createEnquirySchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const data = parsed.data;
    data.mobileNumber = normaliseMobile(data.mobileNumber) ?? data.mobileNumber;
    const enquiry = await enquiryService.create(
      agentId,
      data as Parameters<typeof enquiryService.create>[1],
    );
    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: enquiry });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updateEnquirySchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const body = parsed.data;
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.mobileNumber !== undefined) data.mobileNumber = normaliseMobile(body.mobileNumber);
    if (body.policyType !== undefined) data.policyType = body.policyType;
    if (body.referredBy !== undefined) data.referredBy = body.referredBy;
    if (body.remindOn !== undefined) data.remindOn = body.remindOn;
    if (body.status !== undefined) data.status = body.status;
    const enquiry = await enquiryService.update(agentId, id, data);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: enquiry });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    await enquiryService.delete(agentId, id);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updateEnquiryStatusSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const { status, dropReason, dropNote } = parsed.data;
    const enquiry = await enquiryService.updateStatus(
      agentId,
      id,
      status,
      (dropReason ?? undefined) as Parameters<typeof enquiryService.updateStatus>[3],
      dropNote ?? undefined,
    );
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: enquiry });
  },

  async getStatusHistory(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const history = await enquiryService.getStatusHistory(agentId, id);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: history });
  },
};
