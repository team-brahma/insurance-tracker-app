import { httpClient } from '@services/HttpClient.js';
import type { Enquiry, PaginatedResponse, ApiResponse, EnquiryStatusHistory } from '@repo/types';
import type { EnquiryListParams, EnquiryFormData } from '../types/index.js';

export const enquiryService = {
  async list(params?: EnquiryListParams): Promise<PaginatedResponse<Enquiry>> {
    const { data } = await httpClient.get<PaginatedResponse<Enquiry>>('/api/v1/enquiries', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Enquiry>> {
    const { data } = await httpClient.get<ApiResponse<Enquiry>>(`/api/v1/enquiries/${id}`);
    return data;
  },

  async create(enquiry: EnquiryFormData): Promise<ApiResponse<Enquiry>> {
    const { data } = await httpClient.post<ApiResponse<Enquiry>>('/api/v1/enquiries', enquiry);
    return data;
  },

  async update(id: string, enquiry: Partial<EnquiryFormData>): Promise<ApiResponse<Enquiry>> {
    const { data } = await httpClient.put<ApiResponse<Enquiry>>(`/api/v1/enquiries/${id}`, enquiry);
    return data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/enquiries/${id}`);
  },

  async updateStatus(
    id: string,
    status: string,
    dropReason?: string,
    dropNote?: string,
  ): Promise<ApiResponse<Enquiry>> {
    const { data } = await httpClient.patch<ApiResponse<Enquiry>>(
      `/api/v1/enquiries/${id}/status`,
      { status, dropReason, dropNote },
    );
    return data;
  },

  async getStatusHistory(id: string): Promise<ApiResponse<EnquiryStatusHistory[]>> {
    const { data } = await httpClient.get<ApiResponse<EnquiryStatusHistory[]>>(
      `/api/v1/enquiries/${id}/status-history`,
    );
    return data;
  },
};
