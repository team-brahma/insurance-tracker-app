import { httpClient } from '@services/HttpClient';
import type { BulkImportResponse, RowProcessStatus } from '../types/index.js';

export const bulkImportService = {
  async downloadTemplate(): Promise<Blob> {
    const { data } = await httpClient.get<Blob>('/api/v1/bulk/template', {
      responseType: 'blob',
    });
    return data;
  },

  async uploadFile(file: File): Promise<BulkImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await httpClient.post<BulkImportResponse>('/api/v1/bulk/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },

  async exportReport(rowStatuses: RowProcessStatus[]): Promise<Blob> {
    const { data } = await httpClient.post<Blob>(
      '/api/v1/bulk/export-report',
      { rowStatuses },
      {
        responseType: 'blob',
      },
    );
    return data;
  },
};
