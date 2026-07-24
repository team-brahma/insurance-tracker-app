import type { FastifyRequest, FastifyReply } from 'fastify';
import { associateAgentService } from '@services/AssociateAgentService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { HTTP_STATUS } from '@repo/constants';

export const associateAgentController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(req);
    const { search } = req.query as { search?: string };
    const agents = await associateAgentService.list(agentId, search);
    return reply.status(HTTP_STATUS.OK).send({ success: true, data: agents });
  },

  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(req);
    const { id } = req.params as { id: string };
    const agent = await associateAgentService.getById(agentId, id);
    return reply.status(HTTP_STATUS.OK).send({ success: true, data: agent });
  },

  async create(req: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(req);
    const body = req.body as {
      name: string;
      mobileNumber: string;
      agencyName?: string;
      notes?: string;
    };
    const agent = await associateAgentService.create(agentId, body);
    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: agent });
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(req);
    const { id } = req.params as { id: string };
    const body = req.body as {
      name?: string;
      mobileNumber?: string;
      agencyName?: string;
      notes?: string;
    };
    const agent = await associateAgentService.update(agentId, id, body);
    return reply.status(HTTP_STATUS.OK).send({ success: true, data: agent });
  },

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(req);
    const { id } = req.params as { id: string };
    await associateAgentService.delete(agentId, id);
    return reply.status(HTTP_STATUS.OK).send({ success: true, message: 'Associate agent deleted successfully' });
  },
};
