import { httpClient } from '@services/HttpClient';
import type { Client, PaginatedResponse, ApiResponse } from '@repo/types';
import type { ClientListParams, ClientFormData } from '../types/index.js';

export const clientService = {
  async list(params?: ClientListParams): Promise<PaginatedResponse<Client>> {
    const { data } = await httpClient.get<PaginatedResponse<Client>>('/api/v1/clients', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Client>> {
    const { data } = await httpClient.get<ApiResponse<Client>>(`/api/v1/clients/${id}`);
    return data;
  },

  async create(client: ClientFormData): Promise<ApiResponse<Client>> {
    const { data } = await httpClient.post<ApiResponse<Client>>('/api/v1/clients', client);
    return data;
  },

  async update(id: string, client: Partial<ClientFormData>): Promise<ApiResponse<Client>> {
    const { data } = await httpClient.put<ApiResponse<Client>>(`/api/v1/clients/${id}`, client);
    return data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/clients/${id}`);
  },
};
