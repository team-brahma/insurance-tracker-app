import type { FastifyRequest, FastifyReply } from 'fastify';
import { settingsService } from '@services/SettingsService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { HTTP_STATUS } from '@repo/constants';

export const settingsController = {
  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const settings = await settingsService.get(agentId);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: settings });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const body = request.body as {
      reminderOffsets?: number[];
      appLockEnabled?: boolean;
      defaultCountryCode?: string;
      theme?: string;
      reminderTime?: string;
    };
    const settings = await settingsService.update(agentId, body);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: settings });
  },
};
