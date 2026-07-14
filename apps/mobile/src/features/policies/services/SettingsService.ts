import { httpClient } from '@services/HttpClient';
import type { Settings, ApiResponse } from '@repo/types';

export const settingsService = {
  async get(): Promise<ApiResponse<Settings>> {
    const { data } = await httpClient.get<ApiResponse<Settings>>('/api/v1/settings');
    return data;
  },

  async update(settings: Partial<Settings>): Promise<ApiResponse<Settings>> {
    const { data } = await httpClient.put<ApiResponse<Settings>>('/api/v1/settings', settings);
    return data;
  },
};
