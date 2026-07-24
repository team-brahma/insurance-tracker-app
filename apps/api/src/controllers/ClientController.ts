import type { FastifyRequest, FastifyReply } from 'fastify';
import { clientService } from '@services/ClientService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { normaliseMobile } from '@repo/utils';
import { sanitizeClient } from '@utils/sanitize.js';
import { createClientSchema, updateClientSchema } from '@validators/index.js';

export const clientController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const parsed = createClientSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const body = parsed.data;
    const createData: {
      insuredName: string;
      mobileNumber: string;
      isOutsourced?: boolean;
      associateAgentId?: string | null;
    } = {
      insuredName: body.insuredName,
      mobileNumber: normaliseMobile(body.mobileNumber)!,
    };
    if (body.isOutsourced !== undefined) createData.isOutsourced = body.isOutsourced;
    if (body.associateAgentId !== undefined) createData.associateAgentId = body.associateAgentId;

    const client = await clientService.create(agentId, createData);
    sanitizeClient(client as Record<string, unknown>);
    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: client });
  },

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const query = request.query as Record<string, string | undefined>;
    const exactMobile = query.exact_mobile ?? query.exactMobile;
    const exactName = query.exact_name ?? query.exactName;
    const isOutsourcedRaw = query.is_outsourced ?? query.isOutsourced;
    const isOutsourced =
      isOutsourcedRaw !== undefined
        ? isOutsourcedRaw === 'true' || isOutsourcedRaw === '1'
        : undefined;
    const associateAgentId = query.associate_agent_id ?? query.associateAgentId;
    const result = await clientService.list(
      agentId,
      query.search,
      query.page ? parseInt(query.page, 10) : undefined,
      query.limit ? parseInt(query.limit, 10) : undefined,
      exactMobile,
      exactName,
      isOutsourced,
      associateAgentId,
    );
    for (const c of result.data) sanitizeClient(c as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, ...result });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const client = await clientService.getById(agentId, id);
    sanitizeClient(client as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: client });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updateClientSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const body = parsed.data;
    const data: Record<string, unknown> = {};
    if (body.insuredName !== undefined) data.insuredName = body.insuredName;
    if (body.mobileNumber !== undefined) data.mobileNumber = normaliseMobile(body.mobileNumber);
    if (body.isOutsourced !== undefined) data.isOutsourced = body.isOutsourced;
    if (body.associateAgentId !== undefined) data.associateAgentId = body.associateAgentId;
    const client = await clientService.update(agentId, id, data);
    sanitizeClient(client as Record<string, unknown>);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: client });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    await clientService.delete(agentId, id);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  },
};
