import { httpClient } from '@services/HttpClient';
import type {
  PolicyWithClient,
  PaginatedResponse,
  ApiResponse,
  PolicyStats,
  PolicyStatusHistory,
} from '@repo/types';
import type { PolicyListParams, PolicyFormData } from '../types/index.js';

export const policyService = {
  async list(params?: PolicyListParams): Promise<PaginatedResponse<PolicyWithClient>> {
    const { data } = await httpClient.get<PaginatedResponse<PolicyWithClient>>('/api/v1/policies', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<ApiResponse<PolicyWithClient>> {
    const { data } = await httpClient.get<ApiResponse<PolicyWithClient>>(`/api/v1/policies/${id}`);
    return data;
  },

  async create(policy: PolicyFormData): Promise<ApiResponse<PolicyWithClient>> {
    const { data } = await httpClient.post<ApiResponse<PolicyWithClient>>(
      '/api/v1/policies',
      policy,
    );
    return data;
  },

  async update(
    id: string,
    policy: Partial<PolicyFormData>,
  ): Promise<ApiResponse<PolicyWithClient>> {
    const { data } = await httpClient.put<ApiResponse<PolicyWithClient>>(
      `/api/v1/policies/${id}`,
      policy,
    );
    return data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/policies/${id}`);
  },

  async updateStatus(id: string, status: string): Promise<ApiResponse<PolicyWithClient>> {
    const { data } = await httpClient.patch<ApiResponse<PolicyWithClient>>(
      `/api/v1/policies/${id}/status`,
      { status },
    );
    return data;
  },

  async getStats(): Promise<ApiResponse<PolicyStats>> {
    const { data } = await httpClient.get<ApiResponse<PolicyStats>>('/api/v1/stats');
    return data;
  },

  async getStatusHistory(id: string): Promise<ApiResponse<PolicyStatusHistory[]>> {
    const { data } = await httpClient.get<ApiResponse<PolicyStatusHistory[]>>(
      `/api/v1/policies/${id}/status-history`,
    );
    return data;
  },

  async getRenewalNoticePdf(id: string): Promise<Blob> {
    const { data } = await httpClient.get<Blob>(`/api/v1/policies/${id}/renewal-notice`, {
      responseType: 'blob',
    });
    return data;
  },

  async uploadDocuments(
    policyId: string,
    documents: { year: number; fileName: string; fileData: string; fileSize?: number; mimeType?: string }[],
    year?: number,
  ): Promise<ApiResponse<import('@repo/types').PolicyDocument[]>> {
    const { data } = await httpClient.post<ApiResponse<import('@repo/types').PolicyDocument[]>>(
      `/api/v1/policies/${policyId}/documents`,
      { year, documents },
    );
    return data;
  },

  async getDocuments(
    policyId: string,
    params?: { search?: string; page?: number; limit?: number },
  ): Promise<PaginatedResponse<import('@repo/types').PolicyDocument>> {
    const { data } = await httpClient.get<PaginatedResponse<import('@repo/types').PolicyDocument>>(
      `/api/v1/policies/${policyId}/documents`,
      { params },
    );
    return data;
  },

  async deleteDocument(policyId: string, docId: string): Promise<void> {
    await httpClient.delete(`/api/v1/policies/${policyId}/documents/${docId}`);
  },
};
