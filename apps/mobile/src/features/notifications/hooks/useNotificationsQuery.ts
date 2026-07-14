import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@services/HttpClient.js';
import type { ApiResponse } from '@repo/types';
import type { NotificationsData } from '../types/index.js';

export const notificationKeys = {
  all: ['notifications'] as const,
  upcoming: ['notifications', 'upcoming'] as const,
  count: ['notifications', 'count'] as const,
};

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.upcoming,
    queryFn: async () => {
      const res = await httpClient.get<ApiResponse<NotificationsData>>('/api/v1/notifications');
      return res.data.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
