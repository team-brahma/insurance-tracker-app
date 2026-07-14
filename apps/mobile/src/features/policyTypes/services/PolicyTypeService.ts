import { httpClient } from '@services/HttpClient.js';
import type { PolicyTypeMaster, ApiResponse, PaginatedResponse } from '@repo/types';

export const policyTypeService = {
  async list(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PolicyTypeMaster>> {
    const { data } = await httpClient.get<PaginatedResponse<PolicyTypeMaster>>(
      '/api/v1/policy-types',
      {
        params,
      },
    );
    return data;
  },

  async create(data: { name: string }): Promise<ApiResponse<PolicyTypeMaster>> {
    const response = await httpClient.post<ApiResponse<PolicyTypeMaster>>(
      '/api/v1/policy-types',
      data,
    );
    return response.data;
  },

  async update(
    id: string,
    data: Partial<{ name: string }>,
  ): Promise<ApiResponse<PolicyTypeMaster>> {
    const response = await httpClient.put<ApiResponse<PolicyTypeMaster>>(
      `/api/v1/policy-types/${id}`,
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/policy-types/${id}`);
  },
};
