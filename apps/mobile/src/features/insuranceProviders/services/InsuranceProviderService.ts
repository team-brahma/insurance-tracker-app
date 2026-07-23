import { httpClient } from '@services/HttpClient.js';
import type { InsuranceProviderMaster, ApiResponse, PaginatedResponse } from '@repo/types';

export const insuranceProviderService = {
  async list(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<InsuranceProviderMaster>> {
    const { data } = await httpClient.get<PaginatedResponse<InsuranceProviderMaster>>(
      '/api/v1/insurance-providers',
      {
        params,
      },
    );
    return data;
  },

  async create(data: { name: string }): Promise<ApiResponse<InsuranceProviderMaster>> {
    const response = await httpClient.post<ApiResponse<InsuranceProviderMaster>>(
      '/api/v1/insurance-providers',
      data,
    );
    return response.data;
  },

  async update(
    id: string,
    data: Partial<{ name: string }>,
  ): Promise<ApiResponse<InsuranceProviderMaster>> {
    const response = await httpClient.put<ApiResponse<InsuranceProviderMaster>>(
      `/api/v1/insurance-providers/${id}`,
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/insurance-providers/${id}`);
  },
};
