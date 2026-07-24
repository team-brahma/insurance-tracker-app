import { httpClient } from '@services/HttpClient.js';
import type {
  AssociateAgent,
  CreateAssociateAgentDto,
  UpdateAssociateAgentDto,
  ApiResponse,
} from '@repo/types';

export const associateAgentService = {
  async list(params?: { search?: string }): Promise<ApiResponse<AssociateAgent[]>> {
    const { data } = await httpClient.get<ApiResponse<AssociateAgent[]>>('/api/v1/associate-agents', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<ApiResponse<AssociateAgent>> {
    const { data } = await httpClient.get<ApiResponse<AssociateAgent>>(`/api/v1/associate-agents/${id}`);
    return data;
  },

  async create(data: CreateAssociateAgentDto): Promise<ApiResponse<AssociateAgent>> {
    const response = await httpClient.post<ApiResponse<AssociateAgent>>('/api/v1/associate-agents', data);
    return response.data;
  },

  async update(id: string, data: UpdateAssociateAgentDto): Promise<ApiResponse<AssociateAgent>> {
    const response = await httpClient.put<ApiResponse<AssociateAgent>>(
      `/api/v1/associate-agents/${id}`,
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await httpClient.delete<ApiResponse<{ message: string }>>(
      `/api/v1/associate-agents/${id}`,
    );
    return response.data;
  },
};
