import { httpClient } from '@services/HttpClient';
import type { BulkImportResponse, RowProcessStatus } from '../types/index.js';

export const bulkImportService = {
  async downloadTemplate(): Promise<Blob> {
    const { data } = await httpClient.get<Blob>('/api/v1/bulk/template', {
      responseType: 'blob',
    });
    return data;
  },

  /** Dry-run: validates the file and returns row-level results without writing to the DB. */
  async previewFile(file: File): Promise<BulkImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await httpClient.post<BulkImportResponse>('/api/v1/bulk/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },

  /** Real import: validates and commits all rows to the DB. */
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
      { responseType: 'blob' },
    );
    return data;
  },
};
