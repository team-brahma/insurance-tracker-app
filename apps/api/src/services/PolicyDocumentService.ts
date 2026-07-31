import { policyDocumentRepository, type CreateDocumentInput } from '@repositories/PolicyDocumentRepository.js';
import { policyRepository } from '@repositories/PolicyRepository.js';
import { NotFoundError, ValidationError } from '@errors/AppError.js';
import { appConfig } from '@config/index.js';

export const policyDocumentService = {
  async uploadDocuments(
    agentId: string,
    policyId: string,
    documents: CreateDocumentInput[],
  ) {
    const policy = await policyRepository.findById(agentId, policyId);
    if (!policy) {
      throw new NotFoundError('Policy', policyId);
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      throw new ValidationError('At least one document is required for upload');
    }

    for (const doc of documents) {
      if (!doc.fileName || !doc.fileData) {
        throw new ValidationError('Document file name and base64 file data are required');
      }
      if (!doc.year || isNaN(doc.year) || doc.year < 1990 || doc.year > 2100) {
        throw new ValidationError(`Valid policy year is required for file "${doc.fileName}"`);
      }
    }

    const createdDocs = await policyDocumentRepository.createMany(policyId, documents);

    return createdDocs.map((doc) => ({
      ...doc,
      downloadUrl: `${appConfig.baseUrl}/api/v1/policies/${doc.policyId}/documents/${doc.id}/file`,
    }));
  },

  async listDocuments(
    agentId: string,
    policyId: string,
    params?: { search?: string; page?: number; limit?: number },
  ) {
    const policy = await policyRepository.findById(agentId, policyId);
    if (!policy) {
      throw new NotFoundError('Policy', policyId);
    }

    const result = await policyDocumentRepository.findByPolicyId(policyId, params);

    return {
      data: result.data.map((doc) => ({
        ...doc,
        downloadUrl: `${appConfig.baseUrl}/api/v1/policies/${doc.policyId}/documents/${doc.id}/file`,
      })),
      meta: result.meta,
    };
  },

  async getDocumentFile(docId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const doc = await policyDocumentRepository.findById(docId);
    if (!doc) {
      throw new NotFoundError('Policy document', docId);
    }

    const base64Data = doc.fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return {
      buffer,
      fileName: doc.fileName,
      mimeType: doc.mimeType || 'application/pdf',
    };
  },

  async deleteDocument(agentId: string, policyId: string, docId: string) {
    const policy = await policyRepository.findById(agentId, policyId);
    if (!policy) {
      throw new NotFoundError('Policy', policyId);
    }

    const doc = await policyDocumentRepository.findById(docId);
    if (!doc || doc.policyId !== policyId) {
      throw new NotFoundError('Policy document', docId);
    }

    await policyDocumentRepository.deleteById(docId);
  },
};
