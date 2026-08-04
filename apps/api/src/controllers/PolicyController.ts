import type { FastifyRequest, FastifyReply } from 'fastify';
import { policyService } from '@services/PolicyService.js';
import { assertAuthenticated } from '@middlewares/Auth.js';
import { getDb } from '@database/index.js';
import { ValidationError } from '@errors/AppError.js';
import { HTTP_STATUS } from '@repo/constants';
import { normaliseMobile } from '@repo/utils';
import { appConfig } from '@config/index.js';
import { sanitizePolicy, sanitizeUser } from '@utils/sanitize.js';
import {
  createPolicySchema,
  updatePolicySchema,
  updatePolicyStatusSchema,
} from '@validators/index.js';

function applyRenewalNoticeUrl(policy: Record<string, unknown>): void {
  if (policy.renewalNotice) {
    policy.renewalNoticeUrl = `${appConfig.baseUrl}/api/v1/policies/${policy.id as string}/renewal-notice`;
  } else {
    policy.renewalNoticeUrl = null;
  }
}

export const policyController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const query = request.query as Record<string, string | undefined>;
    const params: Record<string, unknown> = {};
    if (query.search) params.search = query.search;
    const policyTypeFilter = query.policy_type ?? query.policyType;
    if (policyTypeFilter) params.policyType = policyTypeFilter.split(',');
    const renewalStatusFilter = query.renewal_status ?? query.renewalStatus;
    if (renewalStatusFilter) params.renewalStatus = renewalStatusFilter.split(',');
    if (query.urgency) params.urgency = query.urgency;
    if (query.month) params.month = query.month;
    const isOutsourcedRaw = query.is_outsourced ?? query.isOutsourced;
    if (isOutsourcedRaw !== undefined) {
      params.isOutsourced = isOutsourcedRaw === 'true' || isOutsourcedRaw === '1';
    }
    const associateAgentIdVal = query.associate_agent_id ?? query.associateAgentId;
    if (associateAgentIdVal) {
      params.associateAgentId = associateAgentIdVal;
    }
    if (query.page) params.page = parseInt(query.page, 10);
    if (query.limit) params.limit = parseInt(query.limit, 10);
    const result = await policyService.list(agentId, params);
    for (const p of result.data) {
      applyRenewalNoticeUrl(p);
      sanitizePolicy(p);
    }
    return reply.code(HTTP_STATUS.OK).send({ success: true, ...result });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const policy = (await policyService.getById(agentId, id)) as Record<string, unknown>;
    applyRenewalNoticeUrl(policy);
    sanitizePolicy(policy);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: policy });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const parsed = createPolicySchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const body = parsed.data;
    const data: Record<string, unknown> = {
      insuredName: body.insuredName,
      endDate: body.endDate,
      policyType: body.policyType,
    };
    if (body.mobileNumber != null) data.mobileNumber = normaliseMobile(body.mobileNumber);
    if (body.referenceNote != null) data.referenceNote = body.referenceNote;
    if (body.vehicleNumber != null) data.vehicleNumber = body.vehicleNumber;
    if (body.policyNumber != null) data.policyNumber = body.policyNumber;
    if (body.typeNote != null) data.typeNote = body.typeNote;
    if (body.renewalStatus != null) data.renewalStatus = body.renewalStatus;
    if (body.premiumPrice != null) data.premiumPrice = body.premiumPrice;
    if (body.paymentLink != null) data.paymentLink = body.paymentLink;
    if (body.renewalNotice != null) data.renewalNotice = body.renewalNotice;
    if (body.additionalNotice != null) data.additionalNotice = body.additionalNotice;
    if (body.insuredPersonName !== undefined) data.insuredPersonName = body.insuredPersonName ?? null;
    if (body.insuranceProviderId !== undefined) data.insuranceProviderId = body.insuranceProviderId ?? null;
    if (body.isClaimed != null) data.isClaimed = body.isClaimed;
    if (body.claimDate != null) data.claimDate = body.claimDate;
    if (body.claimAmount != null) data.claimAmount = body.claimAmount;
    if (body.enquiryId != null) data.enquiryId = body.enquiryId;
    const db = getDb();
    const user = await db.user.findUnique({
      where: { id: agentId },
      select: { isOutsourcedEnabled: true },
    });

    if (user?.isOutsourcedEnabled) {
      if (body.isOutsourced !== undefined) data.isOutsourced = body.isOutsourced;
      if (body.associateAgentId !== undefined) data.associateAgentId = body.associateAgentId;
    } else {
      data.isOutsourced = false;
      data.associateAgentId = null;
    }

    const policy = (await policyService.create(
      agentId,
      data as Parameters<typeof policyService.create>[1],
    )) as Record<string, unknown>;
    applyRenewalNoticeUrl(policy);
    sanitizePolicy(policy);
    return reply.code(HTTP_STATUS.CREATED).send({ success: true, data: policy });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updatePolicySchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const body = parsed.data;
    const db = getDb();
    const user = await db.user.findUnique({
      where: { id: agentId },
      select: { isOutsourcedEnabled: true },
    });

    const data: Record<string, unknown> = {};
    if (body.clientId != null) data.clientId = body.clientId;
    if (body.insuredName != null) data.insuredName = body.insuredName;
    if (body.mobileNumber != null) data.mobileNumber = normaliseMobile(body.mobileNumber);
    if (body.referenceNote != null) data.referenceNote = body.referenceNote;
    if (body.policyType != null) data.policyType = body.policyType;
    if (body.insuranceProviderId !== undefined) data.insuranceProviderId = body.insuranceProviderId ?? null;
    if (body.vehicleNumber != null) data.vehicleNumber = body.vehicleNumber;
    if (body.policyNumber != null) data.policyNumber = body.policyNumber;
    if (body.typeNote != null) data.typeNote = body.typeNote;
    if (body.endDate != null) data.endDate = body.endDate;
    if (body.renewalStatus != null) data.renewalStatus = body.renewalStatus;
    if (body.premiumPrice != null) data.premiumPrice = body.premiumPrice;
    if (body.paymentLink != null) data.paymentLink = body.paymentLink;
    if (body.renewalNotice != null) data.renewalNotice = body.renewalNotice;
    if (body.additionalNotice != null) data.additionalNotice = body.additionalNotice;
    if (body.insuredPersonName !== undefined) data.insuredPersonName = body.insuredPersonName ?? null;
    if (body.isClaimed != null) data.isClaimed = body.isClaimed;
    if (body.claimDate != null) data.claimDate = body.claimDate;
    if (body.claimAmount != null) data.claimAmount = body.claimAmount;
    if (user?.isOutsourcedEnabled) {
      if (body.isOutsourced !== undefined) data.isOutsourced = body.isOutsourced;
      if (body.associateAgentId !== undefined) data.associateAgentId = body.associateAgentId;
    } else {
      data.isOutsourced = false;
      data.associateAgentId = null;
    }
    const policy = (await policyService.update(agentId, id, data)) as Record<string, unknown>;
    applyRenewalNoticeUrl(policy);
    sanitizePolicy(policy);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: policy });
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    await policyService.delete(agentId, id);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const parsed = updatePolicyStatusSchema.safeParse(request.body);
    if (!parsed.success)
      throw new ValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; '),
      );
    const { status } = parsed.data;
    const policy = (await policyService.updateStatus(agentId, id, status as never)) as Record<
      string,
      unknown
    >;
    applyRenewalNoticeUrl(policy);
    sanitizePolicy(policy);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: policy });
  },

  async getStatusHistory(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const { id } = request.params as { id: string };
    const history = await policyService.getStatusHistory(agentId, id);
    for (const h of history) {
      sanitizeUser(h.changedBy as Record<string, unknown>);
    }
    return reply.code(HTTP_STATUS.OK).send({ success: true, data: history });
  },

  async getRenewalNoticePdf(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const pdfBuffer = await policyService.getRenewalNoticePdf(id);
    return reply
      .code(HTTP_STATUS.OK)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="renewal-notice-${id}.pdf"`)
      .send(pdfBuffer);
  },

  async stats(request: FastifyRequest, reply: FastifyReply) {
    const { id: agentId } = assertAuthenticated(request);
    const data = await policyService.getStats(agentId);
    return reply.code(HTTP_STATUS.OK).send({ success: true, data });
  },
};
