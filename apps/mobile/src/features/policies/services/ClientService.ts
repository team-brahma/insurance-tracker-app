import { httpClient } from '@services/HttpClient';
import type { Client, PaginatedResponse, ApiResponse } from '@repo/types';

export const clientService = {
  async list(
    search?: string,
    page = 1,
    limit = 20,
    exactMobile?: string,
    exactName?: string,
    isOutsourced?: boolean,
    associateAgentId?: string,
  ): Promise<PaginatedResponse<Client>> {
    const { data } = await httpClient.get<PaginatedResponse<Client>>('/api/v1/clients', {
      params: { search, page, limit, exactMobile, exactName, isOutsourced, associateAgentId },
    });
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Client>> {
    const { data } = await httpClient.get<ApiResponse<Client>>(`/api/v1/clients/${id}`);
    return data;
  },
};
