import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@services/HttpClient.js';
import type { ApiResponse } from '@repo/types';
import type { NotificationCountData } from '../types/index.js';
import { notificationKeys } from './useNotificationsQuery.js';

export function useNotificationCountQuery() {
  return useQuery({
    queryKey: notificationKeys.count,
    queryFn: async () => {
      const res = await httpClient.get<ApiResponse<NotificationCountData>>(
        '/api/v1/notifications/count',
      );
      return res.data.data.totalCount;
    },
    staleTime: 2 * 60 * 1000,
  });
}
